/**
 * WORD v2 — Global Namespace & State
 * Must be loaded FIRST before any other WORD scripts.
 */
const WORD = {};

WORD.state = {
  // ── Navigation ──
  currentSection: 'home', // 'home' | 'memorize' | 'reinforce' | 'test'

  // ── Shared Word List ──
  wordList: [], // [{english_std, chinese_std}]

  // ── Memorization (背记) ──
  memorize: {
    words: [], // [{english_std, chinese_std, status: 'fresh'|'dull'|'unknown'|'mastered', dullUsed: bool}]
    currentIdx: 0,
    queue: [], // indices of non-mastered words (shuffled)
    complete: false
  },

  // ── Reinforcement (加强) ──
  reinforce: {
    standardAnswers: [],
    wordsDf: [],
    roundProgress: 0,
    direction: '中译英',
    targetCorrect: 2,
    showAnswer: false,
    currentRoundWords: [],
    wordListVisible: false,
    practiceStarted: false,
    sidebarCollapsed: false
  },

  // ── Testing (检测) ──
  test: {
    words: [], // [{english_std, chinese_std, userEng, userCh, isCorrect}]
    currentIdx: 0,
    direction: '中译英',
    completed: false,
    score: 0,
    totalQuestions: 0
  },

  // ── Audio (shared) ──
  audioBlobUrl: null,
  audioPlaying: false,
  audioLoaded: false,

  // ── LLM Config ──
  llm: {
    enabled: true,
    apiKey: '',
    apiBase: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },

  // ── TTS Config ──
  tts: {
    appKey: '',
    secretKey: ''
  },

  // ── Last answer (加强) ──
  lastAnswerCorrect: null
};

// Direction constants
WORD.DIRECTIONS = ['中译英', '英译中', '听音写义', '听音写英', '听音写英加义'];

// Audio mode directions
WORD.AUDIO_DIRECTIONS = ['听音写义', '听音写英', '听音写英加义'];

WORD.isAudioMode = function (direction) {
  return WORD.AUDIO_DIRECTIONS.includes(direction || WORD.state.reinforce.direction);
};
