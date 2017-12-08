import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Games } from './games.js';
import { Status } from './status.js';

export const Actions = {
  createNewGame() {
    return Games.insert({ player1: Meteor.userId(), player2: '', status: Status.OPEN, moves: [] });
  },

  findGame(selector) {
    check(selector, Object);

    const game = Games.findOne(selector);

    if (game === undefined) {
      throw new Meteor.Error('game-not-found');
    }

    return game;
  },

  findPlayingGame() {
    return Games.findOne({
      $and: [
        { status: Status.STARTED },
        { $or: [{ player1: Meteor.userId() }, { player2: Meteor.userId() }] },
      ],
    });
  },

  findOpenGame() {
    return Games.findOne({ status: Status.OPEN, player1: { $ne: Meteor.userId() }, player2: '' });
  },

  joinGame(game) {
    Games.update(
        { _id: game._id },
        { $set: { player2: Meteor.userId(), status: Status.SWAP2, currentPlayer: game.player1 } },
    );

    return game._id;
  },

  switchTurn(game) {
    if (game.status === Status.SWAP2 && game.moves.length <= 5) {
      return;
    }

    const nextPlayer = game.player1 === Meteor.userId() ? game.player2 : game.player1;

    Games.update({ _id: game._id }, { $set: { currentPlayer: nextPlayer } });
  },

  makeMove(game, row, col) {
    Games.update({ _id: game._id }, { $push: { moves: { row, col } } });
  },

  switchSides(game) {
    Games.update(
      { _id: game._id },
      {
        $set: {
          status: Status.STARTED,
          player1: game.player2,
          player2: game.player1,
          currentPlayer: game.player1,
        },
      },
    );
  },
};
