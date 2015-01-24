Cards = new Mongo.Collection("cards");
Categories = new Mongo.Collection("categories");
Tags.TagsMixin(Cards);

if (Meteor.isClient) {

  Meteor.subscribe("cards");
  Meteor.subscribe("categories");
  Meteor.subscribe("tags");

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
    dueCards: function() {
    	return cardsDueToday();
    },
    nextCard: function() {
      var cards = cardsDueToday();
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
          var temp = this;
          console.log('temp');
          console.log(temp);
          if ($(event.target).attr('class') == 'rank-number') {
            // TODO: store rating
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
    var card = Cards.findOne(cardReference);
    storeCardSnapshot(cardReference);
    Meteor.call("updateCard", cardReference, {
        $set: {
            'last_seen' : new Date(),
            'last_response': response,
            'easiness': newEasinessFactor(card.easiness, response)
        }
    });
}

function storeCardSnapshot(cardReference) {
  Meteor.call("storeCardSnapshot", cardReference);
}

function newEasinessFactor(easinessFactor, quality) {
    var newQuality = quality * 5./3.; // convert our 0-3 scale (wrong, hard, medium, easy) to 0-5 scale used in SM algorithm
    var easinessFactor = easinessFactor - 0.8 + 0.28*newQuality - 0.02*newQuality*newQuality;
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

if (Meteor.isServer) {
  Meteor.startup(function () {
      console.log("server starting up");
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
      console.log(cardsInCategory({categories: "history"}));
      console.log(cardCategories({"question": "What is 2 + 2?"}));
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
