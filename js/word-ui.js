/**
 * WORD v2 — Shared UI Components
 * Toast, Confetti, Modal, Progress Ring, Navigation Bar.
 */
WORD.UI = {};

// ── Toast Notification ──

WORD.UI.showToast = function (message, type, duration) {
  type = type || 'info';
  duration = duration || 3000;
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  var icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
  toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('out');
    setTimeout(function () { toast.remove(); }, 300);
  }, duration);
};

// ── Confetti ──

WORD.UI.spawnConfetti = function (x, y, count) {
  count = count || 30;
  var colors = ['#10b981', '#fbbf24', '#06b6d4', '#f43f5e', '#8b5cf6', '#22c55e'];
  for (var i = 0; i < count; i++) {
    var el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.width = (6 + Math.random() * 8) + 'px';
    el.style.height = (6 + Math.random() * 8) + 'px';
    var angle = Math.random() * Math.PI * 2;
    var velocity = 100 + Math.random() * 200;
    var dx = Math.cos(angle) * velocity;
    el.style.animation = 'confettiFall ' + (1 + Math.random() * 1) + 's ease-out forwards';
    el.style.transform = 'translateX(' + (dx * 0.3) + 'px)';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2500);
  }
};

// ── Modal ──

WORD.UI.showModal = function (htmlContent) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content card">' + htmlContent + '</div>';
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return {
    close: function () { overlay.remove(); },
    el: overlay
  };
};

// ── Progress Ring ──

WORD.UI.updateProgressRing = function (progress) {
  var ring = document.getElementById('progressRing');
  var text = document.getElementById('progressText');
  var bar = document.getElementById('progressBar');
  if (!ring && !text) return;
  var circumference = 2 * Math.PI * 34;
  if (ring) ring.style.strokeDashoffset = circumference * (1 - progress);
  if (text) text.textContent = Math.round(progress * 100) + '%';
  if (bar) bar.style.width = (progress * 100) + '%';
};

// ── Word Table ──

WORD.UI.renderWordTable = function (words, targetCorrect, containerId) {
  containerId = containerId || 'wordTableBody';
  var tbody = document.getElementById(containerId);
  if (!tbody) return;
  tbody.innerHTML = '';
  var tc = targetCorrect || WORD.state.reinforce.targetCorrect || 2;
  words.forEach(function (word, idx) {
    var tr = document.createElement('tr');
    if (word.is_mastered) tr.className = 'mastered';
    var statusBadge = word.is_mastered
      ? '<span class="badge badge-success"><i class="fas fa-check" style="font-size:9px;"></i> 已达标</span>'
      : '<span class="badge badge-danger"><i class="fas fa-xmark" style="font-size:9px;"></i> 未达标</span>';
    var errorCount = word.error_count || 0;
    var errorBadge = '';
    if (errorCount === 0) {
      errorBadge = '<span style="color:var(--success);font-size:12px;">0</span>';
    } else if (errorCount === 1) {
      errorBadge = '<span style="color:var(--accent2);font-weight:600;font-size:12px;">' + errorCount + '</span>';
    } else {
      errorBadge = '<span style="color:var(--error);font-weight:700;font-size:12px;">' + errorCount + '</span>';
    }
    tr.innerHTML =
      '<td style="color:var(--muted);font-size:12px;">' + (idx + 1) + '</td>' +
      '<td style="font-weight:600;">' + WORD.Utils.escapeHtml(word.english_std) + '</td>' +
      '<td style="color:var(--fg2);">' + WORD.Utils.escapeHtml(word.chinese_std) + '</td>' +
      '<td>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<div style="flex:1;height:4px;border-radius:2px;background:var(--border);overflow:hidden;max-width:40px;">' +
            '<div style="height:100%;border-radius:2px;background:var(--accent);width:' + Math.min(100, (word.correct_count / tc) * 100) + '%;transition:width 0.3s;"></div>' +
          '</div>' +
          '<span style="font-size:12px;color:var(--muted);">' + word.correct_count + '/' + tc + '</span>' +
        '</div>' +
      '</td>' +
      '<td style="text-align:center;">' + errorBadge + '</td>' +
      '<td>' + statusBadge + '</td>';
    tbody.appendChild(tr);
  });
};

// ── Navigation ──

WORD.UI.renderNav = function () {
  var sectionNames = { home: '主页', memorize: '背记', reinforce: '加强', test: '检测' };
  var current = WORD.state.currentSection;
  var title = sectionNames[current] || 'WORD';
  var nav = document.getElementById('sectionTitle');
  if (nav) {
    nav.innerHTML = '<span class="font-serif nav-title-text">' + title + '</span><span class="font-serif nav-home-hint">返回主页</span>';
  }
};
