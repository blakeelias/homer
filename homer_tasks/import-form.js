showInputForm = function() {
  console.log("in showInputForm");

		$( "#import" ).button().on( "click", function() {
				dialog.dialog( "open" );
		});

		$(function() {
			var dialog, form,

				importDataField = $( "#importData" );

			function addUser() {
			  var data = importDataField.val();
			  data.split('\n').map(function (line) {
			    var pair = line.split('\t');
			    Meteor.call('insertCard', {'question': pair[0], 'answer': pair[1]});
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

Meteor.methods({
  insertCard: function (card) {
    Cards.insert(card);
  }
});