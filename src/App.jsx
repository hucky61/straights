import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Undo,
  Redo,
  CheckCircle2,
  HelpCircle,
  Pencil,
  Trash2,
  BookOpen,
  Sparkles,
  Clock,
  Grid,
  Info,
  Download,
  Menu,
  X
} from 'lucide-react';
import Str8tsBoard from './components/Str8tsBoard';
import ImportModal from './components/ImportModal';
import { solveStr8ts, validateBoard, getCellCompartments } from './utils/str8tsSolver';

const createEmptyBoard = (size = 9) => {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      type: 'white',
      value: null,
      pencilMarks: [],
      isGiven: false,
      isSolved: false,
      error: false
    }))
  );
};

export default function App() {
  // Saved / Imported Puzzles in localStorage
  const [savedPuzzles, setSavedPuzzles] = useState(() => {
    try {
      const saved = localStorage.getItem('str8ts_saved_puzzles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Selected Puzzle and Board Size
  const [selectedPuzzleId, setSelectedPuzzleId] = useState(() => {
    try {
      const saved = localStorage.getItem('str8ts_saved_puzzles');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : '';
    } catch (e) {
      return '';
    }
  });
  const [boardSize, setBoardSize] = useState(9); // 9 or 6

  // Game States
  const [board, setBoard] = useState(() => {
    try {
      const saved = localStorage.getItem('str8ts_saved_puzzles');
      const parsed = saved ? JSON.parse(saved) : [];
      if (parsed.length > 0 && parsed[0].board) {
        return parsed[0].board.map(row => row.map(c => ({ ...c, pencilMarks: [] })));
      }
    } catch (e) { }
    return createEmptyBoard(9);
  });
  const [selectedCell, setSelectedCell] = useState(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [gameMode, setGameMode] = useState('play'); // 'play' or 'edit'

  // Undo/Redo History
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Timer States
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Checking States
  const [errors, setErrors] = useState([]);
  const [checked, setChecked] = useState(false);
  const [gameSolved, setGameSolved] = useState(false);

  // Modal & Navigation States
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync saved puzzles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('str8ts_saved_puzzles', JSON.stringify(savedPuzzles));
    } catch (e) {
      console.error('Fehler beim Speichern in localStorage', e);
    }
  }, [savedPuzzles]);

  // Load selected puzzle (only from saved imported puzzles)
  const loadPuzzle = (puzzleId) => {
    if (!puzzleId) {
      setBoard(createEmptyBoard(boardSize));
      setSelectedCell(null);
      setHistory([]);
      setFuture([]);
      setErrors([]);
      setChecked(false);
      setGameSolved(false);
      setTimer(0);
      setTimerActive(false);
      return;
    }

    const savedPuz = savedPuzzles.find(p => p.id === puzzleId);
    if (savedPuz) {
      setBoardSize(savedPuz.size);
      const initialBoard = savedPuz.board.map(row =>
        row.map(cell => ({
          ...cell,
          value: cell.isGiven ? cell.value : null,
          pencilMarks: [],
          isSolved: false,
          error: false
        }))
      );
      setBoard(initialBoard);
      setSelectedCell(null);
      setHistory([]);
      setFuture([]);
      setErrors([]);
      setChecked(false);
      setGameSolved(false);
      setTimer(0);
      setTimerActive(gameMode === 'play');
    }
  };

  // Initial load
  useEffect(() => {
    if (selectedPuzzleId) {
      loadPuzzle(selectedPuzzleId);
    }
  }, [selectedPuzzleId]);

  // Handle successful import
  const handleImportSuccess = ({ board: importedBoard, size, metadata }) => {
    const puzzleName = metadata?.name || 'Importiertes Rätsel';
    const puzzleDiff = metadata?.difficulty || 'Mittel';

    // Check if puzzle already exists by name and size
    const existingIndex = savedPuzzles.findIndex(p => p.name === puzzleName && p.size === size);
    const puzzleId = existingIndex >= 0 ? savedPuzzles[existingIndex].id : `imported-${Date.now()}`;

    const newSavedPuzzle = {
      id: puzzleId,
      name: puzzleName,
      difficulty: puzzleDiff,
      size,
      board: importedBoard.map(row => row.map(cell => ({
        type: cell.type,
        value: cell.value,
        isGiven: cell.isGiven,
        pencilMarks: [],
        isSolved: false,
        error: false
      }))),
      savedAt: new Date().toISOString()
    };

    setSavedPuzzles(prev => {
      const idx = prev.findIndex(p => p.name === puzzleName && p.size === size);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSavedPuzzle;
        return copy;
      }
      return [newSavedPuzzle, ...prev];
    });

    setBoardSize(size);
    setBoard(importedBoard);
    setSelectedPuzzleId(puzzleId);
    setSelectedCell(null);
    setHistory([]);
    setFuture([]);
    setErrors([]);
    setChecked(false);
    setGameSolved(false);
    setGameMode('play');
    setTimer(0);
    setTimerActive(true);
  };

  // Handle Game Mode change (Play vs Edit)
  const handleGameModeChange = (mode) => {
    setGameMode(mode);
    setSelectedCell(null);
    setErrors([]);
    setChecked(false);

    if (mode === 'edit') {
      setTimerActive(false);
      // Turn all white solved cells into normal empty cells for editing, or keep board
      const newBoard = board.map(row =>
        row.map(cell => ({
          ...cell,
          isSolved: false,
          // If playing a builtin, convert user input to clues, or just empty the board?
          // Let's keep the board but let the user toggle white/black and change values.
        }))
      );
      setBoard(newBoard);
    } else {
      // Re-initialize timer or set active
      setTimerActive(true);
      // Ensure all clues have isGiven: true
      const newBoard = board.map(row =>
        row.map(cell => ({
          ...cell,
          isGiven: cell.value !== null && cell.type === 'white' ? true : cell.isGiven,
          isSolved: false,
          pencilMarks: []
        }))
      );
      setBoard(newBoard);
    }
  };

  // Timer Interval
  useEffect(() => {
    let interval = null;
    if (timerActive && gameMode === 'play' && !gameSolved) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameMode, gameSolved]);

  // Format timer values
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Save current board state to history
  const pushToHistory = (newBoard) => {
    setHistory(prev => [...prev.slice(-49), board.map(row => row.map(cell => ({ ...cell })))]);
    setFuture([]);
    setBoard(newBoard);
  };

  // Undo / Redo Actions
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setFuture(prev => [board.map(row => row.map(cell => ({ ...cell }))), ...prev]);
    setBoard(previous);
    setErrors([]);
    setChecked(false);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setHistory(prev => [...prev, board.map(row => row.map(cell => ({ ...cell })))]);
    setBoard(next);
    setErrors([]);
    setChecked(false);
  };

  // Input value in selected cell
  const handleInput = (val) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const cell = board[r][c];

    // Play Mode restrictions
    if (gameMode === 'play') {
      if (cell.type === 'black' || cell.isGiven) return;

      const newBoard = board.map((row, ri) =>
        row.map((colCell, ci) => {
          if (ri === r && ci === c) {
            if (pencilMode) {
              // Pencil Mark Toggle
              const marks = colCell.pencilMarks || [];
              const newMarks = marks.includes(val)
                ? marks.filter(m => m !== val)
                : [...marks, val].sort();
              return { ...colCell, value: null, pencilMarks: newMarks, isSolved: false };
            } else {
              // Regular Value
              const newValue = colCell.value === val ? null : val;
              return { ...colCell, value: newValue, pencilMarks: [], isSolved: false };
            }
          }
          return colCell;
        })
      );
      pushToHistory(newBoard);
    }
    // Edit Mode controls (setting custom clues/values)
    else if (gameMode === 'edit') {
      const newBoard = board.map((row, ri) =>
        row.map((colCell, ci) => {
          if (ri === r && ci === c) {
            // Set value
            const newValue = colCell.value === val ? null : val;
            return {
              ...colCell,
              value: newValue,
              // If black cell, value acts as clue. If white cell, value also acts as given clue.
              isGiven: newValue !== null,
              pencilMarks: []
            };
          }
          return colCell;
        })
      );
      pushToHistory(newBoard);
    }

    // Clear errors when entering numbers
    setErrors([]);
    setChecked(false);
  };

  // Delete/Clear cell value
  const handleDelete = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const cell = board[r][c];

    if (gameMode === 'play' && (cell.type === 'black' || cell.isGiven)) return;

    const newBoard = board.map((row, ri) =>
      row.map((colCell, ci) => {
        if (ri === r && ci === c) {
          return {
            ...colCell,
            value: null,
            pencilMarks: [],
            isGiven: gameMode === 'edit' ? false : colCell.isGiven,
            isSolved: false
          };
        }
        return colCell;
      })
    );
    pushToHistory(newBoard);
    setErrors([]);
    setChecked(false);
  };

  // Toggle cell type in Edit Mode (White / Black)
  const toggleCellType = (type) => {
    if (gameMode !== 'edit' || !selectedCell) return;
    const { r, c } = selectedCell;

    const newBoard = board.map((row, ri) =>
      row.map((colCell, ci) => {
        if (ri === r && ci === c) {
          return {
            ...colCell,
            type,
            value: null, // Clear value when toggling type
            pencilMarks: [],
            isGiven: false,
            isSolved: false
          };
        }
        return colCell;
      })
    );
    pushToHistory(newBoard);
    setErrors([]);
    setChecked(false);
  };

  // Check / Validate board
  const handleCheck = () => {
    const boardErrors = validateBoard(board);
    setErrors(boardErrors);
    setChecked(true);

    if (boardErrors.length === 0) {
      // Check if completely filled
      let isFilled = true;
      for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
          if (board[r][c].type === 'white' && board[r][c].value === null) {
            isFilled = false;
            break;
          }
        }
      }

      if (isFilled && gameMode === 'play') {
        setGameSolved(true);
        setTimerActive(false);
      }
    }
  };

  // Auto-Solve using Backtracking Solver
  const handleSolve = () => {
    // If in Edit Mode, prepare the clues by copying board values
    const preparedBoard = board.map(row =>
      row.map(cell => ({
        ...cell,
        // Ensure values entered in Edit mode are preserved as starting clues
        isGiven: cell.value !== null,
        isSolved: false
      }))
    );

    const solvedBoard = solveStr8ts(preparedBoard);
    if (solvedBoard) {
      pushToHistory(solvedBoard);
      setErrors([]);
      setChecked(true);

      // If we solve it in Play mode, check if solved
      if (gameMode === 'play') {
        // Find if anything was actually filled
        let filledSomething = false;
        for (let r = 0; r < boardSize; r++) {
          for (let c = 0; c < boardSize; c++) {
            if (board[r][c].value !== solvedBoard[r][c].value) {
              filledSomething = true;
              break;
            }
          }
        }
        if (filledSomething) {
          setGameSolved(true);
          setTimerActive(false);
        }
      }
    } else {
      alert("Dieses Rätsel hat keine gültige Lösung. Bitte überprüfe die Ziffern und die schwarzen Quadrate!");
    }
  };

  // Get Hint (Fills one cell with the correct solver value)
  const handleHint = () => {
    if (gameSolved) return;

    // Prepare board
    const preparedBoard = board.map(row =>
      row.map(cell => ({
        ...cell,
        isGiven: cell.isGiven || (cell.type === 'white' && cell.value !== null && !cell.isSolved),
        isSolved: false
      }))
    );

    const solvedBoard = solveStr8ts(preparedBoard);
    if (!solvedBoard) {
      alert("Es kann kein Tipp gegeben werden, da das aktuelle Board keine Lösung zulässt. Lösche fehlerhafte Felder!");
      return;
    }

    // Find first empty cell (or cell with incorrect value) in the solved board
    const hintCandidates = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].type === 'white') {
          // If empty, or filled with a wrong value
          if (board[r][c].value === null || board[r][c].value !== solvedBoard[r][c].value) {
            hintCandidates.push({ r, c, val: solvedBoard[r][c].value });
          }
        }
      }
    }

    if (hintCandidates.length > 0) {
      // Pick a random candidate cell
      const randomHint = hintCandidates[Math.floor(Math.random() * hintCandidates.length)];
      const newBoard = board.map((row, ri) =>
        row.map((colCell, ci) => {
          if (ri === randomHint.r && ci === randomHint.c) {
            return {
              ...colCell,
              value: randomHint.val,
              pencilMarks: [],
              isSolved: true // Highlight as solved by Hint
            };
          }
          return colCell;
        })
      );

      pushToHistory(newBoard);
      setSelectedCell({ r: randomHint.r, c: randomHint.c });
      setErrors([]);
      setChecked(false);
    }
  };

  // Reset the Board (clear user entries)
  const handleReset = () => {
    if (window.confirm("Bist du sicher, dass du das Rätsel zurücksetzen möchtest? Dein Fortschritt geht verloren.")) {
      const resetBoard = board.map(row =>
        row.map(cell => ({
          ...cell,
          value: cell.isGiven ? cell.value : null,
          pencilMarks: [],
          isSolved: false,
          error: false
        }))
      );
      pushToHistory(resetBoard);
      setErrors([]);
      setChecked(false);
      setTimer(0);
      setTimerActive(gameMode === 'play');
    }
  };

  // Clear Board entirely (Only in Edit Mode)
  const handleClearAll = () => {
    if (window.confirm("Möchtest du das gesamte Spielfeld leeren? Alle schwarzen Felder und Zahlen werden gelöscht.")) {
      const clearedBoard = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => ({
          type: 'white',
          value: null,
          pencilMarks: [],
          isGiven: false,
          isSolved: false,
          error: false
        }))
      );
      pushToHistory(clearedBoard);
      setSelectedCell(null);
      setErrors([]);
      setChecked(false);
    }
  };

  // Keyboard navigation and input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showRulesModal || showImportModal || gameSolved) return;

      // Arrow navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (!selectedCell) {
          setSelectedCell({ r: 0, c: 0 });
          return;
        }

        let { r, c } = selectedCell;
        if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
        if (e.key === 'ArrowDown') r = Math.min(boardSize - 1, r + 1);
        if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (e.key === 'ArrowRight') c = Math.min(boardSize - 1, c + 1);
        setSelectedCell({ r, c });
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Input numbers 1 to 9 (or 1 to 6)
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= boardSize) {
        handleInput(num);
        return;
      }

      // Delete & Backspace
      if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
        return;
      }

      // Toggle pencil mode with 'n' or 'N'
      if (e.key.toLowerCase() === 'n') {
        setPencilMode(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board, pencilMode, gameMode, boardSize, showRulesModal, showImportModal, gameSolved, history, future]);

  // Delete current selected puzzle from saved library
  const handleDeleteCurrentPuzzle = () => {
    if (!selectedPuzzleId) return;
    const puzzleToDelete = savedPuzzles.find(p => p.id === selectedPuzzleId);
    if (!puzzleToDelete) return;

    if (window.confirm(`Möchtest du "${puzzleToDelete.name}" wirklich aus den gespeicherten Rätseln löschen?`)) {
      const remaining = savedPuzzles.filter(p => p.id !== selectedPuzzleId);
      setSavedPuzzles(remaining);
      if (remaining.length > 0) {
        setSelectedPuzzleId(remaining[0].id);
        loadPuzzle(remaining[0].id);
      } else {
        setSelectedPuzzleId('');
        setBoard(createEmptyBoard(boardSize));
        setSelectedCell(null);
        setTimer(0);
        setTimerActive(false);
      }
    }
  };

  const currentPuzzle = savedPuzzles.find(p => p.id === selectedPuzzleId) || null;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">S</div>
          <div>
            <h1 className="logo-text">Str8ts</h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Solver & Player App
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="btn-row desktop-nav">
          <button
            className={`btn ${gameMode === 'play' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleGameModeChange('play')}
          >
            Spielen
          </button>
          <button
            className={`btn ${gameMode === 'edit' ? 'btn-accent' : 'btn-secondary'}`}
            onClick={() => handleGameModeChange('edit')}
          >
            Edit
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportModal(true)}
            title="Str8ts Rätsel per URL oder Code importieren"
          >
            <Download size={18} color="var(--accent-cyan)" />
            Importieren
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowRulesModal(true)}
            title="Spielregeln anzeigen"
          >
            <BookOpen size={20} />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="mobile-menu-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <div className="logo-section">
                <div className="logo-icon small">S</div>
                <div>
                  <div className="mobile-menu-title">Str8ts Menü</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Navigation & Optionen</div>
                </div>
              </div>
              <button
                className="btn-icon mobile-menu-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Menü schließen"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-menu-items">
              <div className="mobile-menu-section-label">Spielmodus</div>
              <button
                className={`btn mobile-menu-btn ${gameMode === 'play' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  handleGameModeChange('play');
                  setMobileMenuOpen(false);
                }}
              >
                <Play size={18} />
                <span>Spielen</span>
              </button>

              <button
                className={`btn mobile-menu-btn ${gameMode === 'edit' ? 'btn-accent' : 'btn-secondary'}`}
                onClick={() => {
                  handleGameModeChange('edit');
                  setMobileMenuOpen(false);
                }}
              >
                <Sparkles size={18} />
                <span>Edit</span>
              </button>

              <div className="mobile-menu-section-label" style={{ marginTop: '0.75rem' }}>Aktionen & Hilfe</div>
              <button
                className="btn btn-secondary mobile-menu-btn"
                onClick={() => {
                  setShowImportModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                <Download size={18} color="var(--accent-cyan)" />
                <span>Rätsel importieren</span>
              </button>

              <button
                className="btn btn-secondary mobile-menu-btn"
                onClick={() => {
                  setShowRulesModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                <BookOpen size={18} />
                <span>Spielregeln anzeigen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Banner */}
      {gameMode === 'edit' && (
        <div className="edit-mode-banner">
          <div className="edit-mode-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="edit-mode-title">Editor-Modus Aktiv</div>
            <div className="edit-mode-desc">
              Tippe auf Felder, um sie schwarz/weiß zu machen. Gib Ziffern ein, um feste Rätsel-Vorgaben zu erstellen. Klicke dann auf "Automatisch Lösen"!
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="game-workspace">

        {/* Left Side: Game Board */}
        <div className="glass-panel board-section">
          {gameMode === 'play' && (
            <div className="board-status-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700 }}>{currentPuzzle?.name || 'Kein Rätsel geladen'}</span>
                {currentPuzzle?.difficulty && (
                  <span className={`difficulty-badge ${currentPuzzle.difficulty.toLowerCase()}`}>
                    {currentPuzzle.difficulty}
                  </span>
                )}
              </div>
              <div className="timer">
                <Clock size={16} />
                <span>{formatTime(timer)}</span>
              </div>
            </div>
          )}

          <Str8tsBoard
            board={board}
            selectedCell={selectedCell}
            onSelectCell={(r, c) => setSelectedCell({ r, c })}
            errors={errors}
            size={boardSize}
          />

          {/* Quick Action buttons under the board */}
          <div className="btn-row" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-icon" onClick={handleUndo} disabled={history.length === 0} title="Rückgängig (Ctrl+Z)">
              <Undo size={18} />
            </button>
            <button className="btn btn-secondary btn-icon" onClick={handleRedo} disabled={future.length === 0} title="Wiederholen (Ctrl+Y)">
              <Redo size={18} />
            </button>
            <button className="btn btn-secondary btn-icon" onClick={handleReset} title="Zurücksetzen">
              <RotateCcw size={18} />
            </button>

            <div style={{ width: '2px', height: '24px', background: 'var(--glass-border)', margin: '0 4px' }} />

            <button className="btn btn-outline-glow" onClick={handleHint} title="Tipp erhalten">
              <HelpCircle size={18} />
              Tipp
            </button>
            <button className="btn btn-secondary" onClick={handleCheck} title="Fehler überprüfen">
              <CheckCircle2 size={18} color="var(--accent-cyan)" />
              Prüfen
            </button>
            <button className="btn btn-primary" onClick={handleSolve} title="Automatisch lösen">
              <Play size={18} />
              Lösen
            </button>
          </div>
        </div>

        {/* Right Side: Control Panels */}
        <div className="sidebar-panel">

          {/* Interactive Numpad & Controls */}
          <div className="glass-panel numpad-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span className="label-text">Zahleneingabe</span>
              {gameMode === 'play' && (
                <button
                  className={`btn pencil-mode-btn ${pencilMode ? 'active' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                  onClick={() => setPencilMode(!pencilMode)}
                >
                  <Pencil size={12} style={{ marginRight: '4px' }} />
                  Notizen (N)
                </button>
              )}
            </div>

            <div className="numpad-grid">
              {Array.from({ length: boardSize }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  className="numpad-btn"
                  onClick={() => handleInput(num)}
                  disabled={!selectedCell}
                >
                  {num}
                </button>
              ))}
              {/* Fill remaining slots to maintain nice 3x3 layout if size is 9, or add space */}
              {boardSize === 9 ? (
                <>
                  <div />
                  <button className="numpad-btn numpad-erase" onClick={handleDelete} disabled={!selectedCell} title="Feld leeren">
                    <Trash2 size={20} />
                  </button>
                  <div />
                </>
              ) : (
                <>
                  <div />
                  <button className="numpad-btn numpad-erase" onClick={handleDelete} disabled={!selectedCell} title="Feld leeren">
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Saved Puzzles Selector (Only in Play mode) */}
          {gameMode === 'play' && (
            <div className="glass-panel">
              <h2 className="panel-title">
                <Grid size={18} color="var(--accent-cyan)" />
                Rätsel wählen
              </h2>
              <div className="control-group">
                <label className="label-text">Verfügbare Rätsel ({savedPuzzles.length})</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    className="select-control"
                    style={{ flex: 1 }}
                    value={selectedPuzzleId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedPuzzleId(newId);
                      loadPuzzle(newId);
                    }}
                  >
                    {savedPuzzles.length === 0 ? (
                      <option value="" disabled>Keine Rätsel geladen (Importieren nutzen)</option>
                    ) : (
                      savedPuzzles.map(p => (
                        <option key={p.id} value={p.id}>
                          📥 {p.name} ({p.size}x{p.size}) - {p.difficulty}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedPuzzleId && savedPuzzles.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      onClick={handleDeleteCurrentPuzzle}
                      title="Ausgewähltes Rätsel löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Mode Helpers (Only in Edit mode) */}
          {gameMode === 'edit' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className="panel-title">
                <Grid size={18} color="var(--accent-purple)" />
                Editor-Einstellungen
              </h2>

              <div className="control-group">
                <label className="label-text">Spielfeldgröße</label>
                <div className="btn-grid">
                  <button
                    className={`btn ${boardSize === 9 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setBoardSize(9);
                      const emptyBoard = Array.from({ length: 9 }, () =>
                        Array.from({ length: 9 }, () => ({
                          type: 'white', value: null, pencilMarks: [], isGiven: false, isSolved: false, error: false
                        }))
                      );
                      setBoard(emptyBoard);
                      setSelectedCell(null);
                      setHistory([]);
                      setFuture([]);
                    }}
                  >
                    Standard 9x9
                  </button>
                  <button
                    className={`btn ${boardSize === 6 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setBoardSize(6);
                      const emptyBoard = Array.from({ length: 6 }, () =>
                        Array.from({ length: 6 }, () => ({
                          type: 'white', value: null, pencilMarks: [], isGiven: false, isSolved: false, error: false
                        }))
                      );
                      setBoard(emptyBoard);
                      setSelectedCell(null);
                      setHistory([]);
                      setFuture([]);
                    }}
                  >
                    Mini 6x6
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label className="label-text">Feldtyp anpassen</label>
                <div className="edit-cell-toggles">
                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleCellType('white')}
                    disabled={!selectedCell}
                  >
                    Weiß (Spieler)
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleCellType('black')}
                    disabled={!selectedCell}
                    style={{ background: '#0b0f19', borderColor: '#374151' }}
                  >
                    Schwarz (Wand)
                  </button>
                </div>
              </div>

              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={16} />
                Spielfeld leeren
              </button>
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          <div className="glass-panel keyboard-hints">
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} color="var(--accent-cyan)" />
              Steuerung & Shortcuts:
            </div>
            • <b>Klick</b> oder <b>Pfeiltasten</b> zum Auswählen von Feldern.<br />
            • Ziffern <b>1–{boardSize}</b> geben Werte ein.<br />
            • <b>N</b> schaltet Notiz-Modus um (nur beim Spielen).<br />
            • <b>Backspace / Entf</b> löscht Ziffern.<br />
            • <b>Ctrl + Z / Y</b> für Undo und Redo.
          </div>

        </div>

      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Rules Modal Overlay */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowRulesModal(false)}>
              &times;
            </button>
            <h2 className="modal-title">Spielregeln für Str8ts (Straights)</h2>
            <div className="modal-body">
              <p>
                Str8ts ist ein logisches Zahlenrätsel. Die Regeln sind einfach, aber das Lösen erfordert kluges Kombinieren.
              </p>

              <div className="rules-list">
                <div className="rule-item">
                  <div className="rule-title">
                    <span className="rule-number">1.</span> Sudoku-Regel
                  </div>
                  In jeder Zeile und jeder Spalte darf jede Ziffer (1 bis 9) maximal einmal vorkommen. Dies gilt sowohl für weiße als auch für schwarze Felder!
                </div>

                <div className="rule-item">
                  <div className="rule-title">
                    <span className="rule-number">2.</span> Schwarze Felder
                  </div>
                  Schwarze Quadrate teilen Zeilen und Spalten in kleinere Abschnitte (sogenannte <b>Straßen</b> oder Compartments). Schwarze Felder können leer sein oder eine Zahl enthalten. Sie gehören nicht zu den Straßen.
                </div>

                <div className="rule-item">
                  <div className="rule-title">
                    <span className="rule-number">3.</span> Straßen (Straights)
                  </div>
                  Jede zusammenhängende Kette von weißen Feldern in einer Reihe oder Spalte bildet eine Straße. Sie muss mit aufeinanderfolgenden Ziffern gefüllt werden.
                  <br />
                  <span style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
                    * Wichtig: Die Zahlen müssen NICHT in der richtigen Reihenfolge stehen (z.B. ist 4-2-3 eine gültige Straße für 3 Felder). Es dürfen nur keine Lücken entstehen!
                  </span>
                </div>

                <div className="rule-item">
                  <div className="rule-title">
                    <span className="rule-number">4.</span> Keine Ziffern-Wiederholung
                  </div>
                  Da Straßen in einer einzigen Zeile/Spalte liegen, darf sich logischerweise keine Ziffer innerhalb einer Straße wiederholen.
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={() => setShowRulesModal(false)}>
                  Alles klar!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Solved Modal Overlay */}
      {gameSolved && (
        <div className="modal-overlay">
          <div className="modal-content text-center">
            <div className="celebration-icon">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="celebration-title">Gelöst!</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              Herzlichen Glückwunsch! Du hast das Str8ts Rätsel erfolgreich gelöst.
            </p>

            {gameMode === 'play' && (
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-val">{formatTime(timer)}</div>
                  <div className="stat-lbl">Zeit</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">{currentPuzzle?.difficulty}</div>
                  <div className="stat-lbl">Schwierigkeit</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              {savedPuzzles.length > 1 && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setGameSolved(false);
                    const idx = savedPuzzles.findIndex(p => p.id === selectedPuzzleId);
                    const nextIdx = (idx + 1) % savedPuzzles.length;
                    const nextId = savedPuzzles[nextIdx].id;
                    setSelectedPuzzleId(nextId);
                    loadPuzzle(nextId);
                  }}
                >
                  Nächstes Rätsel
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  setGameSolved(false);
                  loadPuzzle(selectedPuzzleId);
                }}
              >
                Nochmal spielen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
