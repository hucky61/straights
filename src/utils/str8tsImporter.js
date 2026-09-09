/**
 * Utility to import Str8ts puzzle setups from external URLs, print pages, or puzzle codes.
 * Supports:
 * - Print pages (e.g. Print_Daily_Str8ts_DE.aspx with id="a00" ... id="a88" table cells)
 * - Feed pages (e.g. ASStr8tsv2.asp with cmPuzzle and cmColourMap)
 * - Embedded JSON (json = {"puzzles": [...]})
 * - Direct 81-character puzzle strings and codes
 */

/**
 * Attempts to parse Str8ts puzzle data from HTML/JS text or JSON.
 * @param {string} rawText 
 * @returns {object|null} { board, size, metadata }
 */
export function parseStr8tsTextContent(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Check for HTML print table grids with id="a00" ... id="a88" or id="C00" ... id="C88"
  // (Used by https://www.str8ts.com/Print_Daily_Str8ts_DE.aspx?d=0&a=7784&asym=1 etc.)
  const hasATable = /id=["']a00["']/i.test(rawText);
  const hasCTable = /id=["']C00["']/i.test(rawText);

  if (hasATable || hasCTable) {
    const prefix = hasATable ? 'a' : 'C';
    const tableBoard = [];
    let validCellCount = 0;

    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        const cellRegex = new RegExp(`<td[^>]*id=["\']${prefix}${r}${c}["\'][^>]*>([\\s\\S]*?)<\\/td>`, 'i');
        const match = rawText.match(cellRegex);
        if (match) {
          validCellCount++;
          const fullTag = match[0];
          const inner = match[1].replace(/&nbsp;/g, '').replace(/<[^>]+>/g, '').trim();
          const isBlack = /bcell/i.test(fullTag) || /rgb\(0,\s*0,\s*0\)/i.test(fullTag) || /background-color:\s*#000000/i.test(fullTag);
          const valDigit = /^[1-9]$/.test(inner) ? parseInt(inner, 10) : null;

          row.push({
            type: isBlack ? 'black' : 'white',
            value: valDigit,
            pencilMarks: [],
            isGiven: !isBlack && valDigit !== null,
            isSolved: false,
            error: false
          });
        }
      }
      if (row.length === 9) {
        tableBoard.push(row);
      }
    }

    if (tableBoard.length === 9 && validCellCount === 81) {
      let printMeta = { name: 'Str8ts Druckversion', difficulty: 'Mittel' };
      const titleMatch = rawText.match(/id=["']ptitle["'][^>]*>[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i);
      const gradeMatch = rawText.match(/id=["']pgrade["'][^>]*>[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i);

      let puzNum = '';
      let puzDiff = '';
      let puzDate = '';

      if (gradeMatch) {
        const gradeText = gradeMatch[1];
        const numM = gradeText.match(/#(\d+)/);
        if (numM) puzNum = `#${numM[1]}`;
        const diffM = gradeText.match(/(Leicht|Mittel|Schwer|Teuflisch|Easy|Medium|Hard|Extreme)/i);
        if (diffM) puzDiff = diffM[1];
      }
      if (titleMatch) {
        const titleText = titleMatch[1];
        const dateM = titleText.match(/vom\s+([^<]+)/i);
        if (dateM) puzDate = ` (${dateM[1].trim()})`;
      }

      if (puzNum || puzDate) {
        printMeta.name = `Str8ts ${puzNum}${puzDate}`.trim();
      }
      if (puzDiff) {
        printMeta.difficulty = puzDiff;
      }

      return {
        board: tableBoard,
        size: 9,
        metadata: printMeta
      };
    }
  }

  let cmPuzzle = null;
  let cmColourMap = null;
  let metadata = { name: 'Importiertes Rätsel', difficulty: 'Mittel' };

  // 2. Try parsing full JSON if rawText is valid JSON or contains var json = {...}
  try {
    let jsonMatch = rawText.match(/json\s*=\s*(\{.*?\});/s) || rawText.match(/(\{[\s\S]*"puzzles"[\s\S]*\})/);
    let jsonData = null;
    if (jsonMatch) {
      jsonData = JSON.parse(jsonMatch[1]);
    } else if (rawText.trim().startsWith('{')) {
      jsonData = JSON.parse(rawText.trim());
    }

    if (jsonData) {
      let puzzleObj = null;
      if (Array.isArray(jsonData.puzzles) && jsonData.puzzles.length > 0) {
        puzzleObj = jsonData.puzzles[0];
      } else if (jsonData.cmPuzzle) {
        puzzleObj = jsonData;
      }

      if (puzzleObj) {
        cmPuzzle = puzzleObj.cmPuzzle || puzzleObj.puzzle;
        cmColourMap = puzzleObj.cmColourMap || puzzleObj.cmColorMap || puzzleObj.colourMap || puzzleObj.colorMap;
        
        if (puzzleObj.cmCompDate || puzzleObj.cmPuzNum) {
          const puzNumStr = puzzleObj.cmPuzNum ? `#${puzzleObj.cmPuzNum}` : '';
          const puzDateStr = puzzleObj.cmCompDate ? ` (${puzzleObj.cmCompDate})` : '';
          metadata.name = `Str8ts ${puzNumStr}${puzDateStr}`.trim();
        }
        if (puzzleObj.grade || puzzleObj.gradenum) {
          const gradeMap = { 'e': 'Einfach', 'm': 'Mittel', 'h': 'Schwer', 'g': 'Teuflisch', 1: 'Einfach', 2: 'Mittel', 3: 'Schwer', 4: 'Teuflisch' };
          const gKey = puzzleObj.grade ? puzzleObj.grade.toLowerCase() : puzzleObj.gradenum;
          metadata.difficulty = gradeMap[gKey] || puzzleObj.grade || 'Mittel';
        }
      }
    }
  } catch (e) {
    // Ignore JSON parse errors, proceed to regex matching
  }

  // 3. Regex matching for cmPuzzle and cmColourMap in raw JS/HTML string
  if (!cmPuzzle || !cmColourMap) {
    const puzzleMatch = rawText.match(/["']?cmPuzzle["']?\s*[:=]\s*["']([0-9]{36,81})["']/i);
    const colorMatch = rawText.match(/["']?cmCol[o|ou]rMap["']?\s*[:=]\s*["']([0-1]{36,81})["']/i);

    if (puzzleMatch) cmPuzzle = puzzleMatch[1];
    if (colorMatch) cmColourMap = colorMatch[1];
  }

  // 4. Fallback: Search for any pair of 81/36 character digit strings
  if (!cmPuzzle || !cmColourMap) {
    const puzMatches = rawText.match(/[0-9]{81}/g);
    const colorMatches = rawText.match(/[0-1]{81}/g);

    if (puzMatches && puzMatches.length > 0 && colorMatches && colorMatches.length > 0) {
      cmPuzzle = puzMatches[0];
      cmColourMap = colorMatches.find(m => /^[01]{81}$/.test(m)) || colorMatches[0];
    }
  }

  if (!cmPuzzle || !cmColourMap) return null;

  const len = cmPuzzle.length;
  if (len !== 81 && len !== 36) return null;
  if (cmColourMap.length !== len) return null;

  const size = Math.sqrt(len); // 9 or 6
  const board = [];

  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const isBlack = cmColourMap[idx] === '1';
      const valDigit = parseInt(cmPuzzle[idx], 10);
      const value = valDigit > 0 ? valDigit : null;

      row.push({
        type: isBlack ? 'black' : 'white',
        value: value,
        pencilMarks: [],
        isGiven: !isBlack && value !== null,
        isSolved: false,
        error: false
      });
    }
    board.push(row);
  }

  return {
    board,
    size,
    metadata
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * Fetch and import puzzle from a URL or raw text string.
 * Uses dev server proxy or CORS proxy fallbacks if needed.
 * @param {string} inputUrlOrText 
 * @returns {Promise<object>} { success: boolean, board?, size?, metadata?, error? }
 */
export async function importStr8tsFromUrlOrText(inputUrlOrText) {
  let trimmed = inputUrlOrText.trim();
  if (!trimmed) {
    return { success: false, error: 'Bitte gib eine gültige URL oder einen Rätsel-Code ein.' };
  }

  // Check if input is a direct text/JSON/HTML code first
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const parsed = parseStr8tsTextContent(trimmed);
    if (parsed) {
      return { success: true, ...parsed };
    } else {
      return { success: false, error: 'Konnte keinen gültigen Str8ts Rätsel-Code im eingegebenen Text finden.' };
    }
  }

  // Input is a URL!
  // First, check query params in the URL itself
  try {
    const urlObj = new URL(trimmed);
    const cmPuz = urlObj.searchParams.get('cmPuzzle') || urlObj.searchParams.get('str8ts') || urlObj.searchParams.get('puzzle');
    const cmCol = urlObj.searchParams.get('cmColourMap') || urlObj.searchParams.get('cmColorMap') || urlObj.searchParams.get('colour') || urlObj.searchParams.get('color');

    if (cmPuz && cmCol) {
      const parsed = parseStr8tsTextContent(`cmPuzzle="${cmPuz}" cmColourMap="${cmCol}"`);
      if (parsed) return { success: true, ...parsed };
    }
  } catch (e) {
    // Continue to fetch
  }

  // Fetch URL content
  let htmlContent = '';

  // Attempt 1: Local Vite dev proxy if str8ts.com or str8ts.de
  try {
    let localProxyUrl = null;
    if (trimmed.startsWith('https://www.str8ts.com') || trimmed.startsWith('http://www.str8ts.com')) {
      localProxyUrl = trimmed.replace(/^https?:\/\/www\.str8ts\.com/, '/str8ts-com-proxy');
    } else if (trimmed.startsWith('https://www.str8ts.de') || trimmed.startsWith('http://www.str8ts.de')) {
      localProxyUrl = trimmed.replace(/^https?:\/\/www\.str8ts\.de/, '/str8ts-de-proxy');
    }

    if (localProxyUrl) {
      const res = await fetchWithTimeout(localProxyUrl, { headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,*/*' } }, 3000);
      if (res.ok) {
        htmlContent = await res.text();
      }
    }
  } catch (err) {
    // Continue
  }

  // Attempt 2: Direct fetch (in case same origin or CORS allowed)
  if (!htmlContent) {
    try {
      const res = await fetchWithTimeout(trimmed, { headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,*/*' } }, 2500);
      if (res.ok) {
        htmlContent = await res.text();
      }
    } catch (err) {
      // CORS or network error
    }
  }

  // Attempt 3: Public CORS proxy (allorigins.win)
  if (!htmlContent) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmed)}`;
      const res = await fetchWithTimeout(proxyUrl, {}, 3500);
      if (res.ok) {
        htmlContent = await res.text();
      }
    } catch (err) {
      // Continue
    }
  }

  // Attempt 4: Public CORS proxy (codetabs.com)
  if (!htmlContent) {
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(trimmed)}`;
      const res = await fetchWithTimeout(proxyUrl, {}, 3500);
      if (res.ok) {
        htmlContent = await res.text();
      }
    } catch (err) {
      // Continue
    }
  }

  if (!htmlContent) {
    return {
      success: false,
      error: 'Die URL konnte wegen Browser-Sicherheitsregeln (CORS) nicht automatisch geladen werden. Bitte öffne die Seite im Browser, kopiere den Quelltext (Strg+U -> Alles markieren) und füge ihn direkt in das Textfeld ein.'
    };
  }

  // Parse HTML/JS response text
  const parsed = parseStr8tsTextContent(htmlContent);
  if (parsed) {
    return { success: true, ...parsed };
  } else {
    return {
      success: false,
      error: 'Die Webseite wurde geladen, aber es konnte kein gültiges Str8ts-Rätsel darin identifiziert werden.'
    };
  }
}
