Cards = new Meteor.Collection("cards");
CardViews = new Meteor.Collection("card_views");

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
    'click input.easy': function() {
        var currentCard = Session.get('selected_card');
        currentEasiness = Cards.findOne(currentCard).easiness;
        Cards.update(currentCard, {$set:
            {'last_seen_millis' : (new Date()).getTime(),
             'easiness': newEasinessFactor(currentEasiness, 3)}}
        );
        var card = Cards.findOne(Session.get("selected_card"));
        console.log(card.last_seen_millis);
        console.log(card.easiness);
        CardViews.insert({
            "date_millis": (new Date()).getTime(),
            "card_status": card
        });
        var cardStatus = CardViews.findOne({"card_status": card});
        console.log(cardStatus);
    }
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

function newEasinessFactor(easinessFactor, quality) {
    quality = quality * 5./3.;
    return easinessFactor - 0.8 + 0.28*quality - 0.02*quality*quality;
}

if (Meteor.isServer) {
  Meteor.startup(function () {
      if (Cards.find().count() === 0) {
        Cards.insert({"_id": 1,
                      "question": "What is 2 + 2",
                      "answer": "4",
                      "last_seen_millis": -1,
                      "easiness": 2.5,
                      "next_scheduled_millis": (new Date()).getTime(),
                      "history": []
        });
        Cards.insert({"_id": 2,
                      "question": "Who was the first US president?",
                      "answer": "George Washington",
                      "last_seen_millis": -1,
                      "easiness": 2.5,
                      "next_scheduled_millis": (new Date()).getTime(),
                      "history": []
        });
      }
  });
}
