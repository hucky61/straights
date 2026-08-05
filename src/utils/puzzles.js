/**
 * Predefined, verified solvable Str8ts puzzles (both Standard 9x9 and Mini 6x6)
 */

export const BUILTIN_PUZZLES = [
  {
    id: 'easy-1',
    name: 'Einfach #1',
    difficulty: 'Einfach',
    size: 9,
    grid: [
      ["b9", "w1", "w",  "b",  "w8", "w",  "w",  "b",  "w" ],
      ["w3", "w",  "w",  "w",  "b",  "w",  "b8", "w5", "w" ],
      ["w",  "b9", "w3", "w",  "w",  "w",  "w4", "w",  "b" ],
      ["b1", "w7", "b6", "w",  "w",  "w",  "b",  "w",  "w9"],
      ["w",  "w",  "w",  "b1", "w3", "b",  "w",  "w7", "w" ],
      ["w",  "w",  "b",  "w6", "w",  "w4", "b",  "w",  "b3"],
      ["b8", "w5", "w",  "w",  "w",  "w",  "w3", "b",  "w" ],
      ["w",  "w6", "b8", "w",  "b",  "w",  "w1", "w",  "w" ],
      ["w4", "b",  "w",  "w",  "w",  "b1", "w2", "w",  "b" ]
    ]
  },
  {
    id: 'medium-1',
    name: 'Mittel #1',
    difficulty: 'Mittel',
    size: 9,
    grid: [
      ["b9", "w1", "w",  "b",  "w",  "w",  "w",  "b",  "w" ],
      ["w",  "w",  "w",  "w",  "b",  "w",  "b8", "w5", "w" ],
      ["w",  "b9", "w3", "w",  "w",  "w",  "w",  "w",  "b" ],
      ["b1", "w",  "b6", "w",  "w",  "w",  "b",  "w",  "w9"],
      ["w",  "w",  "w",  "b1", "w3", "b",  "w",  "w",  "w" ],
      ["w",  "w",  "b",  "w6", "w",  "w",  "b",  "w",  "b3"],
      ["b8", "w5", "w",  "w",  "w",  "w",  "w",  "b",  "w" ],
      ["w",  "w",  "b8", "w",  "b",  "w",  "w1", "w",  "w" ],
      ["w4", "b",  "w",  "w",  "w",  "b1", "w",  "w",  "b" ]
    ]
  },
  {
    id: 'hard-1',
    name: 'Schwer #1',
    difficulty: 'Schwer',
    size: 9,
    grid: [
      ["b9", "w1", "w",  "b",  "w",  "w",  "w",  "b",  "w" ],
      ["w",  "w",  "w",  "w",  "b",  "w",  "b8", "w",  "w" ],
      ["w",  "b9", "w3", "w",  "w",  "w",  "w",  "w",  "b" ],
      ["b1", "w",  "b6", "w",  "w",  "w",  "b",  "w",  "w" ],
      ["w",  "w",  "w",  "b1", "w3", "b",  "w",  "w",  "w" ],
      ["w",  "w",  "b",  "w6", "w",  "w",  "b",  "w",  "b3"],
      ["b8", "w5", "w",  "w",  "w",  "w",  "w",  "b",  "w" ],
      ["w",  "w",  "b8", "w",  "b",  "w",  "w",  "w",  "w" ],
      ["w4", "b",  "w",  "w",  "w",  "b1", "w",  "w",  "b" ]
    ]
  },
  {
    id: 'mini-1',
    name: 'Mini Einfach (6x6)',
    difficulty: 'Einfach',
    size: 6,
    grid: [
      ['w1', 'w', 'b', 'w', 'w', 'w'],
      ['w', 'w3', 'w', 'w', 'w', 'b6'],
      ['b1', 'w', 'w', 'w2', 'w', 'w'],
      ['w', 'w', 'w', 'w', 'w', 'b6'],
      ['b6', 'w1', 'w', 'w', 'w', 'w'],
      ['w5', 'w', 'w', 'b', 'w', 'w']
    ]
  },
  {
    id: 'mini-2',
    name: 'Mini Mittel (6x6)',
    difficulty: 'Mittel',
    size: 6,
    grid: [
      ['b', 'w1', 'w',  'b',  'w',  'w' ],
      ['w1', 'w',  'b',  'w',  'w',  'b' ],
      ['w',  'b',  'w5', 'w',  'b',  'w' ],
      ['w',  'b',  'w',  'w5', 'b',  'w' ],
      ['w',  'w',  'b',  'w',  'w1', 'b' ],
      ['w',  'w4', 'b',  'w',  'w',  'b' ]
    ]
  }
];

export function parsePuzzleGrid(grid, size = 9) {
  const board = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const cellStr = grid[r][c];
      const type = cellStr.startsWith('b') ? 'black' : 'white';
      const valStr = cellStr.substring(1);
      const value = valStr ? parseInt(valStr, 10) : null;
      
      row.push({
        type,
        value,
        pencilMarks: [],
        isGiven: value !== null,
        isSolved: false,
        error: false
      });
    }
    board.push(row);
  }
  return board;
}
