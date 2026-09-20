/**
 * Google Gemini Vision Service for Str8ts Puzzle Recognition.
 * Supports auto-detection of available Gemini models (Gemini 2.0 Flash, 1.5 Flash, etc.)
 * with intelligent multi-model and multi-API-version fallbacks.
 */

const SYSTEM_INSTRUCTION = `You are an expert AI computer vision assistant specializing in parsing "Str8ts" (also known as "Straights") number puzzles from photos, scans, and newspaper clippings.

A Str8ts puzzle consists of a square grid (usually 9x9):
1. Cells are either:
   - "white": Player cells (normal background). They may contain a pre-printed given digit (1-9), or be empty (null).
   - "black": Wall / barrier cells (dark or black background). They may contain a pre-printed white digit (1-9), or be empty (null).
2. Look carefully at the entire 9x9 grid:
   - Accurately determine whether each cell in the 9 rows and 9 columns is "white" or "black".
   - Accurately read any pre-printed digits (1 through 9).
   - If a cell has no printed number, value MUST be null.
   - If a black cell has a white number printed in it, its type is "black" and value is that integer (1-9).
   - If a white cell has a black number printed in it, its type is "white" and value is that integer (1-9).

Extract and return ONLY a valid JSON object matching this exact schema:
{
  "size": 9,
  "name": "Str8ts #... (or date if visible on page, else 'Str8ts Foto')",
  "difficulty": "Einfach" | "Mittel" | "Schwer" | "Teuflisch",
  "board": [
    [
      {"type": "white" | "black", "value": number | null},
      ... 9 cells per row ...
    ],
    ... exactly 9 rows ...
  ]
}`;

// Preferred models in priority order
const PREFERRED_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-001',
  'gemini-2.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro'
];

/**
 * Fetches available models for the given API key.
 * @param {string} apiKey 
 * @returns {Promise<string[]>} Array of model names (e.g. ['gemini-2.0-flash', 'gemini-1.5-flash'])
 */
export async function getAvailableGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return [];

  const key = apiKey.trim();
  const versions = ['v1beta', 'v1'];

  for (const ver of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          return data.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace(/^models\//, ''));
        }
      }
    } catch (e) {
      // Ignore and try next version
    }
  }

  return [];
}

/**
 * Determines the best endpoint URL to use for generating content.
 */
async function resolveCandidateEndpoints(apiKey, chosenModel = null) {
  const key = apiKey.trim();
  const endpoints = [];

  if (chosenModel && chosenModel !== 'auto') {
    endpoints.push({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${key}`,
      model: chosenModel
    });
    endpoints.push({
      url: `https://generativelanguage.googleapis.com/v1/models/${chosenModel}:generateContent?key=${key}`,
      model: chosenModel
    });
    return endpoints;
  }

  // Auto-detect available models via ListModels API
  const available = await getAvailableGeminiModels(apiKey);

  if (available.length > 0) {
    // Pick models matching our preference list
    const matched = [];
    for (const pref of PREFERRED_MODELS) {
      const found = available.find(m => m === pref || m.includes(pref));
      if (found && !matched.includes(found)) {
        matched.push(found);
      }
    }

    // Add any remaining flash models
    for (const m of available) {
      if (/flash/i.test(m) && !matched.includes(m)) {
        matched.push(m);
      }
    }

    // Add any remaining gemini models
    for (const m of available) {
      if (!matched.includes(m)) {
        matched.push(m);
      }
    }

    for (const model of matched) {
      endpoints.push({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        model: model
      });
      endpoints.push({
        url: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`,
        model: model
      });
    }
  }

  // Fallback list in case ListModels returned empty or failed
  if (endpoints.length === 0) {
    for (const model of PREFERRED_MODELS) {
      endpoints.push({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        model: model
      });
      endpoints.push({
        url: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`,
        model: model
      });
    }
  }

  return endpoints;
}

/**
 * Analyzes a Str8ts puzzle image using Google Gemini Vision API.
 * @param {string} base64DataUrl - Image data URL (e.g. 'data:image/jpeg;base64,...')
 * @param {string} apiKey - Google Gemini API Key
 * @param {string} [selectedModel='auto'] - Specific model name or 'auto'
 * @returns {Promise<{board: Array<Array<object>>, size: number, name: string, difficulty: string, modelUsed: string}>}
 */
export async function analyzeStr8tsWithGemini(base64DataUrl, apiKey, selectedModel = 'auto') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Bitte gib deinen Google Gemini API-Key in den Einstellungen ein.');
  }

  const matches = base64DataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Ungültiges Bildformat. Bitte lade ein JPG, PNG oder WEBP Bild hoch.');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: SYSTEM_INSTRUCTION },
          { text: "Analyze this image and extract the complete 9x9 Str8ts grid:" },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1
    }
  };

  const candidates = await resolveCandidateEndpoints(apiKey, selectedModel);
  let lastErrorMsg = '';
  let successfulData = null;
  let modelUsed = '';

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        successfulData = await response.json();
        modelUsed = candidate.model;
        break;
      }

      let errorMsg = `Status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.error?.message) {
          errorMsg = errData.error.message;
        }
      } catch (e) {
        // ignore
      }

      lastErrorMsg = errorMsg;

      // If invalid API key, no point in retrying other endpoints
      if (response.status === 400 && errorMsg.includes('API_KEY_INVALID')) {
        throw new Error('Der angegebene Google Gemini API-Key ist ungültig. Bitte überprüfe deinen Key.');
      }
      // If 404 or model not found, continue trying the next candidate
    } catch (fetchErr) {
      if (fetchErr.message.includes('API-Key ist ungültig')) {
        throw fetchErr;
      }
      lastErrorMsg = fetchErr.message;
    }
  }

  if (!successfulData) {
    throw new Error(`Gemini API-Fehler: ${lastErrorMsg || 'Kein passendes Modell gefunden.'}`);
  }

  const textResponse = successfulData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Die KI konnte keine Antwort für dieses Bild generieren. Bitte versuche ein anderes Foto.');
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(textResponse);
  } catch (err) {
    throw new Error('Die Antwort der KI konnte nicht als gültiges JSON verarbeitet werden.');
  }

  if (!parsedResult.board || !Array.isArray(parsedResult.board) || parsedResult.board.length === 0) {
    throw new Error('Es konnte kein Str8ts-Spielfeld auf dem Foto erkannt werden. Achte darauf, dass das gesamte 9x9 Gitter gut sichtbar ist.');
  }

  const size = parsedResult.size || parsedResult.board.length;

  const formattedBoard = parsedResult.board.map(row =>
    row.map(cell => {
      const isBlack = cell.type === 'black';
      const numVal = (typeof cell.value === 'number' && cell.value >= 1 && cell.value <= size)
        ? cell.value
        : null;

      return {
        type: isBlack ? 'black' : 'white',
        value: numVal,
        pencilMarks: [],
        isGiven: numVal !== null,
        isSolved: false,
        error: false
      };
    })
  );

  return {
    board: formattedBoard,
    size: size,
    name: parsedResult.name || 'Str8ts Foto-Scan',
    difficulty: parsedResult.difficulty || 'Mittel',
    modelUsed: modelUsed
  };
}
