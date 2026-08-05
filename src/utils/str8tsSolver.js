/**
 * Str8ts Solver and Helper Logic
 */

// Helper to get all compartments for horizontal and vertical directions
export function getCompartments(board) {
  const horizontal = [];
  const vertical = [];
  const size = board.length;

  // Horizontal compartments
  for (let r = 0; r < size; r++) {
    let current = [];
    for (let c = 0; c < size; c++) {
      if (board[r][c].type === 'white') {
        current.push({ r, c });
      } else {
        if (current.length > 0) {
          horizontal.push(current);
          current = [];
        }
      }
    }
    if (current.length > 0) {
      horizontal.push(current);
    }
  }

  // Vertical compartments
  for (let c = 0; c < size; c++) {
    let current = [];
    for (let r = 0; r < size; r++) {
      if (board[r][c].type === 'white') {
        current.push({ r, c });
      } else {
        if (current.length > 0) {
          vertical.push(current);
          current = [];
        }
      }
    }
    if (current.length > 0) {
      vertical.push(current);
    }
  }

  return { horizontal, vertical };
}

// Find which compartments a cell belongs to
export function getCellCompartments(board, r, c, compartments = null) {
  const { horizontal, vertical } = compartments || getCompartments(board);
  const hComp = horizontal.find(comp => comp.some(cell => cell.r === r && cell.c === c)) || null;
  const vComp = vertical.find(comp => comp.some(cell => cell.r === r && cell.c === c)) || null;
  return { hComp, vComp };
}

/**
 * Checks if a partial list of values can form a straight of length L
 */
function isPartialStraightValid(values, L, size) {
  if (values.length === 0) return true;

  // Check for duplicates
  const unique = new Set(values);
  if (unique.size !== values.length) return false;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Spread of values cannot exceed the length of the compartment
  if (maxVal - minVal >= L) return false;

  // Must be able to fit a straight of length L within [1, size] containing minVal and maxVal
  const lowestStart = Math.max(1, maxVal - L + 1);
  const highestStart = Math.min(size + 1 - L, minVal);

  return lowestStart <= highestStart;
}

/**
 * Checks if a fully filled list of values is a straight of length L
 */
function isCompleteStraightValid(values, L) {
  if (values.length !== L) return false;
  const unique = new Set(values);
  if (unique.size !== L) return false;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  return maxVal - minVal + 1 === L;
}

/**
 * Checks if placing `val` at `(row, col)` violates any rules.
 * `board` is a 2D grid of cell objects.
 */
export function isValidMove(board, row, col, val, comps = null) {
  const size = board.length;

  // 1. Check Row Uniqueness
  for (let c = 0; c < size; c++) {
    if (c !== col && board[row][c].value === val) {
      return false;
    }
  }

  // 2. Check Column Uniqueness
  for (let r = 0; r < size; r++) {
    if (r !== row && board[r][col].value === val) {
      return false;
    }
  }

  // 3. Check Compartment Constraints
  const { hComp, vComp } = getCellCompartments(board, row, col, comps);

  if (hComp) {
    const hValues = [];
    let hFilledCount = 0;
    for (const cell of hComp) {
      const v = (cell.r === row && cell.c === col) ? val : board[cell.r][cell.c].value;
      if (v !== null) {
        hValues.push(v);
        hFilledCount++;
      }
    }
    const hLen = hComp.length;
    if (hFilledCount === hLen) {
      if (!isCompleteStraightValid(hValues, hLen)) return false;
    } else {
      if (!isPartialStraightValid(hValues, hLen, size)) return false;
    }
  }

  if (vComp) {
    const vValues = [];
    let vFilledCount = 0;
    for (const cell of vComp) {
      const v = (cell.r === row && cell.c === col) ? val : board[cell.r][cell.c].value;
      if (v !== null) {
        vValues.push(v);
        vFilledCount++;
      }
    }
    const vLen = vComp.length;
    if (vFilledCount === vLen) {
      if (!isCompleteStraightValid(vValues, vLen)) return false;
    } else {
      if (!isPartialStraightValid(vValues, vLen, size)) return false;
    }
  }

  return true;
}

/**
 * Solves a Str8ts board using backtracking with forward checking.
 * Modifies board in-place or returns a solved clone.
 */
export function solveStr8ts(board) {
  const size = board.length;
  // Pre-calculate compartments for efficiency during recursive solver
  const comps = getCompartments(board);

  // We need to clone the board to avoid messing up the UI during solve
  const boardClone = board.map(row => row.map(cell => ({ ...cell })));

  // Find empty white cells
  const emptyCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (boardClone[r][c].type === 'white' && boardClone[r][c].value === null) {
        emptyCells.push({ r, c });
      }
    }
  }

  // Sort empty cells by number of possible candidates (MRV - Minimum Remaining Values heuristic)
  // This makes the solver extremely fast.
  function getCandidatesCount(r, c) {
    let count = 0;
    for (let val = 1; val <= size; val++) {
      if (isValidMove(boardClone, r, c, val, comps)) {
        count++;
      }
    }
    return count;
  }

  // Backtracking function
  function backtrack(index) {
    if (index === emptyCells.length) {
      return true; // Solved!
    }

    // Dynamic sorting: Find the best cell to fill next (least candidates)
    let minCandidates = size + 1;
    let minIdx = index;
    for (let i = index; i < emptyCells.length; i++) {
      const count = getCandidatesCount(emptyCells[i].r, emptyCells[i].c);
      if (count < minCandidates) {
        minCandidates = count;
        minIdx = i;
      }
    }

    // Swap current cell with the one having minimum candidates
    const temp = emptyCells[index];
    emptyCells[index] = emptyCells[minIdx];
    emptyCells[minIdx] = temp;

    const { r, c } = emptyCells[index];

    for (let val = 1; val <= size; val++) {
      if (isValidMove(boardClone, r, c, val, comps)) {
        boardClone[r][c].value = val;
        boardClone[r][c].isSolved = true; // Mark as solved by the solver

        if (backtrack(index + 1)) {
          return true;
        }

        // Backtrack
        boardClone[r][c].value = null;
        boardClone[r][c].isSolved = false;
      }
    }

    return false; // No solution found for this branch
  }

  if (backtrack(0)) {
    return boardClone;
  }
  return null; // Unsolvable
}

/**
 * Full validation of a board.
 * Finds all conflict cells and returns a list of coordinates that have errors.
 */
export function validateBoard(board) {
  const errors = new Set();
  const comps = getCompartments(board);
  const size = board.length;

  // 1. Check Row & Column duplicates
  // Row checks
  for (let r = 0; r < size; r++) {
    const seen = {};
    for (let c = 0; c < size; c++) {
      const val = board[r][c].value;
      if (val !== null) {
        if (seen[val] !== undefined) {
          errors.add(`${r},${c}`);
          errors.add(`${r},${seen[val]}`);
        } else {
          seen[val] = c;
        }
      }
    }
  }

  // Column checks
  for (let c = 0; c < size; c++) {
    const seen = {};
    for (let r = 0; r < size; r++) {
      const val = board[r][c].value;
      if (val !== null) {
        if (seen[val] !== undefined) {
          errors.add(`${r},${c}`);
          errors.add(`${seen[val]},${c}`);
        } else {
          seen[val] = r;
        }
      }
    }
  }

  // 2. Check Compartments
  // Validate horizontal compartments
  for (const comp of comps.horizontal) {
    const values = [];
    const filledCells = [];
    for (const cell of comp) {
      const val = board[cell.r][cell.c].value;
      if (val !== null) {
        values.push(val);
        filledCells.push(cell);
      }
    }

    const L = comp.length;
    // For horizontal compartments, if fully filled, it MUST be a straight.
    // If partially filled, it must be valid so far.
    const isValid = (values.length === L) 
      ? isCompleteStraightValid(values, L) 
      : isPartialStraightValid(values, L, size);

    if (!isValid) {
      // Mark all filled cells in this compartment as errors
      for (const cell of filledCells) {
        errors.add(`${cell.r},${cell.c}`);
      }
    }
  }

  // Validate vertical compartments
  for (const comp of comps.vertical) {
    const values = [];
    const filledCells = [];
    for (const cell of comp) {
      const val = board[cell.r][cell.c].value;
      if (val !== null) {
        values.push(val);
        filledCells.push(cell);
      }
    }

    const L = comp.length;
    const isValid = (values.length === L) 
      ? isCompleteStraightValid(values, L) 
      : isPartialStraightValid(values, L, size);

    if (!isValid) {
      // Mark all filled cells in this compartment as errors
      for (const cell of filledCells) {
        errors.add(`${cell.r},${cell.c}`);
      }
    }
  }

  return Array.from(errors).map(s => {
    const [r, c] = s.split(',').map(Number);
    return { r, c };
  });
}
