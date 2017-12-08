import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';

import { Games } from '../../../api/games/games.js';
import { Status } from '../../../api/games/status.js';

import './control.html';

Template.control.onCreated(function controlOnCreated () {
  Meteor.subscribe('games.my');
  this.hintsLeft = new ReactiveVar(3);
});

Template.control.events({
  'click #play'(event, templateInstance) {
    Meteor.call('games.play', (err, gameId) => {
      if (err) {
        console.error(err);
      } else {
        Session.set('gameId', gameId);
        Session.set('hint', undefined);
        templateInstance.hintsLeft.set(3);
      }
    });
  },
  'click #forfeit'() {
    Meteor.call('games.forfeit', Session.get('gameId'), () => {
      Session.set('gameId', undefined);
    });
  },
  'click #cancel'() {
    Meteor.call('games.cancel', Session.get('gameId'), () => {
      Session.set('gameId', undefined);
    });
  },
  'click #playX'() {
    Meteor.call('games.swap2.chooseSide', Session.get('gameId'), 'X');
  },
  'click #playO'() {
    Meteor.call('games.swap2.chooseSide', Session.get('gameId'), 'O');
  },
  'click #place2'() {
    Meteor.call('games.swap2.place2', Session.get('gameId'));
  },
  'click #hint'(event, templateInstance) {
    const hint = Session.get('hint');

    if (hint === undefined) {
      Meteor.call('games.hint', Session.get('gameId'), (err, move) => {
        Session.set('hint', move);
        templateInstance.hintsLeft.set(templateInstance.hintsLeft.get() - 1);
      });
    }
  },
});

Template.control.helpers({
  canStartGame: () => {
    const gameId = Session.get('gameId');

    if (gameId) {
      const game = Games.findOne({ _id: gameId });
      return game === undefined || game.status > Status.STARTED;
    }

    return true;
  },
  gameStarted: () => {
    const game = Games.findOne({ _id: Session.get('gameId'), status: Status.STARTED });
    return game !== undefined;
  },
  canCancel: () => {
    const game = Games.findOne({ _id: Session.get('gameId'), status: Status.OPEN, player1: Meteor.userId() });
    return game !== undefined;
  },
  swap2: () => {
    const game = Games.findOne({ _id: Session.get('gameId'), status: Status.SWAP2 });
    return game !== undefined;
  },
  canChooseSide: () => {
    const game = Games.findOne({ _id: Session.get('gameId'), status: Status.SWAP2 });

    if (game.player1 === Meteor.userId()) {
      return game.moves.length === 5;
    }

    return game.moves.length === 3 && game.currentPlayer === '';
  },
  canPlace2: () => {
    const game = Games.findOne({
      _id: Session.get('gameId'),
      status: Status.SWAP2,
      currentPlayer: '',
      player2: Meteor.userId(),
      moves: { $size: 3 },
    });

    return game !== undefined;
  },
  hintDisabled: () => {
    // has to be current player to get hint
    const game = Games.findOne({
      _id: Session.get('gameId'),
      status: Status.STARTED,
      currentPlayer: Meteor.userId(),
    });

    return game === undefined || Template.instance().hintsLeft.get() <= 0;
  },
  hintsLeft: () => Template.instance().hintsLeft.get(),
});
