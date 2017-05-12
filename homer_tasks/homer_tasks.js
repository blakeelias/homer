Cards = new Mongo.Collection("cards");
Categories = new Mongo.Collection("categories");
// Tags = new Mongo.Collection("tags");

if (Meteor.isClient) {

  Meteor.subscribe("cards");
  Meteor.subscribe("categories");
  // Meteor.subscribe("tags");

  Session.set("learning", false);
  Session.set("categoryToReview", null);
  updateProgressBar(0, 0);
  Session.set("categoryToBrowse", null);
  Session.set("isEditing", false);
  Session.set("import", false);

  Template.body.greeting = function () {
    return "";
  };

  Template.body.selected_card = function () {
    return Cards.findOne(Session.get("selectedCard"));
  };

  Template.body.events({
    'click input.import' : function () {
      // template data, if any, is available in 'this'
      Session.set("import", true);
    },
    'click button.reviewAll': reviewAll
  });

  Template.body.helpers({
    cards: function() {
      return Cards.find({
        userId: Meteor.user()._id
      }).fetch();
    },
    categories: function() {
      var importing = Session.get("import");
      var categories = Categories.find().fetch();
      categories.sort();
      Session.set("import", false);
      return categories;
    },
    cardsInCategory: function() {
      var categoryId = getCategoryId(Session.get("categoryToBrowse"));
      if (categoryId === null) {
        return [];
      }
      return Cards.find({'category': categoryId}).fetch();
    },
    nextCard: function() {
      var cards = [];
      learning = Session.get("learning");
      categoryToReview = Session.get("categoryToReview");
      if (categoryToReview == null) {
        cards = cardsDueToday();
      }
      else {
        cards = cardsDueTodayForCategory(categoryToReview, learning);
        if (cards.length == 0) {
          Session.set("learning", false);
          Session.set("categoryToReview", null);
          cards = cardsDueToday();
        }
      }
      if (cards.length == 0) {
        // TODO better way to display done studying
        return [Cards.findOne({"question": "Done studying!"})];
        Session.set("done", true);
        // return [];
      }
      var index = 0;
      if (!learning) {
        index = Math.floor(Math.random() * cards.length);
      }
      cards.sort(function (a,b) {
        return popularity_score(b) - popularity_score(a);
      });
      return [cards[index]];
    },
    progress: function() {
      return Session.get('numCardsSeen') / Session.get('numCardsTotal') * 100;
    },
    numCardsSeen: function() {
      return Session.get('numCardsSeen');
    },
    numCardsTotal: function() {
      return Session.get('numCardsTotal');
    },
    progressBarClass: function() {
      return Session.get('learning') ? 'bar-primary' : 'bar-success';
    },
    cardBrowsing: function() {
      return Session.get('categoryToBrowse') != null;
    }
  });

  Template.category.helpers({
    cardsInCategory: function(category) {
      var categoryId = getCategoryId(category);
      if (categoryId === null) {
        return [];
      }
      return Cards.find({'category': categoryId});
    }
  });

  Template.card.helpers({
    buttons: function() {
      return [{display1: "I got this wrong", days: "(show again)", rating: 0, display2: "0"},
            {display1: "I barely know", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.last_seen, 1, new Date(), newEasinessFactor(this.easiness, 1))) + ' day(s)', rating: 1, display2: 1},
            {display1: "I know a little", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.last_seen, 2, new Date(), newEasinessFactor(this.easiness, 2)))  + ' day(s)', rating: 2, display2: 2},
            {display1: "I sort of know", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.last_seen, 3, new Date(), newEasinessFactor(this.easiness, 3))) + ' day(s)', rating: 3, display2: 3},
            {display1: "I almost know", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.last_seen, 4, new Date(), newEasinessFactor(this.easiness, 4))) + ' day(s)', rating: 4, display2: 4},
            {display1: "I know it", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.last_seen, 5, new Date(), newEasinessFactor(this.easiness, 5))) + ' day(s)', rating: 5, display2: 5}];
    },
    isEditing: function() {
      return Session.get("isEditing");
    },
    isDoneCard: function() {
      return this.question == "Done studying!";
    },
    done: function() {
      return Session.get('numCardsSeen') == Session.get('numCardsTotal');
    },
  });

  Template.button.helpers({
    display1: function() {
      return this.display1;
    },
    days: function() {
      return this.days;
    },
    rating: function() {
      return this.rating;
    },
    display2: function() {
      return this.display2;
    }
  });

  Template.card.events({
    'click .card.clickable':   function(event, template) {
      var notFlip = ['yourAnswer', 'editQuestion', 'editAnswer', 'btn btn-xs btn-primary edit', 'btn btn-xs btn-info edit', 'btn btn-xs btn-success save', 'btn btn-xs btn-danger cancel', 'vote'];
      for (i in notFlip) {
        if ($(event.target).attr('class') == notFlip[i]) {
          return;
        }
      }
      if ($(event.target).attr('class') == 'edit') {
        return;
      }
      if ($(event.target).attr('class') == 'rank-number') {
        // TODO: store rating
        var id = $('.card').attr('id')
        var cardReference = {'_id': id};
        var response = $(event.target).attr('rating');
        yourAnswer = $('.card div').find(".yourAnswer").val();
        answerCard(cardReference, response, yourAnswer);

        $('.card div').find(".answer").hide()
        $('.card div').find(".card-footer").hide();
        $('.card div').find(".yourAnswer").attr("readonly", false);

      } else {
        $('.card').flip({
          direction: "rl",
          speed: 150,
          color: "#00372B",
          onEnd: function() {
               $('.card div').find(".answer").show()
               $('.card div').find(".card-footer").show();
               $('.card div').find(".yourAnswer").attr("readonly", "readonly");

               // Initialize card events
               $(".card-footer span").tooltip({
                    animation: false,
                    placement: "bottom"
                });
           }
        });
      }
    },
    'click button.edit': function(event, template) {
      if (!Session.get("isEditing")) {
        Session.set("isEditing", true);
        $('.edit').hide();
      }
    },
    'click button.save': function(event, template) {
      cardReference = {'_id': $('.card').attr('id')};
        Meteor.call("updateCard", cardReference, {
        $set: {
          'question': document.getElementById('editQuestion').value,
          'answer': document.getElementById('editAnswer').value
        }
      });
      Session.set("isEditing", false);
      $('.edit').show();
    },
    'click button.cancel': function(event, template) {
      Session.set("isEditing", false);
      $('.edit').show();
    },
    'click button.vote': function(event, template) {
      var change = {};
      if (event.target.id === "voteQuestionUp") {
        change = {'upvotes': 1};
      } else if (event.target.id === "voteQuestionDown") {
        change = {'downvotes': 1};
      }
      var cardReference = {'_id': $('.card').attr('id')};
      var card = Cards.findOne(cardReference);
      if (card.parentCard) {
        // is a user card
        card = Cards.findOne({'_id': card.parentCard});
      }
      Meteor.call("updateCard", card, {
        $inc: change
      });
    },
  });

  Template.categoryInAccordion.events({
    'click button.learn': function() {
      Session.set("learning", true);
      Session.set("categoryToReview", this.name);
      updateProgressBarLearning();
    },
    'click button.review': function() {
      Session.set("learning", false);
      Session.set("categoryToReview", this.name);
      updateProgressBar(0, cardsDueTodayForCategory(this.name, false).length)
    },
    'click button.browse': function() {
        currentCategory = Session.get("categoryToBrowse");
        if (currentCategory == null) {
          Session.set("categoryToBrowse", this.name);
          $('table').show()
          $(event.target).attr('class', 'btn btn-xs btn-info browse');
        }
        else if (currentCategory != this.name) {
          $('.browse').attr('class', 'btn btn-xs btn-default browse');
          Session.set("categoryToBrowse", this.name);
          $(event.target).attr('class', 'btn btn-xs btn-info browse');
        }
        else {
          Session.set("categoryToBrowse", null);
          $('table').hide();
          $('.browse').attr('class', 'btn btn-xs btn-default browse');
        }
    }
  });

  Template.card.rendered = function() {
    MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
  }

  Template.body.rendered = function() {
    $( "#accordion" ).accordion({
      collapsible: true,
      heightStyle: "content"
    });
    MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
  }

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  Meteor.startup(function () {
    showInputForm();
    showQuestionForm();
    Tracker.autorun(function (computation) {
      if (Meteor.userId() != null) {
        if (cardsDueToday().length > 0 && Session.get('numCardsSeen') > 0) {
          computation.stop();
        } else if (!Session.get("learning")) {
          reviewAll();
        }
      }
    });
  });

}

function popularity_score(card) {
  /**
    Calculate the popularity score.
   */
  // hidden votes: 5 up 5 down
  var upvotes = (card.upvotes === undefined) ? 0 : card.upvotes;
  var downvotes = (card.downvotes === undefined) ? 0 : card.downvotes;
  return (upvotes + 5) / (upvotes + downvotes + 10);
}

function getCategoryId(categoryName) {
  /**
    Get ID of the category with specified name, or null if category does not exist.
   */
  var categoryObj = Categories.findOne({'name': categoryName});
  if (categoryObj === undefined) {
    return null;
  }
  return categoryObj._id;
}

function reviewAll() {
  Session.set("learning", false);
  Session.set("categoryToReview", null);
  updateProgressBar(0, cardsDueToday().length);

  // maybe?
  // Session.set("categoryToBrowse", null);
}

function updateCurrentCard(response) {
  var selectedCardReference = Session.get('selectedCard');
  answerCard(selectedCardReference, response);
}

function isCorrect(response) {
  return Number(response) > 0;
}

function answerCard(cardReference, response, yourAnswer) {
    var card = Cards.findOne(cardReference);
    if (card.userId == undefined) {
      console.log('creating user card');
      Meteor.call('createUserCard', card._id, response, yourAnswer);
    } else {
      updateCard(cardReference, response, yourAnswer);
    }
    if (isCorrect(response) || Session.get('learning')) {
      incrementProgressBar();
      //updateProgressBarReviewing(Session.get('numCardsTotal') - cardsDueToday().length);
    }
}

function cardsInCategory(category) {
  var categoryId = getCategoryId(category);
  if (categoryId === null) {
    return [];
  }
  return Cards.find({'category': categoryId});
}

function cardsDueToday() {
  var cards = Cards.find({userId: Meteor.userId()}).fetch();
  var dueCards = [];
  for (card in cards) {
    if (cards[card]["next_scheduled"] < new Date()) {
      dueCards.push(populateCardFromParent(cards[card]));
    }
  }
  return dueCards;
}

function cardsDueTodayForCategory(category, learning) {
  var categoryId = getCategoryId(category);
  if (categoryId === null) {
    return [];
  }
  var cards = Cards.find({'category': categoryId}).fetch();
  var dueCards = [];
  if (learning) {
    for (i in cards) {
      if (Cards.find({
        parentCard: cards[i]._id,
        userId: Meteor.user()._id
      }).count() == 0) {
        dueCards.push(cards[i]);
      }
    }
  } else {
    var userCards = Cards.find({
      category: categoryId,
      userId: Meteor.user()._id
    }).fetch();
    for (i in userCards) {
      var card = populateCardFromParent(userCards[i]);
      if (card["next_scheduled"] != null && card["next_scheduled"] < new Date()) {
        dueCards.push(card);
      }
    }
  }
  return dueCards;
}

function populateCardFromParent(card) {
  if (card.question == undefined || card.answer == undefined) {
    var parentCard = Cards.findOne({_id: card.parentCard});
    card.question = parentCard.question;
    card.answer = parentCard.answer;
  }
  return card;
}

function getUserCard(parentCardId) {
  return Cards.findOne({
    'parentCard': parentCardId,
    'userId': Meteor.user()._id
  });
}

isUserCard = function(card) {
  return card.userId != undefined;
}

function inputFocus(i){
    if(i.value==i.defaultValue){ i.value=""; i.style.color="#000"; }
}
function inputBlur(i){
    if(i.value==""){ i.value=i.defaultValue; i.style.color="#888"; }
}

function incrementProgressBar() {
  Session.set('numCardsSeen', Session.get('numCardsSeen') + 1)
}

function updateProgressBarLearning() {
  updateProgressBar(
    Cards.find({
      category: getCategoryId(Session.get('categoryToReview')),
      userId: Meteor.userId()
    }).count(),
    Cards.find({
      category: getCategoryId(Session.get('categoryToReview')),
      userId: { $exists: false }
    }).count()
  );
}

function updateProgressBar(numSeen, numTotal) {
  Session.set('numCardsSeen', numSeen);
  Session.set('numCardsTotal', numTotal);
}

if (Meteor.isServer) {
  Meteor.startup(function () {
      if (Cards.find().count() === 0) {
        /* REMOVE?????
        Cards.insert({"question": "What is 2 + 2?",
                      "answer": "4",
                      "easiness": 2.5,
                      "next_scheduled": new Date(),
                      "history": [],
                      "categories": ["math", "lecture1"],
                      "yourAnswers": []
        });
        Cards.insert({"question": "Who was the first US president?",
                      "answer": "George Washington",
                      "easiness": 2.5,
                      "next_scheduled": new Date(),
                      "history": [],
                      "categories": ["history", "lecture1"],
                      "yourAnswers": []
        });
        Cards.insert({"question": "In what year was the Declaration of Independence signed?",
                      "answer": "1776",
                      "easiness": 2.5,
                      "next_scheduled": new Date(),
                      "history": [],
                      "categories": ["history", "lecture2"],
                      "yourAnswers": []
        });*/
        // TODO don't want this, better way to display done studying
        Cards.insert({"question": "Done studying!"});
      }
  });

  Meteor.publish("cards", function () {
    return Cards.find();
  });
  Meteor.publish("categories", function () {
    return Categories.find();
  });
}

Meteor.methods({
  storeCardSnapshot: function (cardReference) {
    var cardInfo = Cards.findOne(cardReference);
    delete cardInfo["history"]
    Cards.update(cardReference, {
        $push: {
            'history': cardInfo
        }
    })
  },
  updateCard: function (cardReference, updateObject) {
    Cards.update(cardReference, updateObject);
  },
  createUserCard: function (cardReference, rating, yourAnswer) {
    var newCardContent = {
      userId: Meteor.user()._id,
      parentCard: cardReference,
      easiness: 2.5,
      next_scheduled: new Date(),
      history: [],
      category: Cards.findOne(cardReference).category,
      consecutiveCorrect: 0
    };
    Cards.insert(newCardContent, function(err, id) {
      updateCard(id, rating, yourAnswer);
    });
  },
  userCardReviewPriority: function(userCardReference) {
    var userCard = Cards.findOne(userCard);
    var parentCard = Cards.findOne(userCard.parent);
    
    var importance = popularity_score(parentCard);
    var probability = recallProbability(userCardReference);
    
    return importance / probability;
  }
});