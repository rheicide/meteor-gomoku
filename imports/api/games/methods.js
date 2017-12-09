import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { Games } from './games.js';
import { Status } from './status.js';
import { Actions } from './actions.js';
import { suggestMove, isValidPosition, isWinningMove } from './bot.js';

Meteor.methods({
  'games.play'() {
    const game = Actions.findOpenGame();
    if (game) {
      return Actions.joinGame(game, this.connection.id);
    }

    return Actions.createNewGame(this.connection.id);
  },

  'games.move'(gameId, row, col) {
    check(gameId, String);
    check(row, Number);
    check(col, Number);

    if (!isValidPosition(row, col)) {
      throw new Meteor.Error('invalid-move');
    }

    const game = Actions.findGame({
      _id: gameId,
      status: { $in: [Status.STARTED, Status.SWAP2] },
      currentPlayer: Meteor.userId(),
    });

    Actions.makeMove(game, row, col);

    if (isWinningMove(game, row, col)) {
      // game is won by current player
      Games.update({ _id: game._id }, { $set: { status: Status.FINISHED } });
    } else {
      const moveCount = game.moves.length + 1;

      if (moveCount === 15 * 15) { // tie
        Games.update({ _id: game._id }, { $set: { status: Status.FINISHED, currentPlayer: '' } });
      } else if (game.status === Status.SWAP2 && (moveCount === 3 || moveCount === 5)) {
        // this is when p1 (at move 3) or p2 (at move 5) has to make a choice during SWAP2 phase
        // empty game.currentPlayer so that they cannot make a move
        Games.update({ _id: game._id }, { $set: { currentPlayer: '' } });
      } else {
        Actions.switchTurn(game);
      }
    }
  },

  'games.forfeit'(gameId) {
    check(gameId, String);

    const game = Actions.findGame({ _id: gameId });
    const winner = game.player1 === Meteor.userId() ? game.player2 : game.player1;

    Games.update(
      { _id: gameId },
      { $set: { status: Status.FORFEITED, currentPlayer: winner } },
    );
  },

  'games.cancel'(gameId) {
    check(gameId, String);

    const game = Actions.findGame({ _id: gameId, status: Status.OPEN, player1: Meteor.userId() });

    Games.update({ _id: game._id }, { $set: { status: Status.CANCELED } });
  },

  'games.swap2.chooseSide'(gameId, side) {
    check(gameId, String);
    check(side, Match.OneOf('X', 'O'));

    const game = Actions.findGame({ _id: gameId, status: Status.SWAP2 });
    const player1ChoosingO = (side === 'O' && game.moves.length === 5 && game.player1 === Meteor.userId());
    const player2ChoosingX = (side === 'X' && game.moves.length === 3 && game.player2 === Meteor.userId());

    if (player1ChoosingO || player2ChoosingX) {
      Actions.switchSides(game);
    } else {
      // if p1 chooses to play X at move 5 or p2 chooses to play O at move 3
      // then p2 is the one to make the next move
      Games.update(
        { _id: gameId },
        { $set: { status: Status.STARTED, currentPlayer: game.player2 } },
      );
    }
  },

  // p2 chooses to play 2 more moves before letting p1 chooses sides
  'games.swap2.place2'(gameId) {
    check(gameId, String);

    const game = Actions.findGame({ _id: gameId, status: Status.SWAP2 });

    Games.update({ _id: gameId }, { $set: { currentPlayer: game.player2 } });
  },

  'games.hint'(gameId) {
    check(gameId, String);

    return suggestMove(Actions.findGame({
      _id: gameId,
      status: Status.STARTED,
      currentPlayer: Meteor.userId(),
    }));
  },
});
