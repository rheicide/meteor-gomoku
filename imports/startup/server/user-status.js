import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';

import { Games } from '../../api/games/games.js';
import { Status } from '../../api/games/status.js';

UserStatus.events.on('connectionLogout', function (fields) {
  const game = Games.findOne({
    $and: [
      { status: { $lt: Status.FINISHED } },
      { $or: [{ player1: fields.userId }, { player2: fields.userId }] },
    ],
  });

  if (game === undefined) {
    throw new Meteor.Error('game-not-found');
  }

  if (game.status === Status.OPEN) {
    Games.update({ _id: game._id }, { $set: { status: Status.CANCELED } });
  } else {
    const otherPlayer = game.player1 === fields.userId ? game.player2 : game.player1;

    Games.update(
      { _id: game._id },
      { $set: { status: Status.DISCONNECTED, currentPlayer: otherPlayer } },
    );
  }
});
