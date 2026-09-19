import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateBoard, solveStr8ts } from '../utils/str8tsSolver';

export default function SavePuzzleModal({
  isOpen,
  onClose,
  board,
  boardSize = 9,
  currentPuzzle = null,
  onSave
}) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('Mittel');
  const [solvableStatus, setSolvableStatus] = useState(null); // 'checking' | 'solvable' | 'unsolvable'

  useEffect(() => {
    if (isOpen) {
      if (currentPuzzle) {
        setName(currentPuzzle.name || 'Eigenes Rätsel');
        setDifficulty(currentPuzzle.difficulty || 'Mittel');
      } else {
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        setName(`Eigenes Rätsel ${boardSize}x${boardSize} (${dateStr})`);
        setDifficulty('Mittel');
      }

      // Quick solve check in background
      try {
        const prepared = board.map(row => row.map(c => ({
          ...c,
          isGiven: c.value !== null,
          isSolved: false
        })));
        const errors = validateBoard(prepared);
        if (errors.length > 0) {
          setSolvableStatus('has-errors');
        } else {
          const solved = solveStr8ts(prepared);
          setSolvableStatus(solved ? 'solvable' : 'unsolvable');
        }
      } catch (e) {
        setSolvableStatus(null);
      }
    }
  }, [isOpen, currentPuzzle, board, boardSize]);

  if (!isOpen) return null;

  const handleSubmit = (overwrite = false) => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      difficulty,
      overwrite
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>

        <div className="import-header" style={{ marginBottom: '1.25rem' }}>
          <div className="import-icon" style={{ background: 'rgba(147, 51, 234, 0.1)', color: 'var(--accent-purple)' }}>
            <Save size={24} />
          </div>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>Rätsel speichern</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Speichert das aktuelle Spielfeld dauerhaft in deiner Rätsel-Bibliothek
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Puzzle Name */}
          <div className="control-group">
            <label className="label-text">Name des Rätsels</label>
            <input
              type="text"
              className="select-control"
              style={{ padding: '0.75rem', width: '100%' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Mein Str8ts #1"
              autoFocus
            />
          </div>

          {/* Difficulty Selection */}
          <div className="control-group">
            <label className="label-text">Schwierigkeitsgrad</label>
            <div className="btn-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {['Einfach', 'Mittel', 'Schwer', 'Teuflisch'].map(diff => (
                <button
                  key={diff}
                  type="button"
                  className={`btn ${difficulty === diff ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                  onClick={() => setDifficulty(diff)}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Solver feedback hint */}
          {solvableStatus === 'solvable' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 0.8rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              <span>Gültiges Rätsel: Eindeutig bzw. lösbar!</span>
            </div>
          )}
          {solvableStatus === 'unsolvable' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 0.8rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span>Hinweis: Das Board hat aktuell keine gültige Lösung nach Str8ts-Regeln. Speichern ist dennoch möglich.</span>
            </div>
          )}
          {solvableStatus === 'has-errors' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 0.8rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span>Achtung: Es gibt Regelkonflikte (z.B. doppelte Zahlen in Zeile/Spalte).</span>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          {currentPuzzle && (
            <button
              className="btn btn-secondary"
              onClick={() => handleSubmit(true)}
              disabled={!name.trim()}
              title={`Überschreibt "${currentPuzzle.name}"`}
            >
              Aktuelles überschreiben
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={!name.trim()}
          >
            <Save size={16} />
            Als neues Rätsel speichern
          </button>
        </div>
      </div>
    </div>
  );
}
