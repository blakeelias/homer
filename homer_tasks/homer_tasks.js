Cards = new Mongo.Collection("cards");

if (Meteor.isClient) {

  Meteor.subscribe("cards");

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
  
	Meteor.startup(function () {
		
		$( "#import" ).button().on( "click", function() {
				dialog.dialog( "open" );
		});
	
		$(function() {
			var dialog, form,
 
				// From http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#e-mail-state-%28type=email%29
				emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
				name = $( "#name" ),
				email = $( "#email" ),
				password = $( "#password" ),
				allFields = $( [] ).add( name ).add( email ).add( password ),
				tips = $( ".validateTips" );
 
			function updateTips( t ) {
				tips
					.text( t )
					.addClass( "ui-state-highlight" );
				setTimeout(function() {
					tips.removeClass( "ui-state-highlight", 1500 );
				}, 500 );
			}
 
			function checkLength( o, n, min, max ) {
				if ( o.val().length > max || o.val().length < min ) {
					o.addClass( "ui-state-error" );
					updateTips( "Length of " + n + " must be between " +
						min + " and " + max + "." );
					return false;
				} else {
					return true;
				}
			}
 
			function checkRegexp( o, regexp, n ) {
				if ( !( regexp.test( o.val() ) ) ) {
					o.addClass( "ui-state-error" );
					updateTips( n );
					return false;
				} else {
					return true;
				}
			}
 
			function addUser() {
				var valid = true;
				allFields.removeClass( "ui-state-error" );
 
				valid = valid && checkLength( name, "username", 3, 16 );
				valid = valid && checkLength( email, "email", 6, 80 );
				valid = valid && checkLength( password, "password", 5, 16 );
 
				valid = valid && checkRegexp( name, /^[a-z]([0-9a-z_\s])+$/i, "Username may consist of a-z, 0-9, underscores, spaces and must begin with a letter." );
				valid = valid && checkRegexp( email, emailRegex, "eg. ui@jquery.com" );
				valid = valid && checkRegexp( password, /^([0-9a-zA-Z])+$/, "Password field only allow : a-z 0-9" );
 
				if ( valid ) {
					$( "#users tbody" ).append( "<tr>" +
						"<td>" + name.val() + "</td>" +
						"<td>" + email.val() + "</td>" +
						"<td>" + password.val() + "</td>" +
					"</tr>" );
					dialog.dialog( "close" );
				}
				return valid;
			}
 
			dialog = $( "#dialog-form" ).dialog({
				autoOpen: false,
				height: 600,
				width: 700,
				modal: true,
				buttons: {
					"Import": addUser,
					Cancel: function() {
						dialog.dialog( "close" );
					}
				},
				close: function() {
					form[ 0 ].reset();
					allFields.removeClass( "ui-state-error" );
				}
			});
 
			form = dialog.find( "form" ).on( "submit", function( event ) {
				event.preventDefault();
				addUser();
			});
 
			$( "#create-user" ).button().on( "click", function() {
				dialog.dialog( "open" );
			});
		});
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