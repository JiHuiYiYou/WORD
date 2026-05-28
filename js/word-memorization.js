/**
 * WORD v2 — Memorization (背记) Flashcard Module
 * State-machine based flashcard queue for vocabulary memorization.
 * Depends on: WORD (global), WORD.state, WORD.Utils, WORD.UI, WORD.navigateTo
 */
WORD.Memorize = {};

// ── Initialization ──

/**
 * Initialize a memorization session with a list of words.
 * @param {Array<{english_std: string, chinese_std: string}>} words
 */
WORD.Memorize.init = function (words) {
  var memorizeState = WORD.state.memorize;

  // If no words, show empty prompt
  if (!words || !words.length) {
    WORD.Memorize.renderEmpty();
    return;
  }

  memorizeState.words = words.map(function (w) {
    return {
      english_std: w.english_std,
      chinese_std: w.chinese_std,
      status: 'fresh',
      dullUsed: false
    };
  });
  memorizeState.complete = false;
  memorizeState._recordSaved = false;
  memorizeState.queue = [];
  memorizeState.currentIdx = 0;

  WORD.Memorize.shuffleQueue();
  WORD.Memorize.render();
};

/**
 * Render the empty state when no words are available.
 */
WORD.Memorize.renderEmpty = function () {
  var section = document.getElementById('section-memorize');
  section.innerHTML =
    '<div class="section-inner">' +
      '<div class="empty-state">' +
        '<div class="empty-icon"><i class="fas fa-clone"></i></div>' +
        '<h2 class="font-serif" style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--fg);">开始你的背默之旅</h2>' +
        '<p style="color:var(--muted);font-size:15px;max-width:400px;line-height:1.6;">在左侧边栏输入单词列表，<br>点击"保存并开始"即可开始背记。</p>' +
        '<button class="btn btn-primary" style="margin-top:24px;" onclick="WORD.Reinforce.toggleSidebar(true)">' +
          '<i class="fas fa-plus"></i> 添加单词</button>' +
      '</div>' +
    '</div>';
};

// ── Queue Management ──

/**
 * Shuffle all non-mastered word indices into the queue.
 */
WORD.Memorize.shuffleQueue = function () {
  var state = WORD.state.memorize;
  var indices = [];
  for (var i = 0; i < state.words.length; i++) {
    if (state.words[i].status !== 'mastered') {
      indices.push(i);
    }
  }
  state.queue = WORD.Utils.shuffle(indices);
};

/**
 * Check whether all words have been mastered.
 * @returns {boolean}
 */
WORD.Memorize.isComplete = function () {
  var words = WORD.state.memorize.words;
  for (var i = 0; i < words.length; i++) {
    if (words[i].status !== 'mastered') {
      return false;
    }
  }
  return true;
};

/**
 * Get progress stats.
 * @returns {{total: number, mastered: number, remaining: number}}
 */
WORD.Memorize.getProgress = function () {
  var words = WORD.state.memorize.words;
  var total = words.length;
  var mastered = 0;
  for (var i = 0; i < words.length; i++) {
    if (words[i].status === 'mastered') {
      mastered++;
    }
  }
  return { total: total, mastered: mastered, remaining: total - mastered };
};

// ── Render ──

/**
 * Render the current flashcard and action buttons.
 */
WORD.Memorize.render = function () {
  var state = WORD.state.memorize;
  var section = document.getElementById('section-memorize');

  // If words array is empty, show empty state
  if (!state.words || !state.words.length) {
    WORD.Memorize.renderEmpty();
    WORD.UI.renderNav();
    return;
  }

  // Check for completion
  if (state.complete || WORD.Memorize.isComplete()) {
    state.complete = true;
    WORD.Memorize.renderComplete();
    WORD.UI.renderNav();
    return;
  }

  // If queue is empty but non-mastered words remain, rebuild
  if (state.queue.length === 0) {
    WORD.Memorize.shuffleQueue();
    state.currentIdx = 0;
  }

  // Re-check completion after potential rebuild
  if (WORD.Memorize.isComplete()) {
    state.complete = true;
    WORD.Memorize.renderComplete();
    WORD.UI.renderNav();
    return;
  }

  var progress = WORD.Memorize.getProgress();
  var currentWordIdx = state.queue[state.currentIdx];
  var currentWord = state.words[currentWordIdx];

  // Determine which action buttons to show based on word status
  var showKnown = false;
  var showDull = false;
  var showUnknown = false;

  if (currentWord.status === 'fresh') {
    showKnown = true;
    showDull = true;
    showUnknown = true;
  } else if (currentWord.status === 'dull') {
    showKnown = true;
    showDull = true;
  } else if (currentWord.status === 'unknown') {
    showDull = true;
    showUnknown = true;
  }

  // Show dull hint when a word that was dulled from 'fresh' appears again
  var showDullHint = (currentWord.status === 'dull' && !currentWord.dullUsed);

  var html = '';
  html += '<div class="section-inner">';

  // ── Progress ──
  var pct = progress.total > 0 ? (progress.mastered / progress.total) * 100 : 0;
  html += '<div style="max-width:480px;margin:0 auto 28px;">';
  html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px;">';
  html += '<span>剩余 ' + progress.remaining + ' 个</span>';
  html += '<span>' + progress.mastered + '/' + progress.total + ' 已认识</span>';
  html += '</div>';
  html += '<div style="height:4px;border-radius:2px;background:var(--border);overflow:hidden;">';
  html += '<div style="height:100%;border-radius:2px;background:var(--accent);transition:width 0.5s ease;width:' + pct + '%;"></div>';
  html += '</div></div>';

  // ── Flashcard with flip animation ──
  var wordId = 'flip-' + currentWordIdx;
  html += '<div class="memorize-flashcard" onclick="WORD.Memorize.flipCard(\'' + wordId + '\')">';
  html += '<div class="flip-container">';
  html += '<div class="flip-inner" id="' + wordId + '">';

  // Front: English word
  html += '<div class="flip-front">';
  html += '<div class="word-display">' + WORD.Utils.escapeHtml(currentWord.english_std) + '</div>';
  html += '<div class="word-sub">点击翻转查看释义</div>';
  html += '</div>';

  // Back: Chinese meaning
  html += '<div class="flip-back">';
  html += '<div class="word-display-chinese">' + WORD.Utils.escapeHtml(currentWord.chinese_std) + '</div>';
  html += '<div class="word-sub">' + WORD.Utils.escapeHtml(currentWord.english_std) + '</div>';
  html += '</div>';

  html += '</div></div>';
  html += '</div>';

  // Dull hint
  if (showDullHint) {
    html += '<div style="margin-top:16px;padding:10px 16px;border-radius:10px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);font-size:13px;color:var(--accent2);text-align:center;">';
    html += '<i class="fas fa-circle-exclamation" style="margin-right:6px;"></i>这个单词之前标记为钝角，请再次确认';
    html += '</div>';
  }

  // ── Action buttons ──
  html += '<div class="memorize-actions">';
  if (showKnown) {
    html += '<button class="memorize-btn known" onclick="WORD.Memorize.handleChoice(\'known\')">' +
      '<i class="fas fa-check"></i> 认识</button>';
  }
  if (showDull) {
    html += '<button class="memorize-btn dull" onclick="WORD.Memorize.handleChoice(\'dull\')">' +
      '<i class="fas fa-question"></i> 钝角</button>';
  }
  if (showUnknown) {
    html += '<button class="memorize-btn unknown" onclick="WORD.Memorize.handleChoice(\'unknown\')">' +
      '<i class="fas fa-xmark"></i> 不认识</button>';
  }
  html += '</div>';

  html += '</div>';

  section.innerHTML = html;
  WORD._syncSectionMargin();
  // Auto-play audio for the current word
  setTimeout(function () {
    WORD.TTS.playCurrentWordAudio(currentWord.english_std);
  }, 300);
};

// ── Flip Animation ──

WORD.Memorize.flipCard = function (flipId) {
  var inner = document.getElementById(flipId);
  if (!inner) return;
  if (inner.classList.contains('flipped')) {
    inner.classList.remove('flipped');
  } else {
    inner.classList.add('flipped');
  }
};

/**
 * Render the completion screen when all words are mastered.
 */
WORD.Memorize.renderComplete = function () {
  var section = document.getElementById('section-memorize');
  var progress = WORD.Memorize.getProgress();

  // Save practice record (only once per session)
  if (!WORD.state.memorize._recordSaved) {
    WORD.state.memorize._recordSaved = true;
    WORD.Storage.saveRecord({
      type: '背记',
      direction: '闪卡',
      totalWords: progress.total,
      correctCount: progress.mastered,
      score: progress.total > 0 ? Math.round((progress.mastered / progress.total) * 100) : 0
    });
  }

  var html = '';
  html += '<div class="section-inner">';
  html += '<div class="memorize-complete">';
  html += '<div style="font-size:80px;margin-bottom:20px;color:var(--success);">';
  html += '<i class="fas fa-check-circle"></i></div>';
  html += '<h2 class="font-serif" style="font-size:36px;font-weight:900;color:var(--accent);margin-bottom:12px;">全部认识！</h2>';
  html += '<p style="font-size:16px;color:var(--muted);margin-bottom:32px;">所有单词均已掌握，太棒了！</p>';
  html += '<button class="btn btn-gold" style="font-size:16px;padding:14px 32px;" onclick="WORD.Memorize.goToReinforce()">';
  html += '<i class="fas fa-arrow-right"></i> 进入加强练习</button>';
  html += '</div>';
  html += '</div>';

  section.innerHTML = html;

  // Celebration confetti
  WORD.UI.spawnConfetti(
    Math.floor(window.innerWidth / 2),
    Math.floor(window.innerHeight / 2),
    60
  );
};

/**
 * Advance to the next word in the queue without changing the current word's status.
 * Rebuilds the queue if exhausted.
 */
WORD.Memorize.nextWord = function () {
  var state = WORD.state.memorize;
  state.currentIdx++;
  if (state.currentIdx >= state.queue.length) {
    if (WORD.Memorize.isComplete()) {
      state.complete = true;
      WORD.Memorize.render();
      return;
    }
    WORD.Memorize.shuffleQueue();
    state.currentIdx = 0;
  }
  WORD.Memorize.render();
};

/**
 * Navigate to the reinforce section with mastered words.
 */
WORD.Memorize.goToReinforce = function () {
  var words = WORD.state.memorize.words.map(function (w) {
    return { english_std: w.english_std, chinese_std: w.chinese_std };
  });
  WORD.navigateTo('reinforce', { words: words });
};

// ── Choice Handling ──

/**
 * Handle a user's choice for the current flashcard word.
 * @param {'known'|'dull'|'unknown'} choice
 */
WORD.Memorize.handleChoice = function (choice) {
  var state = WORD.state.memorize;
  var wordIdx = state.queue[state.currentIdx];
  var word = state.words[wordIdx];

  // First, flip the card to show Chinese meaning
  var flipId = 'flip-' + wordIdx;
  var inner = document.getElementById(flipId);
  if (inner && !inner.classList.contains('flipped')) {
    inner.classList.add('flipped');
  }

  // Disable buttons during the delay
  var buttons = document.querySelectorAll('.memorize-btn');
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].disabled = true;
    buttons[b].style.opacity = '0.5';
    buttons[b].style.pointerEvents = 'none';
  }

  // Wait 800ms, then process the choice and advance
  setTimeout(function () {
    // Apply state machine transitions
    switch (word.status) {

      case 'fresh':
        if (choice === 'known') {
          word.status = 'mastered';
          state.queue.splice(state.currentIdx, 1);
        } else if (choice === 'dull') {
          word.status = 'dull';
          word.dullUsed = false;
          state.currentIdx++;
        } else if (choice === 'unknown') {
          word.status = 'unknown';
          state.currentIdx++;
        }
        break;

      case 'dull':
        if (choice === 'known') {
          word.status = 'mastered';
          state.queue.splice(state.currentIdx, 1);
        } else if (choice === 'dull') {
          word.status = 'mastered';
          state.queue.splice(state.currentIdx, 1);
        }
        break;

      case 'unknown':
        if (choice === 'dull') {
          word.status = 'dull';
          word.dullUsed = true;
          state.currentIdx++;
        } else if (choice === 'unknown') {
          state.currentIdx++;
        }
        break;
    }

    // Check if the queue is exhausted
    if (state.currentIdx >= state.queue.length) {
      if (WORD.Memorize.isComplete()) {
        state.complete = true;
        WORD.Memorize.render();
        return;
      }
      WORD.Memorize.shuffleQueue();
      state.currentIdx = 0;
    }

    WORD.Memorize.render();
  }, 700);
};
