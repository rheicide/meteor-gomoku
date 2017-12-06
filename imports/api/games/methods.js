import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Games } from './games.js';
import { Status } from './status.js';
import { suggestMove, isValidPosition, isWinningMove } from './ai.js';

Meteor.methods({
  'games.play'() {
    let game = findPlayingGame();
    if (game) {
      return game._id;
    }

    game = findOpenGame();
    if (game) {
      return joinGame(game);
    }

    return createNewGame();
  },

  'games.move'(gameId, row, col) {
    check(gameId, String);
    check(row, Number);
    check(col, Number);

    if (!isValidPosition(row, col)) {
      throw new Meteor.Error('invalid-move');
    }

    const cursor = Games.find({ _id: gameId });
    let game = cursor.fetch()[0];

    if (game === undefined) {
      throw new Meteor.Error('game-not-found');
    }

    if ((game.status === Status.STARTED || game.status === Status.SWAP2) &&
        game.currentPlayer === Meteor.userId()) {
      makeMove(game, row, col);

      if (isWinningMove(game, row, col)) {
        Games.update({ _id: game._id }, { $set: { status: Status.FINISHED } });
      } else {
        game = cursor.fetch()[0];
        const moveCount = game.moves.length;

        if (game.status === Status.SWAP2 && (moveCount === 3 || moveCount === 5)) {
          Games.update({ _id: game._id }, { $set: { currentPlayer: '' } });
        } else {
          switchTurn(game);
        }
      }
    }
  },

  'games.forfeit'(gameId) {
    check(gameId, String);
    const game = Games.findOne({ _id: gameId });

    if (game) {
      let winner;

      if (game.player1 === Meteor.userId()) {
        winner = game.player2;
      } else {
        winner = game.player1;
      }

      Games.update(
        { _id: gameId },
        { $set: { status: Status.FORFEITED, currentPlayer: winner } },
      );
    }
  },

  'games.cancel'(gameId) {
    check(gameId, String);
    const game = Games.findOne({ _id: gameId });

    if (game && game.status === Status.OPEN && game.player1 === Meteor.userId()) {
      Games.update({ _id: gameId }, { $set: { status: Status.CANCELED } });
    }
  },

  'games.swap2.chooseSide'(gameId, side) {
    check(gameId, String);
    const game = Games.findOne({ _id: gameId, status: Status.SWAP2 });

    if (game === undefined) {
      throw new Meteor.Error('game-not-found');
    }

    const player1ChoosingO = (side === 'O' && game.moves.length === 5 && game.player1 === Meteor.userId());
    const player2ChoosingX = (side === 'X' && game.moves.length === 3 && game.player2 === Meteor.userId());

    if (player1ChoosingO || player2ChoosingX) {
      switchSides(game);
    } else {
      Games.update(
        { _id: gameId },
        { $set: { status: Status.STARTED, currentPlayer: game.player2 } }
      );
    }
  },

  'games.swap2.place2'(gameId) {
    check(gameId, String);
    const game = Games.findOne({ _id: gameId, status: Status.SWAP2 });

    if (game) {
      Games.update({ _id: gameId }, { $set: { currentPlayer: game.player2 } });
    }
  },

  'games.hint'(gameId) {
    check(gameId, String);
    const game = Games.findOne({ _id: gameId, status: Status.STARTED });

    if (game) {
      return suggestMove(game);
    }
  }
});

function createNewGame() {
  return Games.insert({ player1: Meteor.userId(), player2: '', status: Status.OPEN, moves: [] });
}

function findPlayingGame() {
  return Games.findOne({
    $and: [
      { status: Status.STARTED },
      { $or: [{ player1: Meteor.userId() }, { player2: Meteor.userId() }] },
    ]
  });
}

function findOpenGame() {
  return Games.findOne({ status: Status.OPEN, player1: { $ne: Meteor.userId() }, player2: '' });
}

function joinGame(game) {
  Games.update(
    { _id: game._id },
    { $set: { player2: Meteor.userId(), status: Status.SWAP2, currentPlayer: game.player1 } },
  );

  return game._id;
}

function switchTurn(game) {
  if (game.status === Status.SWAP2 && game.moves.length <= 5) {
    return;
  }

  const nextPlayer = (game.player1 === Meteor.userId()) ? game.player1 : game.player2;

  Games.update({ _id: game._id }, { $set: { currentPlayer: nextPlayer } });
}

function makeMove(game, row, col) {
  Games.update({ _id: game._id }, { $push: { moves: { row, col } } });
}

function switchSides(game) {
  Games.update(
    { _id: game._id },
    {
      $set: {
        status: Status.STARTED,
        player1: game.player2,
        player2: game.player1,
        currentPlayer: game.player1,
      }
    }
  );
}
