showInputForm = function() {
  console.log("in showInputForm");

		var numTagGroups = 0;
		
		$( "#import" ).button().on( "click", function() {
				dialog.dialog( "open" );
		});

		$(function() {
			var dialog, form,
 
				importDataField = $( "#importData" ),
				importCategory = $( "#importCategory" );
 
			function addUser() {
			  var data = importDataField.val();
			  data.split('\n').map(function (line) {
			    var pair = line.split('\t');
			    Meteor.call('insertCard', {'question': pair[0], 'answer': pair[1], 'easiness': 2.5, 'history':[]});
			    card = Cards.findOne({'question': pair[0]});
			    Cards.addTag(importCategory.val(), card);
			  });
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
}


showQuestionForm = function() {
  console.log("in showQuestionForm");
		
		$( "#import" ).button().on( "click", function() {
				questionDialog.dialog( "open" );
		});

		$(function() {
			var questionDialog, form,
 
				importDataField = $( "#importData" ),
				importCategory = $( "#importCategory" );
 
			function addUser() {
			  var data = importDataField.val();
			  data.split('\n').map(function (line) {
			    var pair = line.split('\t');
			    Meteor.call('insertCard', {'question': pair[0], 'answer': pair[1], 'easiness': 2.5, 'history':[]});
			    card = Cards.findOne({'question': pair[0]});
			    Cards.addTag(importCategory.val(), card);
			  });
			}

			questionDialog = $( "#question-form" ).dialog({
				autoOpen: false,
				height: 600,
				width: 700,
				modal: true,
				buttons: {
					"Import": addUser,
					Cancel: function() {
						questionDialog.dialog( "close" );
					}
				},
				close: function() {
					form[ 0 ].reset();
					allFields.removeClass( "ui-state-error" );
				}
			});

			form = questionDialog.find( "form" ).on( "submit", function( event ) {
				event.preventDefault();
				addUser();
			});

			$( "#create-card" ).button().on( "click", function() {
				questionDialog.dialog( "open" );
			});
		});
}


Meteor.methods({
  insertCard: function (card) {
    Cards.insert(card);
  }
});
