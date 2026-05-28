/**
 * WORD v2 — localStorage Persistence
 * Word Book (单词本) + Practice Records (练习记录) + LLM Config.
 * All keys prefixed with WORD_v2_ to avoid collisions.
 */
WORD.Storage = {};

// ── Internal Helpers ──

WORD.Storage._get = function (key, defaultVal) {
  try {
    var data = localStorage.getItem('WORD_v2_' + key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

WORD.Storage._set = function (key, val) {
  try {
    localStorage.setItem('WORD_v2_' + key, JSON.stringify(val));
  } catch (e) {
    WORD.UI && WORD.UI.showToast && WORD.UI.showToast('存储空间不足，请清理旧记录', 'warning');
  }
};

// ── Word Book (单词本) ──

/**
 * Get the full word book.
 * @returns {{ rounds: Array<{roundId, date, words: Array<{english_std, chinese_std}>}> }}
 */
WORD.Storage.getWordBook = function () {
  return WORD.Storage._get('wordbook', { rounds: [] });
};

/**
 * Save a new round of wrong words from testing.
 * @param {Array<{english_std, chinese_std}>} words
 */
WORD.Storage.saveWordBookRound = function (words) {
  if (!words || !words.length) return;
  var book = WORD.Storage.getWordBook();
  var roundNumber = book.rounds.length + 1;
  book.rounds.push({
    roundId: WORD.Utils.generateRoundId(roundNumber),
    date: WORD.Utils.today(),
    words: words.map(function (w) {
      return { english_std: w.english_std, chinese_std: w.chinese_std };
    })
  });
  WORD.Storage._set('wordbook', book);
  return book.rounds[book.rounds.length - 1];
};

/**
 * Delete a specific round by roundId.
 */
WORD.Storage.deleteWordBookRound = function (roundId) {
  var book = WORD.Storage.getWordBook();
  book.rounds = book.rounds.filter(function (r) { return r.roundId !== roundId; });
  WORD.Storage._set('wordbook', book);
};

/**
 * Clear the entire word book.
 */
WORD.Storage.clearWordBook = function () {
  WORD.Storage._set('wordbook', { rounds: [] });
};

/**
 * Get all unique words from the word book (deduplicated by english_std).
 */
WORD.Storage.getWordBookUniqueWords = function () {
  var book = WORD.Storage.getWordBook();
  var seen = {};
  var unique = [];
  book.rounds.forEach(function (round) {
    round.words.forEach(function (w) {
      if (!seen[w.english_std]) {
        seen[w.english_std] = true;
        unique.push({ english_std: w.english_std, chinese_std: w.chinese_std });
      }
    });
  });
  return unique;
};

/**
 * Get selected words from word book (by round IDs and word indices).
 * @param {{roundId: string, wordIndices: number[]}[]} selections
 * @returns {Array<{english_std, chinese_std}>}
 */
WORD.Storage.getSelectedWords = function (selections) {
  var book = WORD.Storage.getWordBook();
  var result = [];
  var seen = {};
  selections.forEach(function (sel) {
    var round = book.rounds.find(function (r) { return r.roundId === sel.roundId; });
    if (!round) return;
    sel.wordIndices.forEach(function (idx) {
      if (idx >= 0 && idx < round.words.length) {
        var w = round.words[idx];
        var key = w.english_std + '|' + w.chinese_std;
        if (!seen[key]) {
          seen[key] = true;
          result.push({ english_std: w.english_std, chinese_std: w.chinese_std });
        }
      }
    });
  });
  return result;
};

// ── Practice Records (练习记录) ──

/**
 * Get all practice records.
 * @returns {Array<{id, type, direction, date, totalWords, correctCount, score, details}>}
 */
WORD.Storage.getRecords = function () {
  return WORD.Storage._get('records', []);
};

/**
 * Save a practice/test record.
 * @param {Object} record
 */
WORD.Storage.saveRecord = function (record) {
  var records = WORD.Storage.getRecords();
  record.id = 'REC' + Date.now();
  record.date = record.date || WORD.Utils.today();
  records.unshift(record);
  // Keep only the most recent 50 records
  if (records.length > 50) records = records.slice(0, 50);
  WORD.Storage._set('records', records);
};

/**
 * Clear all practice records.
 */
WORD.Storage.clearRecords = function () {
  WORD.Storage._set('records', []);
};

// ── LLM Config ──

WORD.Storage.saveLLMConfig = function () {
  WORD.Storage._set('llm_config', {
    apiKey: WORD.state.llm.apiKey,
    apiBase: WORD.state.llm.apiBase,
    model: WORD.state.llm.model,
    enabled: WORD.state.llm.enabled
  });
};

WORD.Storage.loadLLMConfig = function () {
  var config = WORD.Storage._get('llm_config', null);
  if (config) {
    WORD.state.llm.apiKey = config.apiKey || WORD.state.llm.apiKey;
    WORD.state.llm.apiBase = config.apiBase || WORD.state.llm.apiBase;
    WORD.state.llm.model = config.model || WORD.state.llm.model;
    WORD.state.llm.enabled = config.enabled !== undefined ? config.enabled : true;
  }
};

// ── TTS Config ──

WORD.Storage.saveTTSConfig = function () {
  WORD.Storage._set('tts_config', {
    appKey: WORD.state.tts.appKey,
    secretKey: WORD.state.tts.secretKey
  });
};

WORD.Storage.loadTTSConfig = function () {
  var config = WORD.Storage._get('tts_config', null);
  if (config) {
    WORD.state.tts.appKey = config.appKey || '';
    WORD.state.tts.secretKey = config.secretKey || '';
  }
};
