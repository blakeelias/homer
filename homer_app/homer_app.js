Cards = new Meteor.Collection("cards");

if (Meteor.isClient) {
  Template.list.greeting = function () {
    return "Click a question below to view its answer.";
  };
  
  Template.list.selected_card = function () {
    var card = Cards.findOne(Session.get("selected_card"));
    return card;
  };

  Template.list.events({
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
  
  Template.list.cards = function() {
      return Cards.find({});
  };
  
  Template.card.events({
      'click': function () {
          console.log("You clicked a card");
          Session.set("selected_card", this._id);
       }
  });
}

function updateCurrentCard(response) {
    var selectedCardReference = Session.get('selected_card');
    updateCard(selectedCardReference, response);
}

function updateCard(cardReference, response) {
    var card = Cards.findOne(cardReference);
    Cards.update(cardReference, {
        $set: {
            'last_seen' : (new Date()).getTime() / 1000,
            'easiness': newEasinessFactor(card.easiness, response)
        }
    });
    storeCardSnapshot(cardReference);
}

function storeCardSnapshot(cardReference) {
    var cardInfo = Cards.findOne(cardReference, {"history": 0});
    Cards.update(cardReference, {
        $push: {
            'history': cardInfo
        }
    })
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

if (Meteor.isServer) {
  Meteor.startup(function () {
      if (Cards.find().count() === 0) {
        Cards.insert({"question": "What is 2 + 2",
                      "answer": "4",
                      "last_seen": -1,
                      "easiness": 2.5,
                      "next_scheduled": (new Date()).getTime(),
                      "history": []
        });
        Cards.insert({"question": "Who was the first US president?",
                      "answer": "George Washington",
                      "last_seen": -1,
                      "easiness": 2.5,
                      "next_scheduled": (new Date()).getTime(),
                      "history": []
        });
      }
  });
}
