updateCard = function updateCard(cardReference, response, yourAnswer) {
  var nowDate = new Date();
  var card = Cards.findOne(cardReference);
  storeCardSnapshot(cardReference);
  var easiness = newEasinessFactor(card.easiness, response);
  var interval = computeInterval(card.consecutiveCorrect, card.last_seen, response, nowDate, easiness);
  var nextReview = moment(nowDate);
  nextReview.add(interval, 'days');
  Meteor.call("updateCard", cardReference, {
      $set: {
          'last_seen' : nowDate,
          'last_response': response,
          'easiness': easiness,
          'next_scheduled': nextReview._d,
          'yourAnswer': yourAnswer,
          'consecutiveCorrect': (response > 0) ? (card.consecutiveCorrect + 1) : 0
      }
  });
}

computeInterval = function computeInterval(consecutiveCorrect, last_seen, response, nowDate, easiness) {
  if (response == 0) {
    return 0;
  } else {
    if (consecutiveCorrect == 0 || consecutiveCorrect == null) {
      return 1;
    } else if (consecutiveCorrect == 1) {
      return 6;
    } else {
      var daysSinceLastSeen = (nowDate - last_seen) / (1000 * 60 * 60 * 24);
      console.log('days since last seen: ' + daysSinceLastSeen);
      return easiness * daysSinceLastSeen;
    }
  }
}


newEasinessFactor = function newEasinessFactor(easinessFactor, quality) {
    var easinessFactor = easinessFactor - 0.8 + 0.28*quality - 0.02*quality*quality;
    if (easinessFactor < 1.3) {
        return 1.3;
    }
    if (easinessFactor > 2.5) {
        return 2.5;
    }
    return easinessFactor;
}

storeCardSnapshot = function storeCardSnapshot(cardReference) {
  Meteor.call("storeCardSnapshot", cardReference);
}