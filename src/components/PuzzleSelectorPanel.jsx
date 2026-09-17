import React from 'react';
import { Grid, Trash2 } from 'lucide-react';

export default function PuzzleSelectorPanel({
  savedPuzzles = [],
  selectedPuzzleId = '',
  onSelectPuzzle,
  onDeletePuzzle
}) {
  return (
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
            onChange={(e) => onSelectPuzzle && onSelectPuzzle(e.target.value)}
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
              onClick={onDeletePuzzle}
              title="Ausgewähltes Rätsel löschen"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
