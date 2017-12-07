import { Meteor } from 'meteor/meteor';
import { Games } from '../games.js';

Meteor.publish('games.my', function myGames() {
  return Games.find({
    $or: [
      { player1: Meteor.userId() },
      { player2: Meteor.userId() },
    ],
  });
});
