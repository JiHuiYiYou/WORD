/**
 * WORD v2 — 检测 (Testing) Module
 * Exam mode: multiple directions, random order, no feedback, results with scoring.
 */
WORD.Test = {};

// ── Constants ──

WORD.Test.LABELS = {
  '中译英': { label: '请写出以下内容的英文', inputPlaceholder: '输入英文...' },
  '英译中': { label: '请写出以下内容的中文', inputPlaceholder: '输入中文...' },
  '听音写义': { label: '请听音频，写出中文含义', inputPlaceholder: '输入中文...' },
  '听音写英': { label: '请听音频，写出英文单词', inputPlaceholder: '输入英文...' },
  '听音写英加义': { label: '请听音频，写出英文和中文', inputPlaceholderEng: '输入英文...', inputPlaceholderCh: '输入中文...' }
};

// ── Render / Setup ──

/**
 * Render the test section. If no words, show empty state. Otherwise show exam.
 */
WORD.Test.renderSetup = function (words) {
  words = words || WORD.state.wordList || [];
  WORD.state.test.words = words;
  WORD.state.test.completed = false;
  WORD.state.test.score = 0;
  WORD.state.test.currentIdx = 0;

  var section = document.getElementById('section-test');
  if (!section) return;

  if (!words || !words.length) {
    // Unified empty state (same as 加强)
    section.innerHTML =
      '<div class="empty-state" style="padding-top:80px;">' +
        '<div class="empty-icon"><i class="fas fa-clipboard-check"></i></div>' +
        '<h2 class="font-serif" style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--fg);">开始你的背默之旅</h2>' +
        '<p style="color:var(--muted);font-size:15px;max-width:400px;line-height:1.6;">在左侧边栏输入单词列表，<br>点击"保存并开始"即可开始检测。</p>' +
        '<button class="btn btn-primary" style="margin-top:24px;" onclick="WORD.Reinforce.toggleSidebar(true)">' +
          '<i class="fas fa-plus"></i> 添加单词</button>' +
      '</div>';
    return;
  }

  // Has words — show exam UI with direction buttons
  WORD.Test._renderExamUI(section);
};

WORD.Test._renderExamUI = function (section) {
  if (!section) section = document.getElementById('section-test');
  if (!section) return;

  var dir = WORD.state.test.direction || '中译英';

  var html = '<div class="section-inner">';
  // Direction buttons
  html += '<div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;">';
  WORD.DIRECTIONS.forEach(function (d) {
    html += '<button class="dir-btn' + (d === dir ? ' active' : '') + '" onclick="WORD.Test.selectDirection(\'' + d + '\')">' +
      '<i class="fas ' + (WORD.AUDIO_DIRECTIONS.indexOf(d) !== -1 ? 'fa-headphones' : 'fa-language') + '" style="margin-right:4px;"></i>' + d +
      '</button>';
  });
  html += '</div>';

  // Word count
  var words = WORD.state.test.words || [];
  html += '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;">共 ' + words.length + ' 个单词</div>';

  // Practice card
  html += '<div class="practice-card" id="testCard">';
  // Text prompt
  html += '<div style="text-align:center;margin-bottom:32px;" id="testPrompt">';
  html += '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;" id="testPromptLabel">请写出以下内容的英文</div>';
  html += '<div class="font-serif" style="font-size:36px;font-weight:900;line-height:1.3;" id="testPromptWord">—</div>';
  html += '</div>';
  // Audio prompt
  html += '<div style="text-align:center;margin-bottom:24px;display:none;" id="testAudioPrompt">';
  html += '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;">请听音频，写出答案</div>';
  html += '<button class="audio-play-btn" id="testAudioPlayBtn" onclick="WORD.Test.replayAudio()" title="点击播放/重播">';
  html += '<i class="fas fa-play play-icon" id="testAudioPlayIcon"></i></button>';
  html += '<p style="font-size:12px;color:var(--muted);margin-top:10px;">点击按钮播放 / 重播音频</p>';
  html += '</div>';
  // Answer input
  html += '<div style="max-width:480px;margin:0 auto 28px;">';
  html += '<input type="text" class="answer-input" id="testAnswerInput" placeholder="输入你的答案..." autocomplete="off" onkeydown="WORD.Test.handleKey(event)">';
  html += '<input type="text" class="answer-input" id="testAnswerInputCh" placeholder="输入中文意思..." autocomplete="off" style="display:none;margin-top:10px;" onkeydown="WORD.Test.handleKey(event)">';
  html += '</div>';
  // Navigation buttons
  html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">';
  html += '<button class="btn btn-secondary" id="testPrevBtn" onclick="WORD.Test.prevQuestion()" style="display:none;">' +
    '<i class="fas fa-arrow-left"></i> 上一题</button>';
  html += '<button class="btn btn-primary" id="testSubmitBtn" onclick="WORD.Test.submitAnswer()" style="min-width:160px;">下一题 <i class="fas fa-arrow-right"></i></button>';
  html += '</div>';
  html += '</div>';

  html += '</div>';

  section.innerHTML = html;
  WORD._syncSectionMargin();

  // Start the exam
  WORD.Test.start(dir);
};

// ── Direction Selection ──

WORD.Test.selectDirection = function (dir) {
  if (WORD.state.test.completed) return;
  WORD.state.test.direction = dir;
  // Re-render exam UI and restart with new direction
  var words = WORD.state.test.words;
  if (words && words.length) {
    WORD.Test._renderExamUI();
  }
};

// ── Start Exam ──

/**
 * Initialize and start the exam with the given direction.
 */
WORD.Test.start = function (direction) {
  var words = WORD.state.test.words;
  if (!words || words.length === 0) return;

  // Prepare shuffled word list with result storage
  var shuffled = WORD.Utils.shuffle(words);
  WORD.state.test.words = shuffled.map(function (w) {
    return {
      english_std: w.english_std,
      chinese_std: w.chinese_std,
      userEng: '',
      userCh: '',
      isCorrect: false
    };
  });
  WORD.state.test.direction = direction || WORD.state.test.direction || '中译英';
  WORD.state.test.currentIdx = 0;
  WORD.state.test.totalQuestions = WORD.state.test.words.length;
  WORD.state.test.completed = false;
  WORD.state.test.score = 0;

  // Render first question
  WORD.Test.renderQuestion();
};

// ── Render Question ──

/**
 * Show the current question based on progress and direction.
 */
WORD.Test.renderQuestion = function () {
  var words = WORD.state.test.words;
  var idx = WORD.state.test.currentIdx;
  var total = words.length;
  var direction = WORD.state.test.direction;
  var word = words[idx];
  var isAudio = WORD.isAudioMode(direction);
  var isDualInput = direction === '听音写英加义';

  // Progress in submit button
  var submitBtn = document.getElementById('testSubmitBtn');
  if (submitBtn) {
    submitBtn.innerHTML = (idx + 1 < total) ? ('下一题 <i class="fas fa-arrow-right"></i>') : ('完成检测 <i class="fas fa-check"></i>');
  }

  // Progress indicator
  var progressEl = document.getElementById('testProgress');
  if (!progressEl) {
    // Create progress element if not exists
    var card = document.getElementById('testCard');
    if (card) {
      var div = document.createElement('div');
      div.id = 'testProgress';
      div.style.cssText = 'text-align:center;margin-bottom:16px;font-size:14px;color:var(--muted);';
      card.parentNode.insertBefore(div, card);
    }
  }
  progressEl = document.getElementById('testProgress');
  if (progressEl) {
    progressEl.textContent = '第 ' + (idx + 1) + '/' + total + ' 题';
  }

  // Text prompt
  var promptArea = document.getElementById('testPrompt');
  var promptLabel = document.getElementById('testPromptLabel');
  var promptWord = document.getElementById('testPromptWord');

  if (promptArea) promptArea.style.display = isAudio ? 'none' : 'block';
  if (promptLabel) {
    var info = WORD.Test.LABELS[direction] || {};
    promptLabel.textContent = info.label || '';
  }
  if (promptWord) {
    if (direction === '中译英') {
      promptWord.textContent = word.chinese_std;
    } else if (direction === '英译中') {
      promptWord.textContent = word.english_std;
    }
  }

  // Audio prompt
  var audioPrompt = document.getElementById('testAudioPrompt');
  if (audioPrompt) {
    audioPrompt.style.display = isAudio ? 'block' : 'none';
    if (isAudio) {
      WORD.Test._playAudio(word.english_std);
    }
  }

  // Answer inputs
  var mainInput = document.getElementById('testAnswerInput');
  var chInput = document.getElementById('testAnswerInputCh');

  // Show/hide prev button
  var prevBtn = document.getElementById('testPrevBtn');
  if (prevBtn) {
    prevBtn.style.display = idx > 0 ? 'inline-flex' : 'none';
  }

  // Determine if main input expects English
  var mainInputIsEnglish = (direction === '中译英' || direction === '听音写英' || direction === '听音写英加义');

  if (mainInput) {
    mainInput.style.display = 'block';
    // Restore previous answer if any
    mainInput.value = isDualInput ? (word.userEng || '') : (mainInputIsEnglish ? (word.userEng || '') : (word.userCh || ''));
    mainInput.disabled = false;
    var info2 = WORD.Test.LABELS[direction] || {};
    mainInput.placeholder = isDualInput ? (info2.inputPlaceholderEng || '输入英文...') : (info2.inputPlaceholder || '输入...');
    // IME switching
    if (mainInputIsEnglish) {
      mainInput.setAttribute('lang', 'en');
      mainInput.setAttribute('inputmode', 'url');
      mainInput.setAttribute('autocapitalize', 'off');
      mainInput.setAttribute('spellcheck', 'false');
    } else {
      mainInput.setAttribute('lang', 'zh-CN');
      mainInput.removeAttribute('inputmode');
      mainInput.removeAttribute('autocapitalize');
      mainInput.setAttribute('spellcheck', 'true');
    }
  }

  if (chInput) {
    chInput.style.display = isDualInput ? 'block' : 'none';
    chInput.value = word.userCh || '';
    chInput.disabled = false;
    // Chinese input field — set for Chinese IME
    chInput.setAttribute('lang', 'zh-CN');
    chInput.removeAttribute('inputmode');
    chInput.setAttribute('spellcheck', 'true');
  }

  // Focus
  setTimeout(function () {
    var mi = document.getElementById('testAnswerInput');
    if (mi) mi.focus();
  }, 100);
};

// ── Audio Playback ──

WORD.Test._playAudio = function (text) {
  if (!text) return;
  var btn = document.getElementById('testAudioPlayBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
  }
  WORD.TTS.fetchTTSAudio(text).then(function (url) {
    var audio = new Audio(url);
    audio.onended = function () {
      WORD.state.audioPlaying = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play"></i> 重播';
      }
    };
    audio.onerror = function () {
      WORD.state.audioPlaying = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-repeat"></i> 重播';
      }
      WORD.UI.showToast('音频播放失败', 'error');
    };
    audio.play();
    WORD.state.audioPlaying = true;
    if (btn) {
      btn.innerHTML = '<i class="fas fa-volume-high"></i> 播放中...';
    }
  }).catch(function (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-repeat"></i> 重播';
    }
    WORD.UI.showToast('语音合成失败: ' + err.message, 'error');
  });
};

// ── Previous Question ──

WORD.Test.prevQuestion = function () {
  var idx = WORD.state.test.currentIdx;
  if (idx <= 0) return;
  WORD.state.test.currentIdx = idx - 1;
  WORD.Test.renderQuestion();
};

// ── Keyboard Handler ──

WORD.Test.handleKey = function (event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  var dir = WORD.state.test.direction;
  if (dir === '听音写英加义' && event.target.id === 'testAnswerInput') {
    var chInput = document.getElementById('testAnswerInputCh');
    if (chInput) { chInput.focus(); return; }
  }
  WORD.Test.submitAnswer();
};

// ── Submit Answer ──

/**
 * Store the current answer and advance to the next question.
 */
WORD.Test.submitAnswer = function () {
  var words = WORD.state.test.words;
  var idx = WORD.state.test.currentIdx;
  var total = words.length;
  var direction = WORD.state.test.direction;
  var word = words[idx];
  var isDualInput = direction === '听音写英加义';

  var mainInput = document.getElementById('testAnswerInput');
  var chInput = document.getElementById('testAnswerInputCh');

  // Read and store user answers
  var mainVal = mainInput ? mainInput.value.trim() : '';
  var chVal = chInput ? chInput.value.trim() : '';

  if (isDualInput) {
    word.userEng = mainVal;
    word.userCh = chVal;
  } else if (direction === '中译英' || direction === '听音写英') {
    word.userEng = mainVal;
    word.userCh = '';
  } else {
    // 英译中 or 听音写义
    word.userEng = '';
    word.userCh = mainVal;
  }

  // Disable inputs during transition
  if (mainInput) mainInput.disabled = true;
  if (chInput) chInput.disabled = true;

  // Advance to next question or finish
  if (idx + 1 < total) {
    WORD.state.test.currentIdx = idx + 1;
    WORD.Test.renderQuestion();
  } else {
    // All questions answered — compute results
    WORD.Test.computeResults();
  }
};

// ── Compute Results ──

/**
 * Async: check all answers (including LLM for Chinese answers), calculate score.
 * After initial scoring, re-reviews wrong answers with lenient LLM for possible salvage.
 */
WORD.Test.computeResults = function () {
  var words = WORD.state.test.words;
  var direction = WORD.state.test.direction;

  var sessionToken = Date.now();
  WORD.Test._currentSession = sessionToken;

  // Show loading in the section
  var section = document.getElementById('section-test');
  if (section) {
    section.innerHTML = '<div style="text-align:center;padding:80px 20px;">' +
      '<i class="fas fa-spinner fa-spin" style="font-size:40px;color:var(--accent);"></i>' +
      '<p style="margin-top:20px;color:var(--fg2);" id="scoringMsg">正在判卷中，请稍候...</p></div>';
  }

  var checkPromises = words.map(function (word) {
    return WORD.Test._checkWord(word, direction);
  });

  var timeout = new Promise(function (resolve) {
    setTimeout(function () { resolve('timeout'); }, 15000);
  });

  Promise.race([Promise.all(checkPromises), timeout]).then(function (results) {
    if (WORD.Test._currentSession !== sessionToken) return;

    if (results === 'timeout') {
      words.forEach(function (w) { w.isCorrect = false; });
    } else {
      words.forEach(function (word, i) { word.isCorrect = results[i]; });
    }

    // ── LLM Re-Review: lenient second pass on wrong answers ──
    return WORD.Test._reReviewWrongAnswers(words, direction, sessionToken);
  }).then(function () {
    if (WORD.Test._currentSession !== sessionToken) return;

    var correctCount = words.filter(function (w) { return w.isCorrect; }).length;
    WORD.state.test.score = Math.round((correctCount / words.length) * 100);

    WORD.Test.renderResults();
    WORD.Test.saveResults();
  }).catch(function () {
    if (WORD.Test._currentSession !== sessionToken) return;
    words.forEach(function (w) { w.isCorrect = false; });
    WORD.state.test.score = 0;
    WORD.Test.renderResults();
    WORD.Test.saveResults();
  });
};

/**
 * Re-review wrong answers with a lenient LLM standard.
 * Attempts to salvage answers that may be semantically correct but marked wrong.
 * @param {Array} words - All test words with isCorrect set from initial grading
 * @param {string} direction - Test direction
 * @param {number} sessionToken - Current session token
 * @returns {Promise}
 */
WORD.Test._reReviewWrongAnswers = function (words, direction, sessionToken) {
  // Collect wrong answers for review — only Chinese answers get lenient re-review
  // English answers (中译英, 听音写英) stay wrong
  var reviewItems = [];
  var reviewWordIndices = [];

  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (word.isCorrect) continue;

    if (direction === '英译中' || direction === '听音写义') {
      if (word.userCh) {
        reviewItems.push({ correct: word.chinese_std, user: word.userCh, type: 'ch' });
        reviewWordIndices.push(i);
      }
    } else if (direction === '听音写英加义') {
      // Only re-review if English part was already correct (word failed on Chinese part)
      var engPassed = WORD.Utils.compareEnglish(word.userEng, word.english_std);
      if (engPassed && word.userCh) {
        reviewItems.push({ correct: word.chinese_std, user: word.userCh, type: 'ch' });
        reviewWordIndices.push(i);
      }
    }
    // 中译英 / 听音写英: English answers — no lenient review, stay wrong
  }

  if (reviewItems.length === 0) return Promise.resolve();

  // Update loading message
  var msg = document.getElementById('scoringMsg');
  if (msg) {
    msg.textContent = '正在用AI复查 ' + reviewItems.length + ' 道错题，找补分数中...';
  }

  return WORD.LLM.batchReview(reviewItems).then(function (reviewResults) {
    if (WORD.Test._currentSession !== sessionToken) return;
    var salvaged = 0;
    for (var j = 0; j < reviewResults.length; j++) {
      if (reviewResults[j]) {
        words[reviewWordIndices[j]].isCorrect = true;
        salvaged++;
      }
    }
    if (salvaged > 0 && msg) {
      msg.textContent = 'AI复查完成，找回了 ' + salvaged + ' 分！';
    }
  }).catch(function () {
    // On error, keep original results — no changes
  });
};

/**
 * Check a single word's answer based on direction.
 * @param {Object} word - The word object with user answers
 * @param {string} direction
 * @returns {Promise<boolean>}
 */
WORD.Test._checkWord = function (word, direction) {
  switch (direction) {
    case '中译英':
      return Promise.resolve(WORD.Utils.compareEnglish(word.userEng, word.english_std));

    case '英译中':
      return WORD.Test._checkChineseAnswer(word.chinese_std, word.userCh);

    case '听音写义':
      return WORD.Test._checkChineseAnswer(word.chinese_std, word.userCh);

    case '听音写英':
      return Promise.resolve(WORD.Utils.compareEnglish(word.userEng, word.english_std));

    case '听音写英加义':
      // Both English AND Chinese must be correct
      var engCorrect = WORD.Utils.compareEnglish(word.userEng, word.english_std);
      if (!engCorrect) {
        return Promise.resolve(false);
      }
      return WORD.Test._checkChineseAnswer(word.chinese_std, word.userCh);

    default:
      return Promise.resolve(false);
  }
};

/**
 * Check a Chinese answer using LLM with fallback to exact match.
 * @param {string} correct
 * @param {string} user
 * @returns {Promise<boolean>}
 */
WORD.Test._checkChineseAnswer = function (correct, user) {
  if (!user) return Promise.resolve(false);
  if (!correct) return Promise.resolve(false);

  // Quick exact match first
  if (WORD.Utils.compareChinese(correct, user)) {
    return Promise.resolve(true);
  }

  // Use LLM for semantic matching
  return WORD.LLM.checkAnswer(correct, user).then(function (result) {
    return result.correct;
  }).catch(function () {
    // Fallback to exact match on error
    return WORD.Utils.compareChinese(correct, user);
  });
};

// ── Render Results ──

/**
 * Show the final results screen with score, grade, and results table.
 */
WORD.Test.renderResults = function () {
  var words = WORD.state.test.words;
  var total = words.length;
  var correctCount = words.filter(function (w) { return w.isCorrect; }).length;
  var wrongCount = total - correctCount;
  var score = WORD.state.test.score;
  var direction = WORD.state.test.direction;

  var section = document.getElementById('section-test');
  if (!section) return;

  var gradeText = score >= 90 ? '优秀' : (score >= 75 ? '良好' : (score >= 60 ? '及格' : '不及格'));
  var gradeColor = score >= 90 ? 'var(--success)' : (score >= 75 ? 'var(--accent)' : (score >= 60 ? 'var(--accent2)' : 'var(--error)'));

  var html = '<div class="section-inner">';
  // Score
  html += '<div class="test-results">';
  html += '<div class="test-score-circle" style="border-color:' + gradeColor + ';">';
  html += '<div class="test-score-number" style="color:' + gradeColor + ';">' + score + '</div>';
  html += '<div class="test-score-label">得分</div></div>';
  html += '<div class="test-grade" style="color:' + gradeColor + ';">' + gradeText + '</div>';

  // Stats
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">';
  html += '<div class="stat-card"><div class="stat-value" style="font-size:22px;">' + total + '</div><div class="stat-label">总题数</div></div>';
  html += '<div class="stat-card"><div class="stat-value" style="color:var(--success);font-size:22px;">' + correctCount + '</div><div class="stat-label">正确</div></div>';
  html += '<div class="stat-card"><div class="stat-value" style="color:var(--error);font-size:22px;">' + wrongCount + '</div><div class="stat-label">错误</div></div>';
  html += '</div>';

  // Filter
  html += '<div class="results-filter">';
  html += '<button class="btn btn-primary btn-sm" id="testFilterAll" onclick="WORD.Test.filterResults(\'all\')">显示全部</button>';
  html += '<button class="btn btn-secondary btn-sm" id="testFilterWrong" onclick="WORD.Test.filterResults(\'wrong\')">仅显示错误 (' + wrongCount + ')</button>';
  html += '</div>';

  // Table
  html += '<div class="card" style="padding:0;overflow:hidden;"><div style="max-height:400px;overflow-y:auto;"><table class="word-table"><thead><tr>';
  html += '<th style="width:40px;">#</th><th>英文</th><th>中文</th><th>你的答案</th><th style="width:60px;">结果</th>';
  html += '</tr></thead><tbody>';

  words.forEach(function (word, idx) {
    var isCorrect = word.isCorrect;
    var bg = isCorrect ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)';
    var userAnswerText = '';
    if (direction === '中译英' || direction === '听音写英') {
      userAnswerText = word.userEng || '(未填写)';
    } else if (direction === '听音写英加义') {
      var parts = [];
      if (word.userEng) parts.push(word.userEng);
      if (word.userCh) parts.push(word.userCh);
      userAnswerText = parts.length > 0 ? parts.join(' / ') : '(未填写)';
    } else {
      userAnswerText = word.userCh || '(未填写)';
    }
    var icon = isCorrect
      ? '<span style="color:var(--success);font-weight:700;"><i class="fas fa-check"></i></span>'
      : '<span style="color:var(--error);font-weight:700;"><i class="fas fa-xmark"></i></span>';
    html += '<tr style="background:' + bg + ';" class="test-result-row" data-correct="' + isCorrect + '">';
    html += '<td style="color:var(--muted);font-size:12px;">' + (idx + 1) + '</td>';
    html += '<td style="font-weight:600;">' + WORD.Utils.escapeHtml(word.english_std) + '</td>';
    html += '<td style="color:var(--fg2);">' + WORD.Utils.escapeHtml(word.chinese_std) + '</td>';
    html += '<td style="color:var(--fg2);">' + WORD.Utils.escapeHtml(userAnswerText) + '</td>';
    html += '<td style="text-align:center;">' + icon + '</td></tr>';
  });

  html += '</tbody></table></div></div>';

  html += '</div>';
  html += '</div>';

  section.innerHTML = html;
  WORD._syncSectionMargin();
};

// ── Filter Results ──

/**
 * Filter the results table by 'all' or 'wrong' mode.
 * @param {string} mode - 'all' or 'wrong'
 */
WORD.Test.filterResults = function (mode) {
  var rows = document.querySelectorAll('.test-result-row');
  var filterAll = document.getElementById('testFilterAll');
  var filterWrong = document.getElementById('testFilterWrong');

  if (filterAll) { filterAll.className = 'btn btn-sm ' + (mode === 'all' ? 'btn-primary' : 'btn-secondary'); }
  if (filterWrong) { filterWrong.className = 'btn btn-sm ' + (mode === 'wrong' ? 'btn-primary' : 'btn-secondary'); }

  for (var i = 0; i < rows.length; i++) {
    if (mode === 'wrong' && rows[i].getAttribute('data-correct') === 'true') {
      rows[i].style.display = 'none';
    } else {
      rows[i].style.display = '';
    }
  }
};

// ── Save Results ──

/**
 * Save wrong words to word book and save practice record.
 */
WORD.Test.saveResults = function () {
  var words = WORD.state.test.words;
  var direction = WORD.state.test.direction;
  var total = words.length;
  var correctCount = words.filter(function (w) { return w.isCorrect; }).length;
  var wrongCount = total - correctCount;
  var score = WORD.state.test.score;

  // Save wrong words to word book
  var wrongWords = words.filter(function (w) { return !w.isCorrect; }).map(function (w) {
    return { english_std: w.english_std, chinese_std: w.chinese_std };
  });

  if (wrongWords.length > 0) {
    WORD.Storage.saveWordBookRound(wrongWords);
    // Show toast after a brief delay to let results render first
    setTimeout(function () {
      WORD.UI.showToast('已将 ' + wrongWords.length + ' 个错词存入单词本', 'success');
    }, 500);
  }

  // Save practice record
  WORD.Storage.saveRecord({
    type: '检测',
    direction: direction,
    totalWords: total,
    correctCount: correctCount,
    score: score,
    details: words.map(function (w) {
      return {
        english: w.english_std,
        chinese: w.chinese_std,
        userEng: w.userEng,
        userCh: w.userCh,
        correct: w.isCorrect
      };
    })
  });
};

// ── Restart ──

/**
 * Restart the test with the same words and direction.
 */
WORD.Test.replayAudio = function () {
  var words = WORD.state.test.words;
  var word = words[WORD.state.test.currentIdx];
  if (word) WORD.Test._playAudio(word.english_std);
};

WORD.Test._restart = function () {
  var direction = WORD.state.test.direction;
  var words = WORD.state.test.words.map(function (w) {
    return { english_std: w.english_std, chinese_std: w.chinese_std };
  });
  WORD.state.test.words = words;
  WORD.Test.start(direction);
};
