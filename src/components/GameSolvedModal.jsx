import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function GameSolvedModal({
  isOpen,
  gameMode = 'play',
  timeFormatted = '00:00',
  difficulty = '',
  hasMultiplePuzzles = false,
  onNextPuzzle,
  onPlayAgain
}) {
  if (!isOpen) return null;

  return (
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
              <div className="stat-val">{timeFormatted}</div>
              <div className="stat-lbl">Zeit</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{difficulty || 'Standard'}</div>
              <div className="stat-lbl">Schwierigkeit</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {hasMultiplePuzzles && (
            <button className="btn btn-secondary" onClick={onNextPuzzle}>
              Nächstes Rätsel
            </button>
          )}
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Nochmal spielen
          </button>
        </div>
      </div>
    </div>
  );
}
