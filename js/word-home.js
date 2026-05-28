/**
 * WORD v2 — Home Page Module
 * Navigation cards, word input, word book, practice records, LLM settings.
 *
 * Dependencies: WORD (global), WORD.state, WORD.Utils, WORD.UI, WORD.Storage, WORD.navigateTo
 */
WORD.Home = {};

// ── Internal State ──

WORD.Home._expanded = {};  // roundId -> boolean (word book round expand/collapse)

// ═══════════════════════════════════════════════════════════════════
//  Main Render
// ═══════════════════════════════════════════════════════════════════

WORD.Home.render = function () {
  var section = document.getElementById('section-home');
  if (!section) return;

  WORD.Home._inSubView = false;
  section.innerHTML =
    // ── Hero ──
    '<div class="home-hero">' +
      '<h1 class="font-serif"><span style="color:var(--accent);">W</span>ORD</h1>' +
      '<p>沉浸式单词背默系统 — 背记 · 加强 · 检测，一条龙掌握单词</p>' +
    '</div>' +

    // ── Navigation Cards ──
    '<div class="nav-cards" id="homeNavCards" style="grid-template-columns:repeat(3,1fr);">' +

      '<div class="nav-card" onclick="WORD.navigateTo(\'memorize\')">' +
        '<div class="card-icon memorize"><i class="fas fa-clone"></i></div>' +
        '<h3>背记</h3>' +
        '<p>闪卡式单词记忆，点击翻转查看释义</p>' +
        '<button class="btn btn-sm" style="background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);" onclick="event.stopPropagation();WORD.navigateTo(\'memorize\')">进入背记 <i class="fas fa-arrow-right"></i></button>' +
      '</div>' +

      '<div class="nav-card" onclick="WORD.navigateTo(\'reinforce\')">' +
        '<div class="card-icon reinforce"><i class="fas fa-dumbbell"></i></div>' +
        '<h3>加强</h3>' +
        '<p>中译英、听音写义等5种模式反复练习</p>' +
        '<button class="btn btn-sm" style="background:rgba(16,185,129,0.2);color:var(--accent);border:1px solid rgba(16,185,129,0.3);" onclick="event.stopPropagation();WORD.navigateTo(\'reinforce\')">进入加强 <i class="fas fa-arrow-right"></i></button>' +
      '</div>' +

      '<div class="nav-card" onclick="WORD.navigateTo(\'test\')">' +
        '<div class="card-icon test"><i class="fas fa-clipboard-check"></i></div>' +
        '<h3>检测</h3>' +
        '<p>真实考试模式，百分制评分，错词自动收录</p>' +
        '<button class="btn btn-sm" style="background:rgba(251,191,36,0.2);color:var(--accent2);border:1px solid rgba(251,191,36,0.3);" onclick="event.stopPropagation();WORD.navigateTo(\'test\')">进入检测 <i class="fas fa-arrow-right"></i></button>' +
      '</div>' +

    // 单词本 card
    '<div class="nav-card" onclick="WORD.Home.showWordBook()">' +
        '<div class="card-icon" style="background:rgba(251,191,36,0.18);color:var(--accent2);"><i class="fas fa-book"></i></div>' +
        '<h3>单词本</h3>' +
        '<p>检测错词自动收录，支持选择和导出</p>' +
        '<button class="btn btn-sm" style="background:rgba(251,191,36,0.2);color:var(--accent2);border:1px solid rgba(251,191,36,0.3);" onclick="event.stopPropagation();WORD.Home.showWordBook()">查看单词本 <i class="fas fa-arrow-right"></i></button>' +
      '</div>' +

    // 练习记录 card
    '<div class="nav-card" onclick="WORD.Home.showRecords()">' +
        '<div class="card-icon" style="background:rgba(16,185,129,0.18);color:var(--accent);"><i class="fas fa-clock-rotate-left"></i></div>' +
        '<h3>练习记录</h3>' +
        '<p>查看历史练习和检测记录</p>' +
        '<button class="btn btn-sm" style="background:rgba(16,185,129,0.2);color:var(--accent);border:1px solid rgba(16,185,129,0.3);" onclick="event.stopPropagation();WORD.Home.showRecords()">查看记录 <i class="fas fa-arrow-right"></i></button>' +
      '</div>' +

    // API 设置 card
    '<div class="nav-card" onclick="WORD.Home.showAPISettings()">' +
        '<div class="card-icon" style="background:rgba(139,92,246,0.18);color:#a78bfa;"><i class="fas fa-cog"></i></div>' +
        '<h3>API 设置</h3>' +
        '<p>DeepSeek + 有道 TTS 密钥配置</p>' +
        '<button class="btn btn-sm" style="background:rgba(139,92,246,0.2);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);" onclick="event.stopPropagation();WORD.Home.showAPISettings()">API 设置 <i class="fas fa-arrow-right"></i></button>' +
      '</div>' +

    '</div>';

};

// ═══════════════════════════════════════════════════════════════════
//  Word Book (单词本)
// ═══════════════════════════════════════════════════════════════════

WORD.Home.renderWordBook = function () {
  var container = document.getElementById('homeWordBookContainer');
  if (!container) return;

  var book = WORD.Storage.getWordBook();
  var rounds = book.rounds || [];

  if (rounds.length === 0) {
    container.innerHTML =
      '<div class="section-heading" style="margin-top:8px;"><i class="fas fa-book" style="color:var(--accent2);"></i> 单词本</div>' +
      '<div class="card" style="text-align:center;padding:36px;color:var(--muted);">' +
        '<i class="fas fa-inbox" style="font-size:32px;margin-bottom:10px;display:block;"></i>' +
        '暂无单词本记录<br><span style="font-size:12px;">完成检测后错词将自动存入</span></div>';
    return;
  }

  var html =
    '<div class="section-heading" style="margin-top:8px;"><i class="fas fa-book" style="color:var(--accent2);"></i> 单词本</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">' +
      '<button class="btn btn-sm btn-secondary" id="homeSelectAllBtn" onclick="WORD.Home._toggleSelectAll()">全选</button>' +
      '<button class="btn btn-sm btn-secondary" onclick="WORD.Home.copySelected()"><i class="fas fa-copy"></i> 复制选中</button>' +
      '<button class="btn btn-sm btn-primary" onclick="WORD.Home.sendTo(\'memorize\')"><i class="fas fa-clone"></i> 去背记</button>' +
      '<button class="btn btn-sm btn-gold" onclick="WORD.Home.sendTo(\'reinforce\')"><i class="fas fa-dumbbell"></i> 去加强</button>' +
      '<button class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:var(--error);border:1px solid rgba(239,68,68,0.25);" onclick="WORD.Home.sendTo(\'test\')"><i class="fas fa-clipboard-check"></i> 去检测</button>' +
      '<button class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="WORD.Home.clearWordBook()"><i class="fas fa-trash"></i> 清空</button>' +
    '</div>';

  for (var i = 0; i < rounds.length; i++) {
    var round = rounds[i];
    var isExpanded = WORD.Home._expanded[round.roundId] || false;
    var wordCount = (round.words && round.words.length) || 0;

    html +=
      '<div class="wordbook-round">' +
        '<div class="wordbook-round-header" onclick="WORD.Home.toggleRound(\'' + round.roundId + '\')">' +
          '<div style="display:flex;align-items:center;gap:10px;flex:1;">' +
            '<input type="checkbox" data-round-id="' + round.roundId + '" onclick="event.stopPropagation();WORD.Home._toggleRoundCheck(this)">' +
            '<span style="font-weight:600;font-size:14px;">第' + (i + 1) + '轮 (' + round.date + ')</span>' +
            '<span style="color:var(--muted);font-size:13px;">[' + wordCount + '个单词]</span>' +
          '</div>' +
          '<i class="fas ' + (isExpanded ? 'fa-chevron-up' : 'fa-chevron-down') + '" style="color:var(--muted);"></i>' +
        '</div>' +
        '<div class="wordbook-round-body' + (isExpanded ? ' open' : '') + '" id="wb-body-' + round.roundId + '">';

    var words = round.words || [];
    for (var j = 0; j < words.length; j++) {
      var w = words[j];
      html +=
        '<div class="wordbook-word-row">' +
          '<input type="checkbox" data-round-id="' + round.roundId + '" data-word-idx="' + j + '">' +
          '<span style="font-weight:600;">' + WORD.Utils.escapeHtml(w.english_std) + '</span>' +
          '<span style="color:var(--muted);">' + WORD.Utils.escapeHtml(w.chinese_std) + '</span>' +
        '</div>';
    }

    html += '</div></div>';
  }

  container.innerHTML = html;
};

WORD.Home.toggleRound = function (roundId) {
  WORD.Home._expanded[roundId] = !WORD.Home._expanded[roundId];
  WORD.Home.renderWordBook();
};

WORD.Home._toggleRoundCheck = function (checkbox) {
  var roundId = checkbox.getAttribute('data-round-id');
  var checked = checkbox.checked;
  var wordCheckboxes = document.querySelectorAll(
    '#homeWordBookContainer input[type="checkbox"][data-round-id="' + roundId + '"][data-word-idx]'
  );
  for (var i = 0; i < wordCheckboxes.length; i++) {
    wordCheckboxes[i].checked = checked;
  }
};

WORD.Home._toggleSelectAll = function () {
  var checkboxes = document.querySelectorAll(
    '#homeWordBookContainer input[type="checkbox"][data-word-idx]'
  );
  if (checkboxes.length === 0) return;

  var allChecked = true;
  for (var i = 0; i < checkboxes.length; i++) {
    if (!checkboxes[i].checked) {
      allChecked = false;
      break;
    }
  }

  var newState = !allChecked;
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = newState;
  }

  var btn = document.getElementById('homeSelectAllBtn');
  if (btn) btn.textContent = newState ? '取消全选' : '全选';
};

WORD.Home._getSelections = function () {
  var checkboxes = document.querySelectorAll(
    '#homeWordBookContainer input[type="checkbox"][data-word-idx]:checked'
  );
  var map = {};

  for (var i = 0; i < checkboxes.length; i++) {
    var roundId = checkboxes[i].getAttribute('data-round-id');
    var wordIdx = parseInt(checkboxes[i].getAttribute('data-word-idx'), 10);
    if (!map[roundId]) map[roundId] = [];
    map[roundId].push(wordIdx);
  }

  var result = [];
  for (var rid in map) {
    if (map.hasOwnProperty(rid)) {
      result.push({ roundId: rid, wordIndices: map[rid] });
    }
  }
  return result;
};

WORD.Home.copySelected = function () {
  var selections = WORD.Home._getSelections();
  if (selections.length === 0) {
    WORD.UI.showToast('请先选择要复制的单词', 'warning');
    return;
  }

  var words = WORD.Storage.getSelectedWords(selections);
  if (words.length === 0) {
    WORD.UI.showToast('未获取到选中单词', 'warning');
    return;
  }

  var lines = [];
  for (var i = 0; i < words.length; i++) {
    lines.push(words[i].english_std + ' ' + words[i].chinese_std);
  }
  var text = lines.join('\n');

  // Clipboard API with fallback
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      WORD.UI.showToast('已复制 ' + words.length + ' 个单词', 'success');
    }).catch(function () {
      WORD.Home._fallbackCopy(text, words.length);
    });
  } else {
    WORD.Home._fallbackCopy(text, words.length);
  }
};

WORD.Home._fallbackCopy = function (text, count) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    WORD.UI.showToast('已复制 ' + count + ' 个单词', 'success');
  } catch (e) {
    WORD.UI.showToast('复制失败，请手动复制', 'error');
  }
  document.body.removeChild(ta);
};

WORD.Home.sendTo = function (section) {
  var selections = WORD.Home._getSelections();
  if (selections.length === 0) {
    WORD.UI.showToast('请先选择要发送的单词', 'warning');
    return;
  }

  var words = WORD.Storage.getSelectedWords(selections);
  if (words.length === 0) {
    WORD.UI.showToast('未获取到选中单词', 'warning');
    return;
  }

  WORD.navigateTo(section, { words: words });
};

WORD.Home.clearWordBook = function () {
  if (confirm('确定要清空整个单词本吗？此操作不可撤销。')) {
    WORD.Storage.clearWordBook();
    WORD.Home.renderWordBook();
    WORD.UI.showToast('单词本已清空', 'info');
  }
};

// ═══════════════════════════════════════════════════════════════════
//  Practice Records (练习记录)
// ═══════════════════════════════════════════════════════════════════

WORD.Home._recordsTab = '背记'; // default tab

WORD.Home.renderRecords = function () {
  var container = document.getElementById('homeRecordsContainer');
  if (!container) return;

  var records = WORD.Storage.getRecords();

  var html =
    '<div class="section-heading"><i class="fas fa-clock-rotate-left" style="color:var(--accent);"></i> 练习记录</div>';

  if (!records || records.length === 0) {
    html += '<div class="card" style="text-align:center;padding:36px;color:var(--muted);">' +
      '<i class="fas fa-clock" style="font-size:32px;margin-bottom:10px;display:block;"></i>暂无练习记录</div>';
    container.innerHTML = html;
    return;
  }

  // Filter records by type
  var memorizeRecords = records.filter(function (r) { return r.type === '背记'; });
  var reinforceRecords = records.filter(function (r) { return r.type === '加强'; });
  var testRecords = records.filter(function (r) { return r.type === '检测'; });

  // Tab bar
  var tabs = [
    { key: '背记', label: '背记', count: memorizeRecords.length, icon: 'fa-clone', color: '#60a5fa' },
    { key: '加强', label: '加强', count: reinforceRecords.length, icon: 'fa-dumbbell', color: 'var(--accent)' },
    { key: '检测', label: '检测', count: testRecords.length, icon: 'fa-clipboard-check', color: 'var(--accent2)' }
  ];

  var activeTab = WORD.Home._recordsTab;
  // Fallback to first tab with records if current tab is empty
  var activeRecords = activeTab === '背记' ? memorizeRecords : (activeTab === '加强' ? reinforceRecords : testRecords);
  if (activeRecords.length === 0) {
    for (var t = 0; t < tabs.length; t++) {
      var tabRecords = tabs[t].key === '背记' ? memorizeRecords : (tabs[t].key === '加强' ? reinforceRecords : testRecords);
      if (tabRecords.length > 0) {
        activeTab = tabs[t].key;
        activeRecords = tabRecords;
        break;
      }
    }
  }

  html += '<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">';
  for (var ti = 0; ti < tabs.length; ti++) {
    var tab = tabs[ti];
    var isActive = tab.key === activeTab;
    html += '<button class="btn btn-sm" style="' +
      (isActive
        ? 'background:' + tab.color + ';color:#000;font-weight:700;border:1px solid ' + tab.color + ';'
        : 'background:var(--glass);color:var(--fg2);border:1px solid var(--border);') +
      'border-radius:8px;padding:8px 16px;font-size:13px;transition:all 0.2s;"' +
      ' onclick="WORD.Home._switchRecordsTab(\'' + tab.key + '\')">' +
      '<i class="fas ' + tab.icon + '" style="margin-right:5px;"></i>' + tab.label +
      ' <span style="opacity:0.7;font-size:11px;">(' + tab.count + ')</span>' +
      '</button>';
  }

  // Clear button
  html += '<button class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="WORD.Home._clearRecords()">' +
    '<i class="fas fa-trash"></i> 清空全部</button></div>';

  // Render table for active tab
  html += '<div style="overflow-x:auto;">' +
    '<table class="word-table"><thead><tr>' +
    '<th>模式</th><th>日期</th><th>得分</th><th>正确数/总数</th></tr></thead><tbody>';

  if (activeRecords.length === 0) {
    html += '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">暂无' + activeTab + '记录</td></tr>';
  } else {
    for (var i = 0; i < activeRecords.length; i++) {
      var rec = activeRecords[i];
      var directionLabel = rec.direction || '-';
      var dateLabel = rec.date || '-';
      var scoreLabel = rec.score !== undefined && rec.score !== null ? rec.score + '%' : '-';
      var correctCount = rec.correctCount || 0;
      var totalWords = rec.totalWords || 0;
      var scoreColor = rec.score >= 90 ? 'var(--success)' : (rec.score >= 60 ? 'var(--accent2)' : 'var(--error)');

      html += '<tr>' +
        '<td>' + WORD.Utils.escapeHtml(directionLabel) + '</td>' +
        '<td style="color:var(--fg2);">' + WORD.Utils.escapeHtml(dateLabel) + '</td>' +
        '<td style="color:' + scoreColor + ';font-weight:600;">' + scoreLabel + '</td>' +
        '<td>' + correctCount + '/' + totalWords + '</td>' +
        '</tr>';
    }
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;
};

WORD.Home._switchRecordsTab = function (tabKey) {
  WORD.Home._recordsTab = tabKey;
  WORD.Home.renderRecords();
};

WORD.Home._clearRecords = function () {
  if (confirm('确定要清空所有练习记录吗？此操作不可撤销。')) {
    WORD.Storage.clearRecords();
    WORD.Home._recordsTab = '背记';
    WORD.Home.renderRecords();
    WORD.UI.showToast('练习记录已清空', 'info');
  }
};

// ═══════════════════════════════════════════════════════════════════
//  Sub-views: Word Book & Records (from home nav cards)
// ═══════════════════════════════════════════════════════════════════

/**
 * Show word book view inline in the home section with a back button.
 */
WORD.Home.showWordBook = function () {
  var section = document.getElementById('section-home');
  if (!section) return;
  WORD.Home._inSubView = true;
  section.innerHTML =
    '<div style="max-width:840px;margin:0 auto;padding:24px 20px;">' +
      '<div id="homeWordBookContainer"></div>' +
    '</div>';

  WORD.Home.renderWordBook();
};

/**
 * Show practice records view inline in the home section with a back button.
 */
WORD.Home.showRecords = function () {
  var section = document.getElementById('section-home');
  if (!section) return;
  WORD.Home._inSubView = true;
  section.innerHTML =
    '<div style="max-width:840px;margin:0 auto;padding:24px 20px;">' +
      '<div id="homeRecordsContainer"></div>' +
    '</div>';

  WORD.Home.renderRecords();
};

// ═══════════════════════════════════════════════════════════════════
//  API Settings (LLM + TTS)
// ═══════════════════════════════════════════════════════════════════

WORD.Home.showAPISettings = function () {
  var section = document.getElementById('section-home');
  if (!section) return;
  WORD.Home._inSubView = true;
  section.innerHTML =
    '<div style="max-width:640px;margin:0 auto;padding:24px 20px;">' +
      // ── LLM Section ──
      '<div class="card" style="margin-bottom:20px;">' +
        '<h3 style="margin:0 0 4px;font-size:16px;"><i class="fas fa-robot" style="color:#a78bfa;"></i> DeepSeek LLM</h3>' +
        '<p style="color:var(--muted);font-size:12px;margin:0 0 16px;">用于中文语义智能判定。注册获取 Key：platform.deepseek.com</p>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;">' +
            '<input type="checkbox" id="homeLLMEnabled" ' + (WORD.state.llm.enabled ? 'checked' : '') + '> 启用 LLM 智能判定' +
          '</label>' +
          '<p style="color:var(--muted);font-size:12px;margin:4px 0 0 24px;">开启后中文语义判定使用 AI 智能判断，关闭则精确匹配</p>' +
        '</div>' +
        '<div style="display:grid;gap:12px;">' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">API Key</label>' +
            '<input type="password" id="homeLLMApiKey" class="input-field" value="' + WORD.Utils.escapeHtml(WORD.state.llm.apiKey) + '" placeholder="sk-...">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">API Base</label>' +
            '<input type="text" id="homeLLMApiBase" class="input-field" value="' + WORD.Utils.escapeHtml(WORD.state.llm.apiBase) + '">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">Model</label>' +
            '<input type="text" id="homeLLMModel" class="input-field" value="' + WORD.Utils.escapeHtml(WORD.state.llm.model) + '">' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:16px;">' +
          '<button class="btn btn-primary btn-sm" onclick="WORD.Home._testLLM(this)">测试连接</button>' +
        '</div>' +
      '</div>' +
      // ── TTS Section ──
      '<div class="card">' +
        '<h3 style="margin:0 0 4px;font-size:16px;"><i class="fas fa-volume-high" style="color:var(--accent);"></i> 有道 TTS</h3>' +
        '<p style="color:var(--muted);font-size:12px;margin:0 0 16px;">用于英文单词发音。注册获取 Key：ai.youdao.com</p>' +
        '<div style="display:grid;gap:12px;">' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">App Key</label>' +
            '<input type="password" id="homeTTSAppKey" class="input-field" value="' + WORD.Utils.escapeHtml(WORD.state.tts.appKey) + '" placeholder="应用ID">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">Secret Key</label>' +
            '<input type="password" id="homeTTSSecretKey" class="input-field" value="' + WORD.Utils.escapeHtml(WORD.state.tts.secretKey) + '" placeholder="应用密钥">' +
          '</div>' +
        '</div>' +
      '</div>' +
      // ── Save button ──
      '<div style="margin-top:16px;">' +
        '<button class="btn btn-primary" onclick="WORD.Home._saveAPIConfig()" style="width:100%;">' +
          '<i class="fas fa-floppy-disk"></i> 保存全部设置</button>' +
      '</div>' +
    '</div>';
};

WORD.Home._saveAPIConfig = function () {
  // Save LLM config
  var enabled = document.getElementById('homeLLMEnabled') ? document.getElementById('homeLLMEnabled').checked : false;
  var apiKey = document.getElementById('homeLLMApiKey') ? document.getElementById('homeLLMApiKey').value.trim() : '';
  var apiBase = document.getElementById('homeLLMApiBase') ? document.getElementById('homeLLMApiBase').value.trim() : '';
  var model = document.getElementById('homeLLMModel') ? document.getElementById('homeLLMModel').value.trim() : '';

  WORD.state.llm.enabled = enabled;
  WORD.state.llm.apiKey = apiKey;
  WORD.state.llm.apiBase = apiBase;
  WORD.state.llm.model = model;
  WORD.Storage.saveLLMConfig();

  // Save TTS config
  var ttsAppKey = document.getElementById('homeTTSAppKey') ? document.getElementById('homeTTSAppKey').value.trim() : '';
  var ttsSecretKey = document.getElementById('homeTTSSecretKey') ? document.getElementById('homeTTSSecretKey').value.trim() : '';

  WORD.state.tts.appKey = ttsAppKey;
  WORD.state.tts.secretKey = ttsSecretKey;
  WORD.Storage.saveTTSConfig();

  WORD.UI.showToast('API 设置已保存', 'success');
};

WORD.Home._testLLM = function (btn) {
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '测试中...';

  WORD.LLM.testConnection().then(function (result) {
    if (result.success) {
      WORD.UI.showToast(result.message, 'success');
    } else {
      WORD.UI.showToast(result.message, 'error');
    }
  }).catch(function (err) {
    WORD.UI.showToast('测试连接异常：' + err.message, 'error');
  }).finally(function () {
    btn.disabled = false;
    btn.textContent = '测试连接';
  });
};
