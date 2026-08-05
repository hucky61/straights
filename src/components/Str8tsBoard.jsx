import React from 'react';
import { getCellCompartments } from '../utils/str8tsSolver';

export default function Str8tsBoard({
  board,
  selectedCell,
  onSelectCell,
  errors = [],
  size = 9,
}) {
  // Pre-calculate compartments for the selected cell if one exists
  let hCompCells = [];
  let vCompCells = [];
  if (selectedCell) {
    const { hComp, vComp } = getCellCompartments(board, selectedCell.r, selectedCell.c);
    if (hComp) hCompCells = hComp;
    if (vComp) vCompCells = vComp;
  }

  // Check if a cell is in the selected cell's horizontal/vertical compartment
  const isInSelectedCompartment = (r, c) => {
    return (
      hCompCells.some(cell => cell.r === r && cell.c === c) ||
      vCompCells.some(cell => cell.r === r && cell.c === c)
    );
  };

  // Check if a cell is in the same row/column as selected
  const isInSelectedRowCol = (r, c) => {
    if (!selectedCell) return false;
    return (r === selectedCell.r || c === selectedCell.c) && !(r === selectedCell.r && c === selectedCell.c);
  };

  // Check if a cell is the selected one
  const isSelected = (r, c) => {
    if (!selectedCell) return false;
    return r === selectedCell.r && c === selectedCell.c;
  };

  // Check if a cell has an error
  const hasError = (r, c) => {
    return errors.some(err => err.r === r && err.c === c);
  };

  // Helper to render pencil marks in a 3x3 layout (or 2x3 for 6x6 grid)
  const renderPencilMarks = (cell) => {
    const marks = cell.pencilMarks || [];
    const maxVal = size;
    
    // Create an array of candidate values to display
    const items = [];
    for (let i = 1; i <= maxVal; i++) {
      items.push(
        <div key={i} className="pencil-mark">
          {marks.includes(i) ? i : ''}
        </div>
      );
    }
    
    return <div className="pencil-grid">{items}</div>;
  };

  return (
    <div className="board-container">
      <div className={`str8ts-grid grid-${size}x${size}`}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const selected = isSelected(r, c);
            const rowColHighlight = isInSelectedRowCol(r, c);
            const compHighlight = isInSelectedCompartment(r, c);
            const error = hasError(r, c);

            let cellClass = 'grid-cell';
            
            if (cell.type === 'black') {
              cellClass += ' cell-black';
            } else {
              cellClass += ' cell-white';
              if (cell.isGiven) cellClass += ' cell-given';
              else if (cell.isSolved) cellClass += ' cell-solved';
              
              if (selected) cellClass += ' cell-selected';
              else if (compHighlight) cellClass += ' highlight-compartment';
              else if (rowColHighlight) cellClass += ' highlight-rowcol';
              
              if (error) cellClass += ' cell-error';
            }

            return (
              <div
                key={`${r}-${c}`}
                className={cellClass}
                onClick={() => onSelectCell(r, c)}
              >
                {cell.type === 'black' ? (
                  cell.value !== null ? (
                    <div className="black-clue">{cell.value}</div>
                  ) : null
                ) : cell.value !== null ? (
                  cell.value
                ) : (
                  renderPencilMarks(cell)
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
