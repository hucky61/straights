import React, { useState, useEffect } from 'react';
import {
  Play,
  BookOpen,
  Sparkles,
  Clock,
  Download,
  Menu,
  X
} from 'lucide-react';
import Str8tsBoard from './components/Str8tsBoard';
import ImportModal from './components/ImportModal';
import SavePuzzleModal from './components/SavePuzzleModal';
import PuzzleSelectorPanel from './components/PuzzleSelectorPanel';
import EditorSettingsPanel from './components/EditorSettingsPanel';
import ShortcutsPanel from './components/ShortcutsPanel';
import BoardControls from './components/BoardControls';
import RulesModal from './components/RulesModal';
import GameSolvedModal from './components/GameSolvedModal';
import { solveStr8ts, validateBoard } from './utils/str8tsSolver';

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
  const [showSaveModal, setShowSaveModal] = useState(false);
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

  // Handle saving an edited or custom puzzle
  const handleSavePuzzle = ({ name, difficulty, overwrite }) => {
    const puzzleId = (overwrite && selectedPuzzleId) ? selectedPuzzleId : `custom-${Date.now()}`;

    // White cells with user entered value become fixed starting clues (isGiven: true)
    // Black cells keep any clue value
    const puzzleBoard = board.map(row => row.map(cell => ({
      type: cell.type,
      value: cell.value,
      pencilMarks: [],
      isGiven: cell.value !== null,
      isSolved: false,
      error: false
    })));

    const newPuzzle = {
      id: puzzleId,
      name: name || 'Eigenes Rätsel',
      difficulty: difficulty || 'Mittel',
      size: boardSize,
      board: puzzleBoard,
      savedAt: new Date().toISOString()
    };

    setSavedPuzzles(prev => {
      const idx = prev.findIndex(p => p.id === puzzleId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newPuzzle;
        return copy;
      }
      return [newPuzzle, ...prev];
    });

    setSelectedPuzzleId(puzzleId);

    // Prepare playable board and switch directly to Play mode
    const playableBoard = puzzleBoard.map(row => row.map(cell => ({
      ...cell,
      value: cell.isGiven ? cell.value : null,
      pencilMarks: [],
      isSolved: false,
      error: false
    })));

    setBoard(playableBoard);
    setGameMode('play');
    setSelectedCell(null);
    setHistory([]);
    setFuture([]);
    setErrors([]);
    setChecked(false);
    setGameSolved(false);
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
      const newBoard = board.map(row =>
        row.map(cell => ({
          ...cell,
          isSolved: false
        }))
      );
      setBoard(newBoard);
    } else {
      setTimerActive(true);
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

    if (gameMode === 'play') {
      if (cell.type === 'black' || cell.isGiven) return;

      const newBoard = board.map((row, ri) =>
        row.map((colCell, ci) => {
          if (ri === r && ci === c) {
            if (pencilMode) {
              const marks = colCell.pencilMarks || [];
              const newMarks = marks.includes(val)
                ? marks.filter(m => m !== val)
                : [...marks, val].sort();
              return { ...colCell, value: null, pencilMarks: newMarks, isSolved: false };
            } else {
              const newValue = colCell.value === val ? null : val;
              return { ...colCell, value: newValue, pencilMarks: [], isSolved: false };
            }
          }
          return colCell;
        })
      );
      pushToHistory(newBoard);
    } else if (gameMode === 'edit') {
      const newBoard = board.map((row, ri) =>
        row.map((colCell, ci) => {
          if (ri === r && ci === c) {
            const newValue = colCell.value === val ? null : val;
            return {
              ...colCell,
              value: newValue,
              isGiven: newValue !== null,
              pencilMarks: []
            };
          }
          return colCell;
        })
      );
      pushToHistory(newBoard);
    }

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
            value: null,
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

  // Change board size in Edit Mode
  const handleChangeBoardSize = (newSize) => {
    setBoardSize(newSize);
    const emptyBoard = Array.from({ length: newSize }, () =>
      Array.from({ length: newSize }, () => ({
        type: 'white',
        value: null,
        pencilMarks: [],
        isGiven: false,
        isSolved: false,
        error: false
      }))
    );
    setBoard(emptyBoard);
    setSelectedCell(null);
    setHistory([]);
    setFuture([]);
  };

  // Check / Validate board
  const handleCheck = () => {
    const boardErrors = validateBoard(board);
    setErrors(boardErrors);
    setChecked(true);

    if (boardErrors.length === 0) {
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
    const preparedBoard = board.map(row =>
      row.map(cell => ({
        ...cell,
        isGiven: cell.value !== null,
        isSolved: false
      }))
    );

    const solvedBoard = solveStr8ts(preparedBoard);
    if (solvedBoard) {
      pushToHistory(solvedBoard);
      setErrors([]);
      setChecked(true);

      if (gameMode === 'play') {
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

    const hintCandidates = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].type === 'white') {
          if (board[r][c].value === null || board[r][c].value !== solvedBoard[r][c].value) {
            hintCandidates.push({ r, c, val: solvedBoard[r][c].value });
          }
        }
      }
    }

    if (hintCandidates.length > 0) {
      const randomHint = hintCandidates[Math.floor(Math.random() * hintCandidates.length)];
      const newBoard = board.map((row, ri) =>
        row.map((colCell, ci) => {
          if (ri === randomHint.r && ci === randomHint.c) {
            return {
              ...colCell,
              value: randomHint.val,
              pencilMarks: [],
              isSolved: true
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
      if (showRulesModal || showImportModal || showSaveModal || gameSolved) return;

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

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= boardSize) {
        handleInput(num);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        setPencilMode(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board, pencilMode, gameMode, boardSize, showRulesModal, showImportModal, showSaveModal, gameSolved, history, future]);

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

  // Next puzzle handler for celebration modal
  const handleNextPuzzle = () => {
    setGameSolved(false);
    const idx = savedPuzzles.findIndex(p => p.id === selectedPuzzleId);
    const nextIdx = (idx + 1) % savedPuzzles.length;
    const nextId = savedPuzzles[nextIdx].id;
    setSelectedPuzzleId(nextId);
    loadPuzzle(nextId);
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
              Tippe auf Felder, um sie schwarz/weiß zu machen. Gib Ziffern ein, um feste Rätsel-Vorgaben zu erstellen. Klicke auf <b>„Rätsel speichern“</b>, um dein Werk dauerhaft zu sichern!
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="game-workspace">

        {/* Left Side: Game Board & Board Controls */}
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

          <BoardControls
            boardSize={boardSize}
            selectedCell={selectedCell}
            gameMode={gameMode}
            pencilMode={pencilMode}
            canUndo={history.length > 0}
            canRedo={future.length > 0}
            onInput={handleInput}
            onDelete={handleDelete}
            onTogglePencil={() => setPencilMode(!pencilMode)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onReset={handleReset}
            onHint={handleHint}
            onCheck={handleCheck}
            onSolve={handleSolve}
          />
        </div>

        {/* Right Side: Control Panels */}
        <div className="sidebar-panel">

          {/* Saved Puzzles Selector (Only in Play mode) */}
          {gameMode === 'play' && (
            <PuzzleSelectorPanel
              savedPuzzles={savedPuzzles}
              selectedPuzzleId={selectedPuzzleId}
              onSelectPuzzle={(newId) => {
                setSelectedPuzzleId(newId);
                loadPuzzle(newId);
              }}
              onDeletePuzzle={handleDeleteCurrentPuzzle}
            />
          )}

          {/* Edit Mode Helpers (Only in Edit mode) */}
          {gameMode === 'edit' && (
            <EditorSettingsPanel
              boardSize={boardSize}
              onChangeBoardSize={handleChangeBoardSize}
              selectedCell={selectedCell}
              onToggleCellType={toggleCellType}
              onClearAll={handleClearAll}
              onOpenSaveModal={() => setShowSaveModal(true)}
            />
          )}

          {/* Keyboard Shortcuts Help */}
          <ShortcutsPanel boardSize={boardSize} />

        </div>

      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Save Puzzle Modal */}
      <SavePuzzleModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        board={board}
        boardSize={boardSize}
        currentPuzzle={currentPuzzle}
        onSave={handleSavePuzzle}
      />

      {/* Rules Modal Overlay */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Game Solved Modal Overlay */}
      <GameSolvedModal
        isOpen={gameSolved}
        gameMode={gameMode}
        timeFormatted={formatTime(timer)}
        difficulty={currentPuzzle?.difficulty}
        hasMultiplePuzzles={savedPuzzles.length > 1}
        onNextPuzzle={handleNextPuzzle}
        onPlayAgain={() => {
          setGameSolved(false);
          loadPuzzle(selectedPuzzleId);
        }}
      />
    </div>
  );
}
