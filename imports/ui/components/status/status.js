import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { Games } from '../../../api/games/games.js';
import { Status } from '../../../api/games/status.js';

import './status.html';

Template.status.onCreated(() => {
  Meteor.subscribe('games.my');
});

Template.status.helpers({
  status: () => {
    const game = Games.findOne({ _id: Session.get('gameId') });

    if (game) {
      switch (game.status) {
        case Status.OPEN: {
          return 'Waiting for opponent...';
        }
        case Status.SWAP2: {
          return 'Swap2';
        }
        case Status.STARTED: {
          const marker = game.player1 === Meteor.userId() ? 'X' : 'O';
          const theirMarker = marker === 'X' ? 'O' : 'X';

          if (game.currentPlayer === Meteor.userId()) {
            return `Your turn (${marker})`;
          }

          return `Their turn (${theirMarker})`;
        }
        case Status.FINISHED: {
          if (game.currentPlayer === '') {
            return 'It\'s a tie!';
          }

          return `You ${game.currentPlayer === Meteor.userId() ? 'won' : 'lose'}!`;
        }
        case Status.FORFEITED:
        case Status.DISCONNECTED: {
          const msg = 'You won.';

          if (game.status === Status.FORFEITED) {
            return `${msg} Your opponent has forfeited the game.`;
          }

          return `${msg} Your opponent has disconnected.`;
        }
        default: {
          return 'There\'s something wrong with the game.';
        }
      }
    } else {
      Session.set('gameId', undefined);
      return 'Let\'s play a Gomoku game!';
    }
  },
});
