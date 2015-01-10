Cards = new Mongo.Collection("cards");
Categories = new Mongo.Collection("categories");

if (Meteor.isClient) {

  Meteor.subscribe("cards");
  Meteor.subscribe("categories");

  Template.body.greeting = function () {
    return "Click a question below to view its answer.";
  };
  
  Template.body.selected_card = function () {
    return Cards.findOne(Session.get("selectedCard"));
  };

  Template.body.events({
    'click input' : function () {
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
    }
  });

  Template.card.events({
      'click': function () {
          console.log("You clicked a card");
          Session.set("selectedCard", this._id);
       }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
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
  }
});