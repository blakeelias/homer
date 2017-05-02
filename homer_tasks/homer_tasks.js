Cards = new Mongo.Collection("cards");
UserCards = new Mongo.Collection("userCards");
Categories = new Mongo.Collection("categories");
// Tags = new Mongo.Collection("tags");

if (Meteor.isClient) {

  Meteor.subscribe("cards");
  Meteor.subscribe("categories");
  Meteor.subscribe("userCards");
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
    categories: function() {
      var importing = Session.get("import");
      var categories = Categories.find().fetch();
      categories.sort();
      Session.set("import", false);
      return categories;
    },
    cardsInCategory: function() {
      return cardsInCategory(Session.get("categoryToBrowse"));
    },
    nextCard: function() {
      console.log("starting nextCard");
      var cards = [];
      learning = Session.get("learning");
      categoryToReview = Session.get("categoryToReview");
      if (categoryToReview == null) {
        cards = cardsDueToday();
      }
      else {
        cards = cardsToShowForCategory(categoryToReview, learning);
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
      } else {
        cards.sort(function (a,b) {
          return pop_score(b) - pop_score(a);
        });
      }
      console.log(cards);
      console.log(cards[index]);
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
      return cardsInCategory(category);
    }
  });

  Template.card.helpers({
    buttons: function() {
      return [{display1: "I got this wrong", days: "(show again)", rating: 0, display2: "0"},
            {display1: "I barely know", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.lastSeen, 1, new Date(), newEasinessFactor(this.easiness, 1))) + ' day(s)', rating: 1, display2: 1},
            {display1: "I know a little", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.lastSeen, 2, new Date(), newEasinessFactor(this.easiness, 2)))  + ' day(s)', rating: 2, display2: 2},
            {display1: "I sort of know", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.lastSeen, 3, new Date(), newEasinessFactor(this.easiness, 3))) + ' day(s)', rating: 3, display2: 3},
            {display1: "I almost know", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.lastSeen, 4, new Date(), newEasinessFactor(this.easiness, 4))) + ' day(s)', rating: 4, display2: 4},
            {display1: "I know it", days: 'next review in ' + Math.round(computeInterval(this.consecutiveCorrect, this.lastSeen, 5, new Date(), newEasinessFactor(this.easiness, 5))) + ' day(s)', rating: 5, display2: 5}];
    },
    isEditing: function() {
      return Session.get("isEditing");
    },
    isDoneCard: function() {
      return this.question == "Done studying!";
    },
    done: function() {
      return Session.get('numCardsSeen') == Session.get('numCardsTotal');
    }
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
        var id = $('.card').attr('id');
        var rating = $(event.target).attr('rating');
        var yourAnswer = $('.card div').find(".yourAnswer").val();
        answerCard({'_id': id}, rating, yourAnswer);

        $('.card div').find(".answer").hide()
        $('.card div').find(".card-footer").hide();
        $('.card div').find(".yourAnswer").attr("readonly", false);
        console.log("ending click .card.clickable");
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
      updateProgressBar(0, cardsToShowForCategory(this.name, false).length)
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
    // MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
  }

  Template.body.rendered = function() {
    $( "#accordion" ).accordion({
      collapsible: true,
      heightStyle: "content"
    });
    // MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
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

function pop_score(card) {
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

function isCorrect(response) {
  return Number(response) > 0;
}

function answerCard(cardRef, rating, response) {
  /**
   * Answer a card.
   */
  var card = Cards.findOne(cardRef);
  if (card === undefined) {
    // user card
    updateUserCard(cardRef, rating, response);
  } else {
    // master card
    Meteor.call('createUserCard', card._id, rating, response);
  }
  if (isCorrect(response) || Session.get('learning')) {
    incrementProgressBar();
  }
}

function updateUserCard(cardRef, rating, response) {
  /**
   * Update an user card.
   */
  var nowDate = new Date();
  var card = UserCards.findOne(cardRef);
  var easiness = newEasinessFactor(card.easiness, rating);
  var interval = computeInterval(card.consecutiveCorrect, card.lastSeen, rating, nowDate, easiness);
  var nextReview = moment(nowDate);
  nextReview.add(interval, 'days');
  Meteor.call("storeCardSnapshot", cardRef);
  Meteor.call("updateUserCard", cardRef, {
      $set: {
        'lastSeen' : nowDate,
        'nextScheduled': nextReview._d,
        'easiness': easiness,
        'consecutiveCorrect': (rating > 0) ? (card.consecutiveCorrect + 1) : 0
      },
      $push: {
        'pastResponses': response,
      }
  });
}

function computeInterval(consecutiveCorrect, lastSeen, response, nowDate, easiness) {
  if (response == 0) {
    return 0;
  } else {
    if (consecutiveCorrect == 0 || consecutiveCorrect == null) {
      return 1;
    } else if (consecutiveCorrect == 1) {
      return 6;
    } else {
      var daysSinceLastSeen = (nowDate - lastSeen) / (1000 * 60 * 60 * 24);
      return easiness * daysSinceLastSeen;
    }
  }
}

function newEasinessFactor(easinessFactor, quality) {
    var easinessFactor = easinessFactor - 0.8 + 0.28*quality - 0.02*quality*quality;
    if (easinessFactor < 1.3) {
        return 1.3;
    }
    if (easinessFactor > 2.5) {
        return 2.5;
    }
    return easinessFactor;
}

function cardsToShowForCategory(category, learning) {
  if (learning) {
    return cardsToLearnForCategory(category);
  } else {
    return cardsDueTodayForCategory(category);
  }
}

function cardsInCategory(category) {
  var categoryId = getCategoryId(category);
  if (categoryId === null) {
    return [];
  }
  return Cards.find({'category': categoryId}).fetch();
}

function cardsToLearnForCategory(category) {
  var userCards = Cards.find({'userId': Meteor.user()._id});
  var parentCardIds = new Set(userCards.map(function (card) {
    return card.parentCard;
  }));
  var cards = cardsInCategory(category);
  return cards.filter(function (card) {
    return !parentCardIds.has(card._id);
  });
}

function cardsDueToday() {
  var cards = UserCards.find({'userId': Meteor.userId()}).fetch();
  var dueCards = cards.filter(function (card) {
    return (card.nextScheduled < new Date());
  });
  return dueCards;
}

function cardsDueTodayForCategory(category) {
  var categoryId = getCategoryId(category);
  if (categoryId === null) {
    return [];
  }
  var dueCards = cardsDueToday();
  var parentCardIds = [];
  var parentToUserMap = {};
  dueCards.forEach(function (card) {
    var parentCardId = card.parentCard;
    parentCardIds.push(parentCardId);
    parentToUserMap[parentCardId] = card;
  });
  return Cards.find({
    '_id': {$in: parentCardIds},
    'cateogry': categoryId
  }).map(function (card) {
    return parentToUserMap[card._id];
  });
}

function populateCardFromParent(card) {
  if (card.question == undefined || card.answer == undefined) {
    var parentCard = Cards.findOne({_id: card.parentCard});
    card.question = parentCard.question;
    card.answer = parentCard.answer;
  }
  return card;
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
    var cardInfo = UserCards.findOne(cardReference);
    delete cardInfo["history"]
    Cards.update(cardReference, {
        $push: {
            'history': cardInfo
        }
    })
  },
  updateUserCard: function (cardReference, updateObject) {
    UserCards.update(cardReference, updateObject);
  },
  createUserCard: function (parentCardId, rating, response) {
    var newCardContent = {
      'userId': Meteor.user()._id,
      'parentCard': parentCardId,
      'easiness': 2.5,
      'nextScheduled': new Date(),
      'pastResponses': [],
      'history': [],
      'consecutiveCorrect': 0
    };
    UserCards.insert(newCardContent, function(err, id) {
      updateUserCard({'_id': id}, rating, response);
    });
  }
});
