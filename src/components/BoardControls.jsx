import React from 'react';
import {
  Play,
  RotateCcw,
  Undo,
  Redo,
  CheckCircle2,
  HelpCircle,
  Pencil,
  Trash2
} from 'lucide-react';

export default function BoardControls({
  boardSize = 9,
  selectedCell,
  gameMode = 'play',
  pencilMode = false,
  canUndo = false,
  canRedo = false,
  onInput,
  onDelete,
  onTogglePencil,
  onUndo,
  onRedo,
  onReset,
  onHint,
  onCheck,
  onSolve
}) {
  return (
    <>
      <div className="numpad-row">
        {Array.from({ length: boardSize }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            className="numpad-btn"
            onClick={() => onInput && onInput(num)}
            disabled={!selectedCell}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Quick Action buttons under the board */}
      <div className="btn-row" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
        {gameMode === 'play' && (
          <button
            className={`btn pencil-mode-btn ${pencilMode ? 'active' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
            onClick={onTogglePencil}
          >
            <Pencil size={12} style={{ marginRight: '4px' }} />
            Notizen (N)
          </button>
        )}
        <button
          className="btn btn-danger btn-icon numpad-erase"
          onClick={onDelete}
          disabled={!selectedCell}
          title="Feld leeren"
        >
          <Trash2 size={20} />
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Rückgängig (Ctrl+Z)"
        >
          <Undo size={18} />
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Wiederholen (Ctrl+Y)"
        >
          <Redo size={18} />
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onReset}
          title="Zurücksetzen"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="btn-row" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-outline-glow" onClick={onHint} title="Tipp erhalten">
          <HelpCircle size={18} />
          Tipp
        </button>
        <button className="btn btn-secondary" onClick={onCheck} title="Fehler überprüfen">
          <CheckCircle2 size={18} color="var(--accent-cyan)" />
          Prüfen
        </button>
        <button className="btn btn-primary" onClick={onSolve} title="Automatisch lösen">
          <Play size={18} />
          Lösen
        </button>
      </div>
    </>
  );
}
