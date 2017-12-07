import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { Games } from '../../../api/games/games.js';
import { Status } from '../../../api/games/status.js';

import './board.html';

Template.board.onCreated(() => {
  Meteor.subscribe('games.my');
});

Template.board.helpers({
  size: () => new Array(15).fill(0),
  cellData: (row, col) => {
    const cell = {};
    const game = Games.findOne({ _id: Session.get('gameId') });

    if (game && game.status > Status.OPEN) {
      for (let i = 0; i < game.moves.length; i++) {
        const move = game.moves[i];

        if (move.row === row && move.col === col) {
          cell.class = 'occupied';

          // move with even index is p1's
          if (i % 2 === 0) {
            cell.text = 'X';
            cell.class += ' occupied-x';
          } else {
            cell.text = 'O';
            cell.class += ' occupied-o';
          }

          // highlight last move
          if (i === game.moves.length - 1) {
            cell.class += ' last-move';
          }

          return cell;
        }
      }

      if ((game.status === Status.STARTED || game.status === Status.SWAP2) &&
          game.currentPlayer === Meteor.userId()) {
        cell.class = 'selectable';

        if (isHint(row, col)) {
          cell.class += ' hint';
        }

        return cell;
      }
    }

    return cell;
  },
});

Template.board.events({
  'click .cell.selectable'(event) {
    const targetId = event.target.id;
    const position = targetId.split('-');

    Meteor.call('games.move', Session.get('gameId'), +position[0], +position[1]);
    Session.set('hint', undefined);
  },
});

function isHint(row, col) {
  const hint = Session.get('hint');
  return hint && row === hint.row && col === hint.col;
}
