import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Key,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Trash2,
  HelpCircle,
  ExternalLink,
  Edit2,
  Cpu
} from 'lucide-react';
import { analyzeStr8tsWithGemini } from '../services/geminiVision';
import { validateBoard } from '../utils/str8tsSolver';

export default function ScanModal({ isOpen, onClose, onScanSuccess }) {
  // Step in workflow: 'input' (capture/upload) | 'analyzing' | 'verify'
  const [step, setStep] = useState('input');

  // Capture mode: 'camera' | 'upload'
  const [captureTab, setCaptureTab] = useState('camera');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [cameraError, setCameraError] = useState(null);
  const [stream, setStream] = useState(null);

  // Gemini API Key state
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('str8ts_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  // Gemini Model state
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('str8ts_gemini_model') || 'auto';
    } catch (e) {
      return 'auto';
    }
  });

  // Selected/captured image (data URL)
  const [imagePreview, setImagePreview] = useState(null);

  // Recognition error
  const [errorMsg, setErrorMsg] = useState(null);

  // Extracted puzzle result
  const [board, setBoard] = useState(null);
  const [boardSize, setBoardSize] = useState(9);
  const [puzzleName, setPuzzleName] = useState('Str8ts Foto');
  const [difficulty, setDifficulty] = useState('Mittel');
  const [modelUsed, setModelUsed] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera stream helper
  const stopCameraStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Kamera konnte nicht gestartet werden:', err);
      setCameraError('Kamera-Zugriff nicht verfügbar. Bitte lade stattdessen ein Foto hoch.');
      setCaptureTab('upload');
    }
  }, [cameraFacing, stopCameraStream]);

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setErrorMsg(null);
      setImagePreview(null);
      setBoard(null);
      setSelectedCell(null);
      const currentKey = localStorage.getItem('str8ts_gemini_api_key') || '';
      setApiKey(currentKey);
      setShowKeyInput(!currentKey);
      setTempKey(currentKey);
    } else {
      stopCameraStream();
    }
  }, [isOpen]);

  // Start camera when on input step & camera tab
  useEffect(() => {
    if (isOpen && step === 'input' && captureTab === 'camera' && !imagePreview) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, step, captureTab, imagePreview, startCameraStream, stopCameraStream]);

  // Flip front/back camera
  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture snapshot from live camera
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCameraStream();
    setImagePreview(dataUrl);
    setErrorMsg(null);
  };

  // Handle file input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Paste image from clipboard
  useEffect(() => {
    if (!isOpen || step !== 'input') return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setImagePreview(event.target.result);
              setErrorMsg(null);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, step]);

  // Save API Key & Model
  const handleSaveApiKey = () => {
    const trimmed = tempKey.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('str8ts_gemini_api_key', trimmed);
      localStorage.setItem('str8ts_gemini_model', selectedModel);
      setApiKey(trimmed);
      setShowKeyInput(false);
      setErrorMsg(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger AI Recognition
  const handleAnalyzeWithAI = async () => {
    if (!imagePreview) return;
    if (!apiKey.trim()) {
      setShowKeyInput(true);
      setErrorMsg('Bitte hinterlege zuerst deinen Google Gemini API-Key.');
      return;
    }

    setStep('analyzing');
    setErrorMsg(null);

    try {
      const result = await analyzeStr8tsWithGemini(imagePreview, apiKey, selectedModel);
      setBoard(result.board);
      setBoardSize(result.size || 9);
      setPuzzleName(result.name || 'Str8ts Foto-Scan');
      setDifficulty(result.difficulty || 'Mittel');
      setModelUsed(result.modelUsed || '');
      setStep('verify');
    } catch (err) {
      console.error('KI-Erkennung fehlgeschlagen:', err);
      setErrorMsg(err.message || 'Die Analyse ist fehlgeschlagen. Bitte prüfe das Foto oder deinen API-Key.');
      setStep('input');
    }
  };

  // Toggle cell type (white/black) in verification screen
  const handleToggleCellType = (r, c) => {
    if (!board) return;
    setBoard(prev =>
      prev.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri === r && ci === c) {
            return {
              ...cell,
              type: cell.type === 'black' ? 'white' : 'black'
            };
          }
          return cell;
        })
      )
    );
  };

  // Set or clear cell digit in verification screen
  const handleSetCellDigit = (r, c, digit) => {
    if (!board) return;
    setBoard(prev =>
      prev.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri === r && ci === c) {
            return {
              ...cell,
              value: digit,
              isGiven: digit !== null
            };
          }
          return cell;
        })
      )
    );
  };

  // Validate board conflicts
  const boardErrors = React.useMemo(() => {
    if (!board) return [];
    try {
      const validation = validateBoard(board, boardSize);
      return validation.errors || [];
    } catch (e) {
      return [];
    }
  }, [board, boardSize]);

  // Final confirmation: Import into game
  const handleConfirmImport = () => {
    if (!board) return;

    const cleanBoard = board.map(row =>
      row.map(cell => ({
        type: cell.type,
        value: cell.value,
        pencilMarks: [],
        isGiven: cell.value !== null,
        isSolved: false,
        error: false
      }))
    );

    onScanSuccess({
      board: cleanBoard,
      size: boardSize,
      metadata: {
        name: puzzleName.trim() || 'Gescänntes Str8ts',
        difficulty: difficulty
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content scan-modal"
        style={{ maxWidth: '780px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>

        {/* Modal Header */}
        <div className="import-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="import-icon" style={{ background: 'rgba(147, 51, 234, 0.1)', color: 'var(--accent-purple)' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0 }}>Str8ts KI-Scanner</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Automatische Rätselerkennung mit Google Gemini Vision
              </div>
            </div>
          </div>

          {/* API Key Status Pill */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', gap: '6px' }}
            onClick={() => setShowKeyInput(!showKeyInput)}
            title="Google Gemini API-Key & Modell verwalten"
          >
            <Key size={14} color={apiKey ? 'var(--accent-cyan)' : 'var(--color-warning)'} />
            <span>{apiKey ? 'API-Key & Modell' : 'API-Key eintragen'}</span>
            <Edit2 size={12} />
          </button>
        </div>

        {/* API Key Config Box */}
        {showKeyInput && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={16} color="var(--accent-purple)" />
              Google Gemini API-Key & Modell
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Für die Bilderkennung wird ein Google Gemini API-Key benötigt. Ein kostenloser Key kann in 30 Sekunden im{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Google AI Studio <ExternalLink size={12} />
              </a>{' '}
              erstellt werden. Er wird nur lokal in deinem Browser gespeichert.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="password"
                className="select-control"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="Gemini API-Key eingeben (z.B. AIzaSy...)"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={handleSaveApiKey}
                disabled={!tempKey.trim()}
              >
                Speichern
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <Cpu size={14} /> Modell:
              </label>
              <select
                className="select-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', flex: 1, minWidth: '220px' }}
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  try {
                    localStorage.setItem('str8ts_gemini_model', e.target.value);
                  } catch (err) {}
                }}
              >
                <option value="auto">Automatisch erkennen (Gemini 2.0 / 1.5 Flash - Empfohlen)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Schnell & Neueste Version)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>

              {apiKey && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  onClick={() => setShowKeyInput(false)}
                >
                  Schließen
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: CAPTURE / UPLOAD */}
        {step === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* If photo is already selected/taken */}
            {imagePreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '100%', maxHeight: '420px', display: 'flex', justifyContent: 'center', background: '#0b0f19', borderRadius: '12px', overflow: 'hidden', padding: '8px' }}>
                  <img
                    src={imagePreview}
                    alt="Aufgenommenes Str8ts"
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-icon"
                    style={{ position: 'absolute', top: '16px', right: '16px' }}
                    onClick={() => setImagePreview(null)}
                    title="Foto verwerfen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="btn-row" style={{ width: '100%', justifyContent: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setImagePreview(null)}
                  >
                    Neues Foto
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.75rem', fontWeight: 700, gap: '8px', background: 'linear-gradient(135deg, var(--accent-purple), #9333ea)' }}
                    onClick={handleAnalyzeWithAI}
                  >
                    <Sparkles size={18} />
                    Mit KI analysieren ✨
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mode tabs */}
                <div className="btn-row" style={{ width: '100%', justifyContent: 'center' }}>
                  <button
                    className={`btn ${captureTab === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setCaptureTab('camera')}
                  >
                    <Camera size={18} />
                    Kamera
                  </button>
                  <button
                    className={`btn ${captureTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setCaptureTab('upload')}
                  >
                    <Upload size={18} />
                    Foto hochladen
                  </button>
                </div>

                {/* Camera View */}
                {captureTab === 'camera' && (
                  <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cameraError ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
                        <AlertCircle size={36} style={{ margin: '0 auto 1rem auto' }} />
                        <div>{cameraError}</div>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ width: '100%', height: '100%', maxHeight: '480px', objectFit: 'cover' }}
                        />
                        {/* Target frame guide */}
                        <div style={{ position: 'absolute', inset: '12%', border: '2px dashed rgba(147, 51, 234, 0.8)', borderRadius: '10px', pointerEvents: 'none', display: 'flex', alignItems: 'flex-start', padding: '8px' }}>
                          <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px' }}>
                            Str8ts-Gitter hier ausrichten
                          </span>
                        </div>

                        {/* Camera Floating Toolbar */}
                        <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            style={{ background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: 'none' }}
                            onClick={toggleCameraFacing}
                            title="Kamera wechseln (Front/Rück)"
                          >
                            <RefreshCw size={18} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 1.75rem', borderRadius: '9999px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', fontWeight: 700 }}
                            onClick={handleTakeSnapshot}
                          >
                            <Camera size={20} />
                            Foto aufnehmen
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Upload View */}
                {captureTab === 'upload' && (
                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileUpload({ target: { files: e.dataTransfer.files } });
                      }
                    }}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                      <Upload size={28} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        Klicke hier oder ziehe ein Str8ts-Foto hinein
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        JPG, PNG, WEBP oder direktes Einfügen mit <b>Strg + V</b>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* STEP 2: ANALYZING STATE */}
        {step === 'analyzing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1.5rem', gap: '1.25rem' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                <Sparkles size={36} />
              </div>
              <Loader2 size={82} className="animate-spin" style={{ position: 'absolute', color: 'var(--accent-purple)', opacity: 0.7 }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Google Gemini analysiert das Rätsel...
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                Die KI erkennt das 9x9-Gitter, schwarze Trennfelder und alle Vorgabezahlen. Das dauert in der Regel nur 1 bis 2 Sekunden.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: VERIFY & CORRECT EXTRACTED BOARD */}
        {step === 'verify' && board && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Info Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div className="control-group">
                <label className="label-text">Rätselname</label>
                <input
                  type="text"
                  className="select-control"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                  value={puzzleName}
                  onChange={(e) => setPuzzleName(e.target.value)}
                />
              </div>

              <div className="control-group">
                <label className="label-text">Schwierigkeit</label>
                <select
                  className="select-control"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {['Einfach', 'Mittel', 'Schwer', 'Teuflisch'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {modelUsed && (
                <div className="control-group">
                  <label className="label-text">Verwendetes KI-Modell</label>
                  <div style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: 'var(--accent-purple)', fontWeight: 600 }}>
                    {modelUsed}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Banner */}
            {boardErrors.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.825rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{boardErrors.length} Regelkonflikt(e) (z.B. doppelte Ziffern). Tippe auf das Feld, um es zu korrigieren.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.825rem' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>Erkanntes Str8ts-Gitter ist regelkonform (keine doppelten Zahlen in Zeilen und Spalten).</span>
              </div>
            )}

            {/* Main Inspection: Photo + Extracted Grid side-by-side */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Photo Thumbnail */}
              {imagePreview && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Originalfoto:</div>
                  <div style={{ width: '180px', maxHeight: '260px', overflow: 'hidden', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={imagePreview} alt="Original" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              {/* 9x9 Interactive Extracted Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '360px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Erkanntes Str8ts-Board:</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
                    gap: '2px',
                    background: '#334155',
                    padding: '4px',
                    borderRadius: '6px',
                    width: '100%'
                  }}
                >
                  {board.map((row, r) =>
                    row.map((cell, c) => {
                      const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                      const isBlack = cell.type === 'black';

                      return (
                        <div
                          key={`${r}-${c}`}
                          style={{
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.25rem',
                            background: isBlack ? '#0f172a' : '#ffffff',
                            color: isBlack ? '#ffffff' : '#0f172a',
                            cursor: 'pointer',
                            borderRadius: '2px',
                            outline: isSelected ? '3px solid var(--accent-cyan)' : 'none',
                            boxShadow: isSelected ? '0 0 10px rgba(14, 165, 233, 0.8)' : 'none',
                            userSelect: 'none'
                          }}
                          onClick={() => setSelectedCell({ r, c })}
                        >
                          {cell.value || ''}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick edit controls for selected cell */}
                {selectedCell ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        Feld ({selectedCell.r + 1}, {selectedCell.c + 1}):
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleToggleCellType(selectedCell.r, selectedCell.c)}
                      >
                        {board[selectedCell.r][selectedCell.c].type === 'black' ? 'Schwarz ➔ Weiß' : 'Weiß ➔ Schwarz'}
                      </button>
                    </div>

                    <div className="btn-row" style={{ gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`btn ${board[selectedCell.r][selectedCell.c].value === num ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ width: '32px', height: '32px', padding: 0, fontSize: '0.9rem' }}
                          onClick={() => handleSetCellDigit(selectedCell.r, selectedCell.c, num)}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '0 0.5rem', height: '32px', fontSize: '0.75rem' }}
                        onClick={() => handleSetCellDigit(selectedCell.r, selectedCell.c, null)}
                      >
                        Leeren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    💡 Klicke auf ein Feld, um Farbe (schwarz/weiß) oder Zahl anzupassen.
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep('input')}>
                <ArrowLeft size={16} />
                Anderes Foto
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', fontWeight: 700 }}
                onClick={handleConfirmImport}
              >
                <Check size={18} />
                Ins Spiel übernehmen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
