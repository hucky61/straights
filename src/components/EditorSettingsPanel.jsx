import React from 'react';
import { Grid, Trash2, Save } from 'lucide-react';

export default function EditorSettingsPanel({
  boardSize = 9,
  onChangeBoardSize,
  selectedCell,
  onToggleCellType,
  onClearAll,
  onOpenSaveModal
}) {
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="panel-title">
        <Grid size={18} color="var(--accent-purple)" />
        Editor-Einstellungen
      </h2>

      {/* Save Puzzle Button */}
      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', gap: '0.5rem', fontWeight: 700 }}
        onClick={onOpenSaveModal}
        title="Aktuelles Rätsel mit Name und Schwierigkeit speichern"
      >
        <Save size={18} />
        Rätsel speichern
      </button>

      <div className="control-group">
        <label className="label-text">Spielfeldgröße</label>
        <div className="btn-grid">
          <button
            className={`btn ${boardSize === 9 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeBoardSize && onChangeBoardSize(9)}
          >
            Standard 9x9
          </button>
          <button
            className={`btn ${boardSize === 6 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeBoardSize && onChangeBoardSize(6)}
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
            onClick={() => onToggleCellType && onToggleCellType('white')}
            disabled={!selectedCell}
          >
            Weiß (Spieler)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onToggleCellType && onToggleCellType('black')}
            disabled={!selectedCell}
            style={{ background: '#0b0f19', borderColor: '#374151' }}
          >
            Schwarz (Wand)
          </button>
        </div>
      </div>

      <button className="btn btn-danger" onClick={onClearAll}>
        <Trash2 size={16} />
        Spielfeld leeren
      </button>
    </div>
  );
}
