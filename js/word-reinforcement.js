/**
 * WORD v2 — Reinforcement Module (加强)
 * Enhanced practice system. Ports v1 WORD.html features and adds 9 v2 improvements:
 *   1. Keep hyphens in text (via WORD.Utils.filterCharacters)
 *   2. Keep Chinese punctuation (via WORD.Utils.filterCharacters)
 *   3. Auto-detect language order (via WORD.Utils.splitEnglishChinese)
 *   4. Collapsible sidebar (desktop collapse + overlay on mobile)
 *   5. Random word order per round (via WORD.Utils.shuffle)
 *   6. Remove maxlength from answer inputs
 *   7. LLM Chinese judgment for Chinese-answer directions
 *   8. Case-insensitive English comparison for English-answer directions
 *   9. InnerText j 听音写英加义 Enter key flow (English -> Chinese focus, Chinese -> submit)
 *   10. After mastered -> "进入检测" button in celebration overlay
 *
 * Dependencies: WORD, WORD.state, WORD.Utils, WORD.UI, WORD.TTS, WORD.LLM, WORD.Storage, WORD.navigateTo
 */

WORD.Reinforce = {};

// ═══════════════════════════════════════════════════════════════════════════════
// Audio helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if the current direction is an audio mode.
 */
WORD.Reinforce._isAudioMode = function () {
  var dir = WORD.state.reinforce.direction;
  return dir === '听音写义' || dir === '听音写英' || dir === '听音写英加义';
};

/**
 * Play TTS audio for the current word (delegates to WORD.TTS).
 */
WORD.Reinforce._playAudio = function () {
  var currentRoundWords = WORD.state.reinforce.currentRoundWords;
  if (!currentRoundWords.length) return;
  var currentWord = currentRoundWords[WORD.state.reinforce.roundProgress];
  var text = currentWord && currentWord.english_std;
  if (!text) return;
  WORD.TTS.playCurrentWordAudio(text);
};

/**
 * Replay current word audio (delegates to WORD.TTS).
 */
WORD.Reinforce._replayAudio = function () {
  WORD.TTS.replay();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sidebar toggle  (v2 improvement #4)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.toggleSidebar = function (forceOpen) {
  var sidebar = document.getElementById('sidebar');
  var mainContent = document.getElementById('mainContent');
  var overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;

  // Helper: update sidebar tab and section margin
  function updateTabAndMargin(collapsed) {
    var tab = document.getElementById('sidebarTab');
    var icon = document.getElementById('sidebarTabIcon');
    if (tab) {
      tab.style.left = collapsed ? '0' : '340px';
    }
    if (icon) {
      icon.className = 'fas fa-chevron-' + (collapsed ? 'right' : 'left');
    }
    var section = WORD.state.currentSection;
    if (section === 'reinforce') return;
    var target = document.getElementById('section-' + section);
    if (target) {
      target.style.marginLeft = collapsed ? '0' : '340px';
    }
  }

  if (window.innerWidth <= 768) {
    if (forceOpen) {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
      updateTabAndMargin(false);
      return;
    }
    var isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      updateTabAndMargin(true);
    } else {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
      updateTabAndMargin(false);
    }
  } else {
    if (forceOpen) {
      sidebar.classList.remove('collapsed');
      if (mainContent) mainContent.classList.remove('expanded');
      WORD.state.reinforce.sidebarCollapsed = false;
      updateTabAndMargin(false);
      return;
    }
    var isCollapsed = sidebar.classList.contains('collapsed');
    if (isCollapsed) {
      sidebar.classList.remove('collapsed');
      if (mainContent) mainContent.classList.remove('expanded');
      WORD.state.reinforce.sidebarCollapsed = false;
      updateTabAndMargin(false);
    } else {
      sidebar.classList.add('collapsed');
      if (mainContent) mainContent.classList.add('expanded');
      WORD.state.reinforce.sidebarCollapsed = true;
      updateTabAndMargin(true);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Target correct count adjustment
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.adjustTarget = function (delta) {
  var input = document.getElementById('targetCorrect');
  if (!input) return;
  var val = parseInt(input.value) + delta;
  val = Math.max(1, Math.min(10, val));
  input.value = val;
  WORD.state.reinforce.targetCorrect = val;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Word list input  (v2 improvement #3: uses splitEnglishChinese)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.setWordList = function () {
  var textarea = document.getElementById('wordInput');
  if (!textarea) return;
  var text = textarea.value;
  var validLines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l; });
  if (!validLines.length) {
    WORD.UI.showToast('请输入有效的单词行！', 'warning');
    return;
  }

  WORD.state.reinforce.standardAnswers = [];

  for (var i = 0; i < validLines.length; i++) {
    var cleanedLine = WORD.Utils.cleanText(validLines[i]);
    // v2 improvement #3: auto-detect which part is English / Chinese
    var parsed = WORD.Utils.splitEnglishChinese(cleanedLine);
    var engClean = parsed.english;
    var chiClean = parsed.chinese;
    if (!engClean && !chiClean) continue;
    WORD.state.reinforce.standardAnswers.push({
      english_std: engClean,
      chinese_std: chiClean
    });
  }

  WORD.Reinforce._renderEditEntries();
  WORD.UI.showToast('已设置 ' + validLines.length + ' 个单词！', 'success');
};

// ═══════════════════════════════════════════════════════════════════════════════
// Edit entries rendering
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce._renderEditEntries = function () {
  var container = document.getElementById('editEntries');
  var section = document.getElementById('editSection');
  var answers = WORD.state.reinforce.standardAnswers;

  if (!answers || !answers.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = 'block';
  if (!container) return;

  container.innerHTML = '';
  for (var i = 0; i < answers.length; i++) {
    var idx = i;
    var answer = answers[i];
    var entry = document.createElement('div');
    entry.className = 'edit-entry';
    entry.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="font-size:11px;font-weight:700;color:var(--accent);background:var(--glass);padding:2px 8px;border-radius:6px;">' + (idx + 1) + '</span>' +
        '<button class="btn btn-danger btn-sm" style="margin-left:auto;padding:2px 8px;" onclick="WORD.Reinforce._removeEntry(' + idx + ')">' +
          '<i class="fas fa-trash" style="font-size:10px;"></i>' +
        '</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<input type="text" class="input-field" value="' + WORD.Utils.escapeHtml(answer.english_std) + '" ' +
          'placeholder="英文" onchange="WORD.Reinforce._updateEntry(' + idx + ',\'english_std\',this.value)" style="flex:1;">' +
        '<input type="text" class="input-field" value="' + WORD.Utils.escapeHtml(answer.chinese_std) + '" ' +
          'placeholder="中文" onchange="WORD.Reinforce._updateEntry(' + idx + ',\'chinese_std\',this.value)" style="flex:1;">' +
      '</div>';
    container.appendChild(entry);
  }
};

WORD.Reinforce._updateEntry = function (idx, field, value) {
  if (WORD.state.reinforce.standardAnswers[idx]) {
    WORD.state.reinforce.standardAnswers[idx][field] = value;
  }
};

WORD.Reinforce._removeEntry = function (idx) {
  WORD.state.reinforce.standardAnswers.splice(idx, 1);
  WORD.Reinforce._renderEditEntries();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Save standard answers  ->  start practice
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.saveStandardAnswers = function () {
  var answers = WORD.state.reinforce.standardAnswers;
  if (!answers || !answers.length) {
    WORD.UI.showToast('没有可保存的单词！', 'warning');
    return;
  }

  // Sync values from edit entry inputs
  var entries = document.querySelectorAll('.edit-entry');
  for (var i = 0; i < entries.length; i++) {
    var inputs = entries[i].querySelectorAll('input[type="text"]');
    if (inputs[0] && WORD.state.reinforce.standardAnswers[i]) {
      WORD.state.reinforce.standardAnswers[i].english_std = inputs[0].value;
    }
    if (inputs[1] && WORD.state.reinforce.standardAnswers[i]) {
      WORD.state.reinforce.standardAnswers[i].chinese_std = inputs[1].value;
    }
  }

  // Build main data array
  WORD.state.reinforce.wordsDf = answers.map(function (a) {
    return {
      english_std: a.english_std,
      chinese_std: a.chinese_std,
      correct_count: 0,
      error_count: 0,
      is_mastered: false
    };
  });

  WORD.state.reinforce.roundProgress = 0;
  WORD.state.reinforce.showAnswer = false;
  WORD.state.reinforce.lastAnswerCorrect = null;
  WORD.state.reinforce.practiceStarted = true;
  WORD.state.reinforce._celebrationRecorded = false;
  WORD.Reinforce.refreshRound();

  WORD.UI.showToast('标准答案保存成功！', 'success');
  WORD.Reinforce.renderPractice();

  // v2 improvement #4: auto-collapse sidebar after saving
  var sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('collapsed') && window.innerWidth > 768) {
    WORD.Reinforce.toggleSidebar();
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Direction selection
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.setDirection = function (dir) {
  WORD.state.reinforce.direction = dir;
  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

  var btnIds = {
    '中译英': 'dirC2E',
    '英译中': 'dirE2C',
    '听音写义': 'dirListenMeaning',
    '听音写英': 'dirListenSpell',
    '听音写英加义': 'dirListenBoth'
  };

  for (var d in btnIds) {
    if (btnIds.hasOwnProperty(d)) {
      var btn = document.getElementById(btnIds[d]);
      if (btn) {
        btn.className = 'dir-btn' + (d === dir ? ' active' : '');
      }
    }
  }

  WORD.Reinforce.renderPractice();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Round management
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.getUnmastered = function () {
  return WORD.state.reinforce.wordsDf.filter(function (w) { return !w.is_mastered; });
};

WORD.Reinforce.refreshRound = function () {
  // v2 improvement #5: random word order each round
  WORD.state.reinforce.currentRoundWords = WORD.Utils.shuffle(WORD.Reinforce.getUnmastered());
  WORD.state.reinforce.roundProgress = 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Render practice UI
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.renderPractice = function () {
  var emptyState = document.getElementById('emptyState');
  var practiceArea = document.getElementById('practiceArea');
  var headerStats = document.getElementById('headerStats');
  var wordsDf = WORD.state.reinforce.wordsDf;

  if (!wordsDf || !wordsDf.length) {
    if (emptyState) emptyState.style.display = 'flex';
    if (practiceArea) practiceArea.style.display = 'none';
    if (headerStats) headerStats.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (practiceArea) practiceArea.style.display = 'block';
  if (headerStats) headerStats.style.display = 'flex';

  // If current round is empty, refresh
  if (WORD.state.reinforce.currentRoundWords.length === 0) {
    WORD.Reinforce.refreshRound();
  }

  var currentRoundWords = WORD.state.reinforce.currentRoundWords;
  var total = currentRoundWords.length;
  var allUnmastered = WORD.Reinforce.getUnmastered();
  var masteredCount = wordsDf.filter(function (w) { return w.is_mastered; }).length;
  var totalWords = wordsDf.length;

  // Update header stats
  var headerMastered = document.getElementById('headerMastered');
  var headerTotal = document.getElementById('headerTotal');
  if (headerMastered) headerMastered.textContent = masteredCount;
  if (headerTotal) headerTotal.textContent = totalWords;

  // All mastered -> celebration overlay
  var celebration = document.getElementById('celebrationOverlay');
  if (celebration) {
    if (allUnmastered.length === 0) {
      // Save practice record on first celebration
      if (!WORD.state.reinforce._celebrationRecorded) {
        WORD.state.reinforce._celebrationRecorded = true;
        WORD.Storage.saveRecord({
          type: '加强',
          direction: WORD.state.reinforce.direction,
          totalWords: totalWords,
          correctCount: masteredCount,
          score: totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0
        });
      }
      // v2 improvement #10: show "进入检测" button
      WORD.Reinforce._renderCelebration(celebration);
      celebration.style.display = 'flex';
      return;
    } else {
      celebration.style.display = 'none';
    }
  }

  // Update progress ring and bar
  var progress = total > 0 ? WORD.state.reinforce.roundProgress / total : 0;
  WORD.UI.updateProgressRing(progress);

  var progressDetail = document.getElementById('progressDetail');
  if (progressDetail) {
    progressDetail.textContent = (WORD.state.reinforce.roundProgress + 1) + ' / ' + total;
  }

  // Get current word
  var currentWord = currentRoundWords[WORD.state.reinforce.roundProgress];
  var useAudio = WORD.Reinforce._isAudioMode();

  // Toggle text prompt vs audio prompt
  var textPrompt = document.getElementById('textPrompt');
  var audioPrompt = document.getElementById('audioPrompt');
  if (textPrompt) textPrompt.style.display = useAudio ? 'none' : 'block';
  if (audioPrompt) audioPrompt.style.display = useAudio ? 'block' : 'none';

  // Second answer input (Chinese) only for 听音写英加义
  var answerInputCh = document.getElementById('answerInputCh');
  if (answerInputCh) {
    answerInputCh.style.display = WORD.state.reinforce.direction === '听音写英加义' ? 'block' : 'none';
  }

  // Placeholder for primary input
  var placeholders = {
    '听音写义': '输入中文意思...',
    '听音写英': '输入英文拼写...',
    '听音写英加义': '输入英文拼写...',
    '中译英': '输入英文...',
    '英译中': '输入中文...'
  };
  var answerInput = document.getElementById('answerInput');
  if (answerInput) {
    answerInput.placeholder = placeholders[WORD.state.reinforce.direction] || '输入你的答案...';
  }

  // Set prompt labels
  if (useAudio) {
    var audioLabels = {
      '听音写义': '请听音频，写出对应的中文意思',
      '听音写英': '请听音频，写出对应的英文拼写',
      '听音写英加义': '请听音频，写出英文拼写和中文意思'
    };
    var promptLabelAudio = document.getElementById('promptLabelAudio');
    if (promptLabelAudio) {
      promptLabelAudio.textContent = audioLabels[WORD.state.reinforce.direction] || '';
    }
  } else {
    var promptKey = WORD.state.reinforce.direction === '中译英' ? 'chinese_std' : 'english_std';
    var directionLabel = WORD.state.reinforce.direction === '中译英' ? '英文' : '中文';
    var promptLabel = document.getElementById('promptLabel');
    if (promptLabel) {
      promptLabel.textContent = '请写出以下内容的' + directionLabel;
    }
    var promptWord = document.getElementById('promptWord');
    if (promptWord) {
      promptWord.textContent = currentWord ? (currentWord[promptKey] || '—') : '—';
    }
  }

  // Stats cards
  var statTotal = document.getElementById('statTotal');
  var statMastered = document.getElementById('statMastered');
  var statUnmastered = document.getElementById('statUnmastered');
  if (statTotal) statTotal.textContent = totalWords;
  if (statMastered) statMastered.textContent = masteredCount;
  if (statUnmastered) statUnmastered.textContent = totalWords - masteredCount;

  // Determine if main input expects English or Chinese
  var mainInputIsEnglish = (WORD.state.reinforce.direction === '中译英' || WORD.state.reinforce.direction === '听音写英' || WORD.state.reinforce.direction === '听音写英加义');

  // Reset input / feedback state (only when not showing an answer)
  if (!WORD.state.reinforce.showAnswer) {
    if (answerInput) {
      answerInput.value = '';
      answerInput.disabled = false;
      answerInput.focus();
      answerInput.removeAttribute('maxlength');
      // IME switching: set lang/inputmode for English vs Chinese
      if (mainInputIsEnglish) {
        answerInput.setAttribute('lang', 'en');
        answerInput.setAttribute('inputmode', 'url');
        answerInput.setAttribute('autocapitalize', 'off');
        answerInput.setAttribute('spellcheck', 'false');
      } else {
        answerInput.setAttribute('lang', 'zh-CN');
        answerInput.removeAttribute('inputmode');
        answerInput.removeAttribute('autocapitalize');
        answerInput.setAttribute('spellcheck', 'true');
      }
    }
    if (answerInputCh) {
      answerInputCh.value = '';
      answerInputCh.disabled = false;
      answerInputCh.removeAttribute('maxlength');
      // Chinese input field — set for Chinese IME
      answerInputCh.setAttribute('lang', 'zh-CN');
      answerInputCh.removeAttribute('inputmode');
      answerInputCh.setAttribute('spellcheck', 'true');
    }

    var feedbackArea = document.getElementById('feedbackArea');
    if (feedbackArea) feedbackArea.style.display = 'none';

    var submitBtn = document.getElementById('submitBtn');
    var skipBtn = document.getElementById('skipBtn');
    if (submitBtn) submitBtn.style.display = 'inline-flex';
    if (skipBtn) skipBtn.style.display = 'inline-flex';

    var practiceCard = document.getElementById('practiceCard');
    if (practiceCard) practiceCard.className = 'practice-card';

    // Reset audio UI
    var audioWave = document.getElementById('audioWave');
    if (audioWave) audioWave.style.display = 'none';
    if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();
    if (WORD.TTS && WORD.TTS.updateBtnUI) WORD.TTS.updateBtnUI();
  }

  // Audio mode: auto-play TTS on new word
  if (useAudio && !WORD.state.reinforce.showAnswer) {
    setTimeout(function () { WORD.Reinforce._playAudio(); }, 400);
  }

  // Render word list table
  WORD.UI.renderWordTable(wordsDf, WORD.state.reinforce.targetCorrect);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Celebration overlay  (v2 improvement #10)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce._renderCelebration = function (container) {
  if (!container) return;
  var wordsDf = WORD.state.reinforce.wordsDf;
  var errorWords = wordsDf.filter(function (w) { return (w.error_count || 0) > 0; });
  var errorCount = errorWords.length;
  var allPassedCount = wordsDf.length - errorCount;

  var statsHTML = '';
  if (errorCount > 0) {
    statsHTML = '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:24px;flex-wrap:wrap;">' +
      '<div class="stat-card" style="min-width:80px;"><div class="stat-value" style="color:var(--success);">' + allPassedCount + '</div><div class="stat-label">一次过</div></div>' +
      '<div class="stat-card" style="min-width:80px;"><div class="stat-value" style="color:var(--accent2);">' + errorCount + '</div><div class="stat-label">错过</div></div>' +
      '</div>';
  }

  var testBtnLabel = errorCount > 0
    ? '<i class="fas fa-check-double"></i> 进入检测（仅错词 ' + errorCount + ' 个）'
    : '<i class="fas fa-check-double"></i> 进入检测';

  container.innerHTML =
    '<div class="mastery-content" style="text-align:center;">' +
      '<div style="font-size:80px;margin-bottom:20px;">🎓</div>' +
      '<h2 class="font-serif" style="font-size:36px;font-weight:900;color:var(--accent);margin-bottom:12px;">恭喜通关</h2>' +
      '<p style="font-size:18px;color:var(--fg2);margin-bottom:8px;">所有单词均已掌握，太棒了！</p>' +
      (errorCount > 0
        ? '<p style="font-size:14px;color:var(--muted);margin-bottom:16px;">' + allPassedCount + ' 个一次过，' + errorCount + ' 个曾答错 — 检测仅测错词</p>'
        : '<p style="font-size:14px;color:var(--muted);margin-bottom:16px;">全部一次通过！</p>') +
      statsHTML +
      '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">' +
        '<button class="btn btn-gold" style="font-size:16px;padding:14px 32px;" onclick="WORD.Reinforce.goToTest()">' +
          testBtnLabel + '</button>' +
        '<button class="btn btn-secondary" style="font-size:16px;padding:14px 32px;" onclick="WORD.Reinforce.restartPractice()">' +
          '<i class="fas fa-rotate"></i> 重新开始练习</button>' +
      '</div>' +
    '</div>';
};

// ═══════════════════════════════════════════════════════════════════════════════
// Go to test from celebration (only words with errors, or all if none)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.goToTest = function () {
  var wordsDf = WORD.state.reinforce.wordsDf;
  var errorWords = wordsDf.filter(function (w) { return (w.error_count || 0) > 0; });
  var testWords = errorWords.length > 0 ? errorWords : wordsDf;
  WORD.navigateTo('test', { words: testWords });
};

// ═══════════════════════════════════════════════════════════════════════════════
// Submit answer  (v2 improvement #7: async for LLM calls)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.submitAnswer = async function () {
  if (WORD.state.reinforce.showAnswer) {
    WORD.Reinforce.nextWord();
    return;
  }

  var input = document.getElementById('answerInput');
  var userAns = input ? input.value.trim() : '';

  if (WORD.state.reinforce.direction !== '听音写英加义' && !userAns) {
    WORD.UI.showToast('请输入答案！', 'warning');
    if (input) input.focus();
    return;
  }

  var currentRoundWords = WORD.state.reinforce.currentRoundWords;
  var currentWord = currentRoundWords[WORD.state.reinforce.roundProgress];
  if (!currentWord) return;

  var isRight;
  var correctAnswerText;

  if (WORD.state.reinforce.direction === '听音写英加义') {
    // Two inputs: English + Chinese
    var engInput = document.getElementById('answerInput');
    var chiInput = document.getElementById('answerInputCh');
    var engVal = engInput ? engInput.value.trim() : '';
    var chiVal = chiInput ? chiInput.value.trim() : '';

    if (!engVal && !chiVal) {
      WORD.UI.showToast('请输入英文拼写和中文意思！', 'warning');
      if (engInput) engInput.focus();
      return;
    }

    // v2 improvement #8: case-insensitive English comparison
    var engRight = WORD.Utils.compareEnglish(engVal, currentWord.english_std);

    // v2 improvement #7: LLM judgment for Chinese part only
    var chiResult = { correct: false, confidence: 0 };
    if (chiVal) {
      chiResult = await WORD.LLM.checkAnswer(currentWord.chinese_std, chiVal);
    }
    var chiRight = chiResult.correct;

    isRight = engRight && chiRight;
    correctAnswerText = currentWord.english_std + '  ' + currentWord.chinese_std;

  } else if (WORD.state.reinforce.direction === '中译英') {
    // v2 improvement #8: case-insensitive English comparison
    isRight = WORD.Utils.compareEnglish(userAns, currentWord.english_std);
    correctAnswerText = currentWord.english_std;

  } else if (WORD.state.reinforce.direction === '英译中') {
    // v2 improvement #7: LLM judgment for Chinese answer
    var resultE2C = await WORD.LLM.checkAnswer(currentWord.chinese_std, userAns);
    isRight = resultE2C.correct;
    correctAnswerText = currentWord.chinese_std;

  } else if (WORD.state.reinforce.direction === '听音写义') {
    // v2 improvement #7: LLM judgment for Chinese answer
    var resultListenMeaning = await WORD.LLM.checkAnswer(currentWord.chinese_std, userAns);
    isRight = resultListenMeaning.correct;
    correctAnswerText = currentWord.chinese_std;

  } else {
    // 听音写英: case-insensitive English comparison
    isRight = WORD.Utils.compareEnglish(userAns, currentWord.english_std);
    correctAnswerText = currentWord.english_std;
  }

  WORD.state.reinforce.lastAnswerCorrect = isRight;
  var card = document.getElementById('practiceCard');

  if (isRight) {
    // ── Correct answer ──
    if (card) card.className = 'practice-card correct-flash';

    // Find word in main data and update count
    var wordIndex = -1;
    for (var i = 0; i < WORD.state.reinforce.wordsDf.length; i++) {
      var w = WORD.state.reinforce.wordsDf[i];
      if (w.english_std === currentWord.english_std && w.chinese_std === currentWord.chinese_std) {
        wordIndex = i;
        break;
      }
    }
    if (wordIndex !== -1) {
      WORD.state.reinforce.wordsDf[wordIndex].correct_count += 1;
      if (WORD.state.reinforce.wordsDf[wordIndex].correct_count >= WORD.state.reinforce.targetCorrect) {
        WORD.state.reinforce.wordsDf[wordIndex].is_mastered = true;
      }
    }

    // Confetti effect
    if (card) {
      var rect = card.getBoundingClientRect();
      WORD.UI.spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
    }
    WORD.UI.showToast('答案正确！', 'success');
    if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

    // Auto-advance after 800ms
    setTimeout(function () {
      WORD.state.reinforce.roundProgress += 1;
      if (WORD.state.reinforce.roundProgress >= WORD.state.reinforce.currentRoundWords.length) {
        WORD.Reinforce.refreshRound();
      }
      WORD.state.reinforce.showAnswer = false;
      WORD.Reinforce.renderPractice();
    }, 800);

  } else {
    // ── Wrong answer ──
    if (card) card.className = 'practice-card wrong-flash';
    WORD.state.reinforce.showAnswer = true;
    // error_count is deferred to nextWord() — forceCorrect() can cancel it

    var feedbackArea = document.getElementById('feedbackArea');
    var feedbackIcon = document.getElementById('feedbackIcon');
    var feedbackText = document.getElementById('feedbackText');
    var feedbackAnswer = document.getElementById('feedbackAnswer');

    if (feedbackArea) feedbackArea.style.display = 'block';
    if (feedbackIcon) feedbackIcon.innerHTML = '<i class="fas fa-circle-xmark" style="color:var(--error);"></i>';
    if (feedbackText) feedbackText.innerHTML = '<span style="color:var(--error);">答案错误</span>';
    if (feedbackAnswer) {
      feedbackAnswer.innerHTML = '正确答案是：<strong style="color:var(--accent);">' +
        WORD.Utils.escapeHtml(correctAnswerText) +
        '</strong><br><span style="font-size:12px;">下一轮会再次出现～</span>' +
        '<br><button class="btn btn-sm" style="background:var(--accent2);color:#000;margin-top:12px;font-size:13px;" onclick="WORD.Reinforce.forceCorrect()">' +
        '<i class="fas fa-gavel"></i> 强行判对</button>';
    }

    var submitBtn = document.getElementById('submitBtn');
    var skipBtn = document.getElementById('skipBtn');
    if (submitBtn) submitBtn.style.display = 'none';
    if (skipBtn) skipBtn.style.display = 'none';

    if (input) input.disabled = true;
    var inputCh = document.getElementById('answerInputCh');
    if (inputCh) inputCh.disabled = true;

    if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();
    WORD.UI.showToast('答案错误！', 'error');
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Force correct — manually override a wrong answer as correct
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.forceCorrect = function () {
  var currentRoundWords = WORD.state.reinforce.currentRoundWords;
  var currentWord = currentRoundWords[WORD.state.reinforce.roundProgress];
  if (!currentWord) return;

  // Cancel pending error count — force correct means no error
  WORD.state.reinforce.lastAnswerCorrect = true;

  // Find word in main data and update count
  var wordIndex = -1;
  for (var i = 0; i < WORD.state.reinforce.wordsDf.length; i++) {
    var w = WORD.state.reinforce.wordsDf[i];
    if (w.english_std === currentWord.english_std && w.chinese_std === currentWord.chinese_std) {
      wordIndex = i;
      break;
    }
  }
  if (wordIndex !== -1) {
    WORD.state.reinforce.wordsDf[wordIndex].correct_count += 1;
    if (WORD.state.reinforce.wordsDf[wordIndex].correct_count >= WORD.state.reinforce.targetCorrect) {
      WORD.state.reinforce.wordsDf[wordIndex].is_mastered = true;
    }
  }

  // Confetti
  var card = document.getElementById('practiceCard');
  if (card) {
    card.className = 'practice-card correct-flash';
    var rect = card.getBoundingClientRect();
    WORD.UI.spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);
  }

  WORD.UI.showToast('已手动判为正确！', 'success');
  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

  // Auto-advance after 800ms
  var self = this;
  setTimeout(function () {
    WORD.state.reinforce.roundProgress += 1;
    if (WORD.state.reinforce.roundProgress >= WORD.state.reinforce.currentRoundWords.length) {
      WORD.Reinforce.refreshRound();
    }
    WORD.state.reinforce.showAnswer = false;
    WORD.Reinforce.renderPractice();
  }, 800);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Next word (after viewing feedback)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.nextWord = function () {
  // If answer was wrong (not skipped, not force-corrected), count as error
  if (WORD.state.reinforce.lastAnswerCorrect === false) {
    var currentRoundWords = WORD.state.reinforce.currentRoundWords;
    var currentWord = currentRoundWords[WORD.state.reinforce.roundProgress];
    if (currentWord) {
      for (var i = 0; i < WORD.state.reinforce.wordsDf.length; i++) {
        var w = WORD.state.reinforce.wordsDf[i];
        if (w.english_std === currentWord.english_std && w.chinese_std === currentWord.chinese_std) {
          w.error_count = (w.error_count || 0) + 1;
          break;
        }
      }
    }
  }

  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();
  WORD.state.reinforce.roundProgress += 1;
  if (WORD.state.reinforce.roundProgress >= WORD.state.reinforce.currentRoundWords.length) {
    WORD.Reinforce.refreshRound();
  }
  WORD.state.reinforce.showAnswer = false;
  WORD.state.reinforce.lastAnswerCorrect = null;
  WORD.Reinforce.renderPractice();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Skip word  (show answer immediately)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.skipWord = function () {
  var currentRoundWords = WORD.state.reinforce.currentRoundWords;
  var currentWord = currentRoundWords[WORD.state.reinforce.roundProgress];
  var answerText;

  if (WORD.state.reinforce.direction === '听音写英加义') {
    answerText = currentWord.english_std + '  ' + currentWord.chinese_std;
  } else if (WORD.state.reinforce.direction === '听音写义') {
    answerText = currentWord.chinese_std;
  } else if (WORD.state.reinforce.direction === '听音写英') {
    answerText = currentWord.english_std;
  } else {
    var dirKey = WORD.state.reinforce.direction === '中译英' ? 'english_std' : 'chinese_std';
    answerText = currentWord[dirKey];
  }

  WORD.state.reinforce.showAnswer = true;
  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

  var feedbackArea = document.getElementById('feedbackArea');
  var feedbackIcon = document.getElementById('feedbackIcon');
  var feedbackText = document.getElementById('feedbackText');
  var feedbackAnswer = document.getElementById('feedbackAnswer');
  var input = document.getElementById('answerInput');
  var submitBtn = document.getElementById('submitBtn');
  var skipBtn = document.getElementById('skipBtn');

  if (feedbackArea) feedbackArea.style.display = 'block';
  if (feedbackIcon) feedbackIcon.innerHTML = '<i class="fas fa-forward" style="color:var(--accent2);"></i>';
  if (feedbackText) feedbackText.innerHTML = '<span style="color:var(--accent2);">已跳过</span>';
  if (feedbackAnswer) {
    feedbackAnswer.innerHTML = '正确答案是：<strong style="color:var(--accent);">' +
      WORD.Utils.escapeHtml(answerText) + '</strong>';
  }
  if (submitBtn) submitBtn.style.display = 'none';
  if (skipBtn) skipBtn.style.display = 'none';
  if (input) input.disabled = true;

  var inputCh = document.getElementById('answerInputCh');
  if (inputCh) inputCh.disabled = true;

  WORD.UI.showToast('已跳过该单词', 'info');
};

// ═══════════════════════════════════════════════════════════════════════════════
// Word list table toggle
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.toggleWordList = function () {
  WORD.state.reinforce.wordListVisible = !WORD.state.reinforce.wordListVisible;
  var container = document.getElementById('wordListContainer');
  var icon = document.getElementById('toggleListIcon');
  var btn = document.getElementById('toggleListBtn');

  if (container) container.style.display = WORD.state.reinforce.wordListVisible ? 'block' : 'none';
  if (icon) icon.className = WORD.state.reinforce.wordListVisible ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
  if (btn) {
    var chevronClass = WORD.state.reinforce.wordListVisible ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    var label = WORD.state.reinforce.wordListVisible ? '收起' : '展开';
    btn.innerHTML = '<i class="' + chevronClass + '"></i> ' + label;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Restart practice  (reset all word counts, keep word list)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.restartPractice = function () {
  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

  var wordsDf = WORD.state.reinforce.wordsDf;
  for (var i = 0; i < wordsDf.length; i++) {
    wordsDf[i].correct_count = 0;
    wordsDf[i].error_count = 0;
    wordsDf[i].is_mastered = false;
  }

  WORD.state.reinforce.roundProgress = 0;
  WORD.state.reinforce.showAnswer = false;
  WORD.state.reinforce.lastAnswerCorrect = null;
  WORD.state.reinforce._celebrationRecorded = false;
  WORD.Reinforce.refreshRound();

  var celebration = document.getElementById('celebrationOverlay');
  if (celebration) celebration.style.display = 'none';

  WORD.UI.showToast('已重置，重新开始练习！', 'info');
  WORD.Reinforce.renderPractice();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Reset all data  (clear everything back to initial state)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.resetAll = function () {
  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

  WORD.state.reinforce.standardAnswers = [];
  WORD.state.reinforce.wordsDf = [];
  WORD.state.reinforce.roundProgress = 0;
  WORD.state.reinforce.showAnswer = false;
  WORD.state.reinforce.lastAnswerCorrect = null;
  WORD.state.reinforce.practiceStarted = false;
  WORD.state.reinforce.currentRoundWords = [];

  var wordInput = document.getElementById('wordInput');
  if (wordInput) wordInput.value = '';

  var editSection = document.getElementById('editSection');
  if (editSection) editSection.style.display = 'none';

  var celebration = document.getElementById('celebrationOverlay');
  if (celebration) celebration.style.display = 'none';

  WORD.UI.showToast('已重置所有数据', 'info');
  WORD.Reinforce.renderPractice();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Enter key handler  (v2 improvement #9: 听音写英加义 Enter flow)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.handleAnswerKey = function (event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();

  if (WORD.state.reinforce.direction === '听音写英加义') {
    if (event.target.id === 'answerInput') {
      // English input -> move focus to Chinese input
      var chiInput = document.getElementById('answerInputCh');
      if (chiInput) {
        chiInput.focus();
      }
      return;
    }
    // Chinese input (answerInputCh) -> submit (falls through)
  }

  WORD.Reinforce.submitAnswer();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Target correct input change handler
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce._setupEventListeners = function () {
  if (WORD.Reinforce._listenersSetup) return;
  WORD.Reinforce._listenersSetup = true;

  var targetInput = document.getElementById('targetCorrect');
  if (targetInput) {
    targetInput.addEventListener('change', function () {
      var val = parseInt(this.value);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 10) val = 10;
      this.value = val;
      WORD.state.reinforce.targetCorrect = val;

      // Re-check mastered status for all words
      var wordsDf = WORD.state.reinforce.wordsDf;
      for (var i = 0; i < wordsDf.length; i++) {
        wordsDf[i].is_mastered = wordsDf[i].correct_count >= val;
      }

      if (WORD.state.reinforce.practiceStarted) {
        WORD.Reinforce.renderPractice();
      }
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sidebar overlay click  (close on mobile overlay tap)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.closeSidebarOverlay = function () {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
};

// ═══════════════════════════════════════════════════════════════════════════════
// Init from shared word list (called by WORD.saveAndStart)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.saveStandardAnswersFromList = function (standardAnswers) {
  WORD.state.reinforce.standardAnswers = standardAnswers;
  WORD.state.reinforce.wordsDf = standardAnswers.map(function (a) {
    return {
      english_std: a.english_std,
      chinese_std: a.chinese_std,
      correct_count: 0,
      error_count: 0,
      is_mastered: false
    };
  });
  WORD.state.reinforce.roundProgress = 0;
  WORD.state.reinforce.showAnswer = false;
  WORD.state.reinforce.lastAnswerCorrect = null;
  WORD.state.reinforce.practiceStarted = true;
  WORD.state.reinforce._celebrationRecorded = false;
  WORD.Reinforce.refreshRound();
  WORD.Reinforce._renderEditEntries();
  WORD.Reinforce.renderPractice();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Init with words from external source (memorize, home word book, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.initWithWords = function (words) {
  if (!words || !words.length) return;
  WORD.state.reinforce.standardAnswers = words.map(function (w) {
    return { english_std: w.english_std, chinese_std: w.chinese_std };
  });
  WORD.state.reinforce.wordsDf = words.map(function (w) {
    return {
      english_std: w.english_std,
      chinese_std: w.chinese_std,
      correct_count: 0,
      error_count: 0,
      is_mastered: false
    };
  });
  WORD.state.reinforce.roundProgress = 0;
  WORD.state.reinforce.showAnswer = false;
  WORD.state.reinforce.lastAnswerCorrect = null;
  WORD.state.reinforce.practiceStarted = true;
  WORD.state.reinforce._celebrationRecorded = false;
  WORD.Reinforce.refreshRound();
  WORD.Reinforce._renderEditEntries();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main render entry point  (called by WORD.navigateTo)
// ═══════════════════════════════════════════════════════════════════════════════

WORD.Reinforce.render = function () {
  // Set up one-time event listeners
  WORD.Reinforce._setupEventListeners();

  // Restore sidebar collapsed state on desktop
  if (window.innerWidth > 768) {
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('mainContent');
    if (sidebar && mainContent) {
      if (WORD.state.reinforce.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
      } else {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
      }
    }
  }

  WORD.Reinforce.renderPractice();
};
