import React, { useState, useMemo } from 'react';
import { Download, Link as LinkIcon, AlertCircle, Loader2, Printer, Calendar } from 'lucide-react';
import { importStr8tsFromUrlOrText } from '../utils/str8tsImporter';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [inputVal, setInputVal] = useState('');
  const [selectedOffset, setSelectedOffset] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate options for the last 28 days (d = 0 to 27)
  const daysOptions = useMemo(() => {
    return Array.from({ length: 28 }, (_, d) => {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const formattedDate = date.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let label = '';
      if (d === 0) {
        label = `Heute – ${formattedDate}`;
      } else if (d === 1) {
        label = `Gestern – ${formattedDate}`;
      } else {
        label = `${formattedDate} (vor ${d} Tagen)`;
      }

      return {
        d,
        label,
        url: `https://www.str8ts.com/Print_Daily_Str8ts_DE.aspx?asym=1&d=${d}`
      };
    });
  }, []);

  if (!isOpen) return null;

  const handleImport = async (overrideInput) => {
    const targetInput = overrideInput || inputVal;
    if (!targetInput.trim()) {
      setError('Bitte gib eine URL oder einen Rätsel-Code ein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await importStr8tsFromUrlOrText(targetInput);
      if (result.success) {
        onImportSuccess(result);
        onClose();
      } else {
        setError(result.error || 'Fehler beim Importieren des Rätsels.');
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOffsetSelectChange = (offset) => {
    setSelectedOffset(offset);
    const url = `https://www.str8ts.com/Print_Daily_Str8ts_DE.aspx?asym=1&d=${offset}`;
    setInputVal(url);
  };

  const handleLoadSelectedOffset = () => {
    const url = `https://www.str8ts.com/Print_Daily_Str8ts_DE.aspx?asym=1&d=${selectedOffset}`;
    setInputVal(url);
    handleImport(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>

        <div className="import-header">
          <div className="import-icon">
            <Download size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>Rätsel importieren</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Importiere Str8ts Aufstellungen der letzten 28 Tage oder per URL
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ marginTop: '1rem' }}>
          {/* 28 Days Option Select */}
          <div className="control-group" style={{ marginBottom: '1.25rem' }}>
            <label className="label-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--accent-cyan)" />
              Verfügbare Rätsel:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
              <select
                className="select-control"
                style={{ flex: 1, padding: '0.6rem 0.75rem', fontSize: '0.875rem' }}
                value={selectedOffset}
                onChange={(e) => handleOffsetSelectChange(e.target.value)}
                disabled={loading}
              >
                {daysOptions.map(opt => (
                  <option key={opt.d} value={opt.d}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleLoadSelectedOffset}
                disabled={loading}
                title="Ausgewähltes Tagesrätsel direkt laden"
              >
                <Printer size={15} color="var(--accent-cyan)" />
                Laden
              </button>
            </div>
          </div>

          {/* Manual URL or Code Textarea */}
          <div className="control-group">
            <label className="label-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LinkIcon size={14} color="var(--accent-cyan)" />
              Oder eigene URL / Str8ts-Code eingeben:
            </label>
            <textarea
              className="import-textarea"
              placeholder="https://www.str8ts.com/Print_Daily_Str8ts_DE.aspx?asym=1&d=... oder HTML-Code"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="import-error-banner">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Abbrechen
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleImport()}
            disabled={loading || !inputVal.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Lade...
              </>
            ) : (
              <>
                <Download size={16} />
                Importieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
