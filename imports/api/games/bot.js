function suggestMove(game) {
  let bestMove;

  const board = getBoard(game);
  const currentPlayer = game.currentPlayer === game.player1 ? 1 : 2;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board.length; col++) {
      if (board[row][col] === 0) { // ignore occupied cells
        // init bestMove with 1st free cell and default scores
        if (bestMove === undefined) {
          bestMove = [{ row, col }, 0, 0];
        }

        const cellScores = computeCellScores(board, row, col, currentPlayer);

        // cell with higher scores for both players are better
        const totalCellScore = cellScores[0] + cellScores[1];
        const totalBestScore = bestMove[1] + bestMove[2];

        if (totalCellScore > totalBestScore ||
            // same score but cell has better score for current player than current best move
            (totalCellScore === totalBestScore
                && cellScores[currentPlayer - 1] > bestMove[currentPlayer])) {
          bestMove = [{ row, col }, cellScores[0], cellScores[1]];
        }
      }
    }
  }

  return bestMove[0];
}

function getBoard(game) {
  const board = new Array(15);

  for (let row = 0; row < board.length; row++) {
    board[row] = new Array(15).fill(0);
  }

  game.moves.forEach((move, i) => {
    // p1 always makes 1st move (index 0)
    if (i % 2 === 0) {
      // even moves belong to p1
      board[move.row][move.col] = 1;
    } else {
      board[move.row][move.col] = 2;
    }
  });

  return board;
}

function isWinningMove(game, row, col) {
  if (game.moves.length < 9) {
    // game cannot be won before 9th move
    return false;
  }

  const board = getBoard(game);
  const currentPlayer = game.currentPlayer === game.player1 ? 1 : 2;
  const scores = computeCellScores(board, row, col, currentPlayer);

  // console.log({ currentPlayer, row, col, scores, score: scores[currentPlayer - 1] });
  return scores[currentPlayer - 1] >= 128;
}

function computeCellScores(board, row, col, currentPlayer) {
  // cell's total scores for p1 and p2, default to 0's
  const cellScore = [0, 0];

  // compute cell's score in 4 directions
  const directionScores = [
    computeDirectionScores(board, row, col, 0, 1, currentPlayer),  // horizontal
    computeDirectionScores(board, row, col, 1, 0, currentPlayer),  // vertical
    computeDirectionScores(board, row, col, 1, 1, currentPlayer),  // diagonal (\)
    computeDirectionScores(board, row, col, -1, 1, currentPlayer), // diagonal (/)
  ];

  // cell's total scores are sum of all direction scores
  directionScores.forEach((directionScore) => {
    cellScore[0] += directionScore[0];
    cellScore[1] += directionScore[1];
  });

  return cellScore;
}

function computeDirectionScores(board, row, col, rowDelta, colDelta, currentPlayer) {
  const directionScores = [0, 0];

  // default offset is 5 cells from the move so that overlines can be detected
  const offset = 5;

  for (let i = 0; i < offset; i++) {
    const sequence = [];

    // ↓    ↓
    // --XXXCXXO--
    // [--XXXCX, -XXXCXX, XXXCXXO, XXCXXO-, XCXXO--]
    for (let j = 0; j < 7; j++) {
      const currentOffset = offset - i - j;
      const currentRow = row - (currentOffset * rowDelta);
      const currentCol = col - (currentOffset * colDelta);

      let currentType;
      if (isValidPosition(currentRow, currentCol)) {
        currentType = board[currentRow][currentCol];
      } else {
        currentType = undefined;
      }

      sequence.push({ row: currentRow, col: currentCol, type: currentType });
    }

    const sequenceUnique = [...new Set(sequence.map(cell => cell.type))];
    const sequenceEmpty = sequenceUnique.length === 1 && sequenceUnique[0] === 0;

    if (!sequenceEmpty) {
      [1, 2].forEach((type) => {
        let sequenceScores = computeSequenceScores(sequence, row, col, type);

        // quadruple scores if current player can win with this sequence
        if (sequenceScores === 128 && currentPlayer === type) {
          sequenceScores = 512;
        }

        updateDirectionScores(directionScores, sequenceScores, type - 1);
      });
    }
  }

  return directionScores;
}

function updateDirectionScores(directionScores, sequenceScores, idx) {
  // if sequence contains overline
  if (sequenceScores < 0) {
    // then negative score for direction
    directionScores[idx] = -1;
  }

  if (directionScores[idx] >= 0) { // direction doesn't have overline
    directionScores[idx] = Math.max(directionScores[idx], sequenceScores);
  }
}

// predefined scores
// scores for a sequence is scores[i][j]
// - more consecutive/total cells of same type (X/O) means bigger i
// - more open ends of consecutive cells formed by the sequence means bigger j
// 5 consecutive cells has max score (128), regardless of number of open ends
// 1 cell, blocked on the front and/or back, has min score (0)
// overline has negative score (-1)
const scores = [[0, 1], [2, 4], [8, 32], [24, 64], [128, 128]];

function computeSequenceScores(sequence, row, col, type) {
  const cell = sequence.find(c => c.row === row && c.col === col);

  // assume that this empty cell is played by a player
  cell.type = type;

  const totalCells = getTotalCellsOfType(sequence, type);
  let consecutiveCells = 0;
  let openEnds = 0;

  for (let k = sequence.indexOf(cell) - 1; k >= 0; k--) {
    if (sequence[k].type === type) {
      consecutiveCells += 1;
    } else {
      if (sequence[k].type === 0) {
        openEnds += 1;
      }

      break;
    }
  }

  for (let k = sequence.indexOf(cell); k < sequence.length; k++) {
    if (sequence[k].type === type) {
      consecutiveCells += 1;
    } else {
      if (sequence[k].type === 0) {
        openEnds += 1;
      }

      break;
    }
  }

  // overline causes negative score
  if (consecutiveCells > 5) {
    return -1;
  }

  // reset cell
  cell.type = 0;

  const scoreIdx0 = Math.max(consecutiveCells, totalCells) - 1;
  const scoreIdx1 = (consecutiveCells >= totalCells && openEnds > 0) ? openEnds - 1 : 0;

  return scores[scoreIdx0][scoreIdx1];
}

function getTotalCellsOfType(sequence, type) {
  let totalCells = 0;

  // don't take into account both ends
  for (let i = 1; i < 6; i++) {
    if (sequence[i].type === type) {
      totalCells += 1;
    }
  }

  return totalCells;
}

function isValidPosition(row, col) {
  return row >= 0 && row < 15 && col >= 0 && col < 15;
}

export { suggestMove, isValidPosition, isWinningMove };
