import { solveStr8ts } from './utils/str8tsSolver.js';
import { parsePuzzleGrid } from './utils/puzzles.js';

console.log("Testing new Mini Medium #2 puzzle (empty black cells):");

const grid = [
  ['b', 'w1', 'w',  'b',  'w',  'w' ],
  ['w1', 'w',  'b',  'w',  'w',  'b' ],
  ['w',  'b',  'w5', 'w',  'b',  'w' ],
  ['w',  'b',  'w',  'w5', 'b',  'w' ],
  ['w',  'w',  'b',  'w',  'w1', 'b' ],
  ['w',  'w4', 'b',  'w',  'w',  'b' ]
];

const board = parsePuzzleGrid(grid, 6);
const solved = solveStr8ts(board);
console.log("Solved:", solved !== null);

if (solved) {
  for (let r = 0; r < 6; r++) {
    console.log(solved[r].map(c => c.type === 'black' ? `B${c.value ?? ''}` : c.value).join(' '));
  }
}
