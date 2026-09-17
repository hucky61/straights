import React from 'react';
import { Info } from 'lucide-react';

export default function ShortcutsPanel({ boardSize = 9 }) {
  return (
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
  );
}
