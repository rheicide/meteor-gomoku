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
        case Status.OPEN:
          return 'Waiting for opponent...';

        case Status.SWAP2:
          return 'Swap2';

        case Status.STARTED:
          let marker;
          if (game.player1 === Meteor.userId()) {
            marker = 'X';
          } else {
            marker = 'O';
          }
          
          if (game.currentPlayer === Meteor.userId()) {
            return `Your turn (${marker})`;
          } else {
            return `Their turn (${marker === 'X' ? 'O' : 'X'})`;
          }

        case Status.FINISHED:
          return `You ${game.currentPlayer === Meteor.userId() ? 'won' : 'lose'}!`;

        case Status.FORFEITED:
        case Status.DISCONNECTED:
          const msg = 'You won.';

          if (game.status === Status.FORFEITED) {
            return `${msg} Your opponent has forfeited the game.`;
          } else {
            return `${msg} Your opponent has disconnected.`;
          }
      }
    } else {
      Session.set('gameId', undefined);
      return 'Let\'s play a Gomoku game!';
    }
  },
});
