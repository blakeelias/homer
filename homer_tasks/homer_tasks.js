Cards = new Mongo.Collection("cards");
Categories = new Mongo.Collection("categories");
Tags.TagsMixin(Cards);

if (Meteor.isClient) {

  Meteor.subscribe("cards");
  Meteor.subscribe("categories");
  Meteor.subscribe("tags");
  
  Session.set("learning", false);
  Session.set("categoryToReview", null);
  Session.set("categoryToBrowse", null);

  Template.body.greeting = function () {
    return "Click a question below to view its answer.";
  };

  Template.body.selected_card = function () {
    return Cards.findOne(Session.get("selectedCard"));
  };

    Template.body.events({
    'click input.import' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");

    },
    'click input.easy':   function() { updateCurrentCard(3); },
    'click input.medium': function() { updateCurrentCard(2); },
    'click input.hard':   function() { updateCurrentCard(1); },
    'click input.wrong':  function() { updateCurrentCard(0); }
  });

  Template.body.helpers({
    cards: function() {
      return Cards.find(); //return Meteor.call("getCards");
    },
    tags: function() {
      tags = Meteor.tags.find().fetch();
      return tags;
    },
    cardsInCategory: function() {
    	categoryToBrowse = Session.get("categoryToBrowse");
        console.log(categoryToBrowse);
    	if (categoryToBrowse == null) {
          return
        }
        return Cards.find({tags: categoryToBrowse}).fetch();
    },
    // ONLY USED FOR PART OF ACCORDION WE WANT TO GET RID OFF
    dueCards: function() {
    	return cardsDueToday();
    },
    nextCard: function() {
      var cards = [];
      learning = Session.get("learning");
      categoryToReview = Session.get("categoryToReview");
      console.log("categoryToReview: ", categoryToReview);
      console.log("learning: ", learning)
      if (categoryToReview == null) {
      	cards = cardsDueToday();
      }
      else {
        cards = cardsDueTodayForCategory(categoryToReview, learning);
        if (cards.length == 0) {
          if (learning) {
            Session.set("learning", false);
          }
          Session.set("categoryToReview", null);
          cards = cardsDueToday();
        }
      }
      /*
      if (cards.length == 0) {
        $('.card').html("Done studying");
      }*/
      var index = Math.floor(Math.random() * cards.length);
      return [cards[index]];
    }
  });

  Template.tag.helpers({
    cardsInCategory: function(tag) {
      return Cards.find({tags:tag});
    }
  });

  Template.card.events({
       'click .card':   function(event, template) {

          if ($(event.target).attr('class') == 'rank-number') {
            // TODO: store rating
            console.log("id below");
            var id = $('.card').attr('id')
            console.log(id);
            var cardReference = {'_id': id};
            var response = $(event.target).attr('rating');
            console.log(response)
            console.log("in click card thing, card ref following");
            console.log(cardReference);
            updateCard(cardReference, response);
          } else {
            $('.card').flip({
              direction: "rl",
              speed: 400,
              color: "#00372B",
              onEnd: function() {
                   $('.card div').find(".answer").show()
                   $('.card div').find(".card-footer").show();

                   // Initialize card events
                   $(".card-footer span").tooltip({
                        animation: false,
                        placement: "bottom"
                    });
               }
            });
          }
           
       }
  });
  
  Template.tagInAccordion.events({
    'click button.learn': function() {
    	console.log("clicked learn button");
    	Session.set("learning", true);
    	Session.set("categoryToReview", this.name);
    },
  	'click button.review': function() {
  		console.log("clicked review button");
  		Session.set("learning", false);
        Session.set("categoryToReview", this.name);
	},
    'click button.browse': function() {
        console.log("clicked browse button");
        Session.set("categoryToBrowse", this.name);
        $('table').show()
    }
});

  Template.cardInAccordion.rendered = function() {
    $( "#accordion" ).accordion({
      collapsible: true
    });
  }

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

	Meteor.startup(function () {
		console.log("in Meteor.startup");
		showInputForm();
	});
}

function updateCurrentCard(response) {
    var selectedCardReference = Session.get('selectedCard');
    updateCard(selectedCardReference, response);
}

function updateCard(cardReference, response) {
    var nowDate = new Date();
    var card = Cards.findOne(cardReference);
    console.log(cardReference);
    console.log(card);
    var reviewNumber = card.history.length;
    storeCardSnapshot(cardReference);
    var easiness = newEasinessFactor(card.easiness, response);
    if (response == 0) {
      var interval = 0;
    } else {
      if (reviewNumber == 0) {
        var interval = 1;
      } else if (reviewNumber == 1) {
        var interval = 6;
      } else {
        var daysSinceLastSeen = (nowDate - card.last_seen) / (1000 * 60 * 60 * 24);
        console.log('days since last seen: ' + daysSinceLastSeen);
        var interval = easiness * daysSinceLastSeen;
      }
    }
    var nextReview = moment(nowDate);
    console.log('interval days: ' + interval);
    nextReview.add(interval, 'days');
    console.log(nextReview);
    Meteor.call("updateCard", cardReference, {
        $set: {
            'last_seen' : nowDate,
            'last_response': response,
            'easiness': easiness,
            'next_scheduled': nextReview._d
        }
    });
}

function storeCardSnapshot(cardReference) {
  Meteor.call("storeCardSnapshot", cardReference);
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

function cardsInCategory(category) {
    return Cards.find(category).fetch();
}

function cardCategories(query) {
    var card = Cards.findOne(query);
    console.log(card);
    return card.categories;
}

function cardsDueToday() {
	cards = Cards.find().fetch();
	dueCards = [];
	for (card in cards) {
		if (cards[card]["next_scheduled"] < new Date()) {
			dueCards.push(cards[card]);
		}
	}
	return dueCards;
}

function cardsDueTodayForCategory(category, learning) {
	cards = Cards.find({tags: category}).fetch();
	dueCards = [];
	if (learning) {
	  for (card in cards) {
	    if (cards[card]["next_scheduled"] == null) {
	      dueCards.push(cards[card]);
	    }
	  }
    }
    else {
	  for (card in cards) {
		if (cards[card]["next_scheduled"] != null && cards[card]["next_scheduled"] < new Date()) {
                  dueCards.push(cards[card]);
		}
	  }
	}
	return dueCards
}	

if (Meteor.isServer) {
  Meteor.startup(function () {
      if (Cards.find().count() === 0) {
        Cards.insert({"question": "What is 2 + 2?",
                      "answer": "4",
                      "easiness": 2.5,
                      "next_scheduled": new Date(),
                      "history": [],
                      "categories": ["math", "lecture1"]
        });
        Cards.insert({"question": "Who was the first US president?",
                      "answer": "George Washington",
                      "easiness": 2.5,
                      "next_scheduled": new Date(),
                      "history": [],
                      "categories": ["history", "lecture1"]
        });
        Cards.insert({"question": "In what year was the Declaration of Independence signed?",
                      "answer": "1776",
                      "easiness": 2.5,
                      "next_scheduled": new Date(),
                      "history": [],
                      "categories": ["history", "lecture2"]
        });
      }
  });

  Cards.allowTags(function (userId) {
    // only allow if user is logged in
    //return !!userId;
    return true;
  });

  Meteor.publish("cards", function () {
    return Cards.find();
  });
  Meteor.publish("categories", function () {
    return Categories.find();
  });
  Meteor.publish("tags", function () {
    return Meteor.tags.find();
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
  }
});
