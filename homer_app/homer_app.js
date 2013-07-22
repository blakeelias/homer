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
    'click input.right': function() {
        Cards.update(Session.get('selected_card'), {$set: {'last_seen' : new Date().UTC()}});
        var card = Cards.findOne(Session.get("selected_card"));
        console.log(card.last_seen);
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

if (Meteor.isServer) {
  Meteor.startup(function () {
      if (Cards.find().count() === 0) {
        Cards.insert({"question": "What is 2 + 2",
                      "answer": "4",
                      "last_seen": -1,
                      "difficulty": 2.5,
                      "next_scheduled": (new Date()).UTC()
        });
        Cards.insert({"question": "Who was the first US president?",
                      "answer": "George Washington",
                      "last_seen": -1,
                      "difficulty": 2.5,
                      "next_scheduled": (new Date()).UTC()
        });
      }
  });
}
