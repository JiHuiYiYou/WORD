/**
 * WORD v2 — Utility Functions
 * Text cleaning, language detection, shuffle, comparison.
 */
WORD.Utils = {};

// ── Text Cleaning ──

/**
 * Filter characters: keep Chinese, English letters, digits, spaces,
 * hyphens, and Chinese punctuation marks.
 * This preserves words like "COVID-19" and Chinese punctuation like "。，、"
 */
WORD.Utils.filterCharacters = function (text) {
  // Keep: \u4e00-\u9fa5 (Chinese), a-zA-Z (English), 0-9 (digits),
  //       \s (spaces), - (hyphen),
  //       \u3000-\u303f (CJK punctuation like 。，、；：？！),
  //       \uff00-\uffef (fullwidth forms like ＂＇（）)
  return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\-\.\u3000-\u303f\uff00-\uffef]/g, '');
};

/**
 * Remove spaces between Chinese and English characters.
 */
WORD.Utils.removeSpacesBetweenChineseEnglish = function (text) {
  text = text.replace(/([\u4e00-\u9fa5])\s+([a-zA-Z])/g, '$1$2');
  text = text.replace(/([a-zA-Z])\s+([\u4e00-\u9fa5])/g, '$1$2');
  return text;
};

/**
 * Insert semicolon between Chinese and English boundaries.
 */
WORD.Utils.addSemicolonBetweenChineseEnglish = function (text) {
  text = text.replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1;$2');
  text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1;$2');
  return text;
};

/**
 * Full text cleanup pipeline.
 */
WORD.Utils.cleanText = function (text) {
  text = WORD.Utils.filterCharacters(text);
  text = WORD.Utils.removeSpacesBetweenChineseEnglish(text);
  text = WORD.Utils.addSemicolonBetweenChineseEnglish(text);
  return text;
};

// ── Language Detection ──

/**
 * Split cleaned text into { english, chinese }.
 * Auto-detects which side is English/Chinese by checking Unicode ranges,
 * rather than assuming a fixed order.
 */
WORD.Utils.splitEnglishChinese = function (cleanedText) {
  if (!cleanedText) return { english: '', chinese: '' };

  const semiIndex = cleanedText.indexOf(';');
  let part1 = '', part2 = '';

  if (semiIndex !== -1) {
    part1 = cleanedText.substring(0, semiIndex).trim();
    part2 = cleanedText.substring(semiIndex + 1).trim();
  } else {
    // No semicolon — try to detect by scanning for Chinese chars
    const hasChinese = /[\u4e00-\u9fa5]/.test(cleanedText);
    const hasEnglish = /[a-zA-Z]/.test(cleanedText);

    if (hasChinese && !hasEnglish) {
      return { english: '', chinese: cleanedText.trim() };
    }
    if (!hasChinese && hasEnglish) {
      return { english: cleanedText.trim(), chinese: '' };
    }
    // Both present without semicolon — find the boundary
    const chineseFirst = /^[\u4e00-\u9fa5]/.test(cleanedText);
    const match = cleanedText.match(/[\u4e00-\u9fa5]+/g);
    const engMatch = cleanedText.match(/[a-zA-Z]+/g);

    if (chineseFirst && match && engMatch) {
      return { chinese: match.join(''), english: engMatch.join(' ') };
    }
    if (!chineseFirst && engMatch && match) {
      return { english: engMatch.join(' '), chinese: match.join('') };
    }
    return { english: cleanedText.trim(), chinese: '' };
  }

  // With semicolon: detect which part has Chinese characters
  const part1HasChinese = /[\u4e00-\u9fa5]/.test(part1);
  const part2HasChinese = /[\u4e00-\u9fa5]/.test(part2);

  if (part1HasChinese && !part2HasChinese) {
    return { english: part2, chinese: part1 };
  }
  // Default: English first, Chinese second
  return { english: part1, chinese: part2 };
};

// ── Shuffle ──

/**
 * Fisher-Yates shuffle. Returns a new array.
 */
WORD.Utils.shuffle = function (arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// ── Comparison ──

/**
 * Case-insensitive comparison for English text.
 */
WORD.Utils.compareEnglish = function (a, b) {
  return WORD.Utils.cleanText(a).toLowerCase() === WORD.Utils.cleanText(b).toLowerCase();
};

/**
 * Exact comparison for Chinese text (after cleaning).
 */
WORD.Utils.compareChinese = function (a, b) {
  return WORD.Utils.cleanText(a) === WORD.Utils.cleanText(b);
};

// ── ID Generation ──

WORD.Utils.generateRoundId = function (roundNumber) {
  return 'R' + String(roundNumber).padStart(3, '0');
};

WORD.Utils.today = function () {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
};

// ── HTML Escape ──

WORD.Utils.escapeHtml = function (text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};
