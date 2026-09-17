import React from 'react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
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
            <button className="btn btn-primary" onClick={onClose}>
              Alles klar!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
