/**
 * WORD v2 — App Initialization & Navigation
 * Loaded last. Initializes particles, navigation, and first render.
 */
WORD.appInitialized = false;

// ── Navigation Between Sections ──

// ── Sync Section Margin with Sidebar ──

WORD._syncSectionMargin = function () {
  var section = WORD.state.currentSection;
  if (section === 'reinforce' || section === 'home') return; // reinforce uses CSS classes, home has no sidebar
  var sidebar = document.getElementById('sidebar');
  var target = document.getElementById('section-' + section);
  if (!target || !sidebar) return;
  var collapsed = sidebar.classList.contains('collapsed');
  target.style.marginLeft = collapsed ? '0' : '340px';
  target.style.transition = 'margin-left 0.4s cubic-bezier(0.16,1,0.3,1)';
};

// ── Sidebar Scroll ──

WORD.scrollSidebarToBottom = function () {
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.scrollTo({ top: sidebar.scrollHeight, behavior: 'smooth' });
  }
};

WORD._initSidebarScrollBtn = function () {
  var sidebar = document.getElementById('sidebar');
  var btn = document.getElementById('sidebarScrollBtn');
  if (!sidebar || !btn || WORD._scrollBtnInited) return;
  WORD._scrollBtnInited = true;

  function updateBtn() {
    var nearBottom = sidebar.scrollTop + sidebar.clientHeight >= sidebar.scrollHeight - 60;
    if (nearBottom) {
      btn.classList.remove('visible');
    } else {
      btn.classList.add('visible');
    }
  }

  sidebar.addEventListener('scroll', updateBtn);
  // Initial check
  updateBtn();
};

// ── Go Home with confirmation ──

WORD.goHome = function () {
  if (WORD.Home._inSubView) {
    WORD.Home.render();
    return;
  }
  if (WORD.state.currentSection === 'home') return;
  WORD.navigateTo('home');
};

// ── Navigation Between Sections ──

WORD.navigateTo = function (section, options) {
  options = options || {};
  // Clean up audio
  if (WORD.TTS && WORD.TTS.cleanup) WORD.TTS.cleanup();

  // Determine sidebar visibility early (used by section margin below)
  var showSidebar = (section === 'memorize' || section === 'reinforce' || section === 'test');
  var sidebar = document.getElementById('sidebar');
  var mainContent = document.getElementById('mainContent');
  var sidebarTab = document.getElementById('sidebarTab');

  // Hide all sections
  var sections = document.querySelectorAll('.app-section');
  for (var i = 0; i < sections.length; i++) {
    sections[i].style.display = 'none';
  }

  // Show target section
  var target = document.getElementById('section-' + section);
  if (target) {
    target.style.display = 'block';
    if (showSidebar && section !== 'reinforce') {
      target.style.marginLeft = '340px';
      target.style.transition = 'margin-left 0.4s cubic-bezier(0.16,1,0.3,1)';
    } else {
      target.style.marginLeft = '';
    }
  }

  // Update state
  WORD.state.currentSection = section;

  // Update nav bar title
  WORD.UI.renderNav();

  if (showSidebar) {
    if (sidebar) { sidebar.style.display = ''; sidebar.classList.remove('collapsed'); WORD._initSidebarScrollBtn(); }
    if (sidebarTab) { sidebarTab.style.display = 'flex'; sidebarTab.classList.remove('collapsed'); }
    WORD.state.reinforce.sidebarCollapsed = false;
    if (section === 'reinforce') {
      if (mainContent) { mainContent.style.display = ''; mainContent.classList.remove('expanded'); }
    } else {
      if (mainContent) mainContent.style.display = 'none';
    }
  } else {
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (sidebarTab) sidebarTab.style.display = 'none';
  }

  // Update current section in sidebar so save knows which section we're in
  WORD.state._sidebarSection = section;

  // Pre-fill sidebar textarea with existing words
  var wordInput = document.getElementById('wordInput');
  if (wordInput && WORD.state.wordList.length > 0 && !wordInput.value) {
    var lines = [];
    for (var w = 0; w < WORD.state.wordList.length; w++) {
      lines.push(WORD.state.wordList[w].english_std + ' ' + WORD.state.wordList[w].chinese_std);
    }
    wordInput.value = lines.join('\n');
    // Also render edit entries if reinforcing
    if (WORD.Reinforce && WORD.Reinforce._renderEditEntries) {
      WORD.state.reinforce.standardAnswers = WORD.state.wordList;
      WORD.Reinforce._renderEditEntries();
    }
  }

  // Render the section
  if (section === 'home' && WORD.Home) {
    WORD.Home.render();
  } else if (section === 'memorize' && WORD.Memorize) {
    WORD.Memorize.init(options.words || WORD.state.wordList);
  } else if (section === 'reinforce' && WORD.Reinforce) {
    if (options.words && options.words.length) {
      WORD.Reinforce.initWithWords(options.words);
    }
    WORD.Reinforce.render();
  } else if (section === 'test' && WORD.Test) {
    var testWords = options.words || WORD.state.wordList;
    WORD.state.test.words = testWords;
    if (options.start) {
      WORD.Test.start(options.direction || WORD.state.test.direction);
    } else {
      WORD.Test.renderSetup(testWords);
    }
  }

  // Scroll top
  window.scrollTo(0, 0);
};

// ── Background Particles ──

WORD.initBgCanvas = function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var PARTICLE_COUNT = 50;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.max(0.5, Math.random() * 2),
      alpha: 0.1 + Math.random() * 0.2,
      color: Math.random() > 0.7 ? '#10b981' : (Math.random() > 0.5 ? '#fbbf24' : '#06b6d4')
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 0.5;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    animate();
  }
};

// ── Shared Save & Start (sidebar button) ──

WORD.saveAndStart = function () {
  var textarea = document.getElementById('wordInput');
  if (!textarea) return;
  var text = textarea.value;
  var validLines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l; });
  if (!validLines.length) {
    WORD.UI.showToast('请输入有效的单词行！', 'warning');
    return;
  }

  // Parse words into shared list
  var standardAnswers = [];
  for (var i = 0; i < validLines.length; i++) {
    var cleanedLine = WORD.Utils.cleanText(validLines[i]);
    var parsed = WORD.Utils.splitEnglishChinese(cleanedLine);
    if (!parsed.english && !parsed.chinese) continue;
    standardAnswers.push({ english_std: parsed.english, chinese_std: parsed.chinese });
  }
  if (!standardAnswers.length) {
    WORD.UI.showToast('未能解析出有效单词！', 'warning');
    return;
  }

  // Sync edit entry inputs
  var entries = document.querySelectorAll('.edit-entry');
  for (var e = 0; e < entries.length; e++) {
    var inputs = entries[e].querySelectorAll('input[type="text"]');
    if (inputs[0] && standardAnswers[e]) standardAnswers[e].english_std = inputs[0].value;
    if (inputs[1] && standardAnswers[e]) standardAnswers[e].chinese_std = inputs[1].value;
  }

  // Save to shared word list
  WORD.state.wordList = standardAnswers;

  // Auto-collapse sidebar on desktop
  var sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('collapsed') && window.innerWidth > 768) {
    sidebar.classList.add('collapsed');
    var mc = document.getElementById('mainContent');
    if (mc) mc.classList.add('expanded');
    WORD.state.reinforce.sidebarCollapsed = true;
    // Sync tab position
    var tab = document.getElementById('sidebarTab');
    var icon = document.getElementById('sidebarTabIcon');
    if (tab) tab.style.left = '0';
    if (icon) icon.className = 'fas fa-chevron-right';
  }

  WORD.UI.showToast('已保存 ' + standardAnswers.length + ' 个单词！', 'success');

  // Pre-fetch TTS audio in background
  WORD.TTS.prefetchAll(standardAnswers);

  // Start the current section
  var section = WORD.state._sidebarSection || 'reinforce';
  if (section === 'memorize') {
    WORD.Memorize.init(standardAnswers);
  } else if (section === 'reinforce') {
    WORD.Reinforce.saveStandardAnswersFromList(standardAnswers);
  } else if (section === 'test') {
    WORD.Test.renderSetup(standardAnswers);
  }
};

// ── Responsive Handler ──

WORD.handleResponsive = function () {
  var sidebar = document.getElementById('sidebar');
  var mainContent = document.getElementById('mainContent');
  var toggle = document.getElementById('sidebarToggle');
  if (!sidebar || !mainContent) return;
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('collapsed');
    sidebar.classList.remove('open');
    mainContent.classList.add('expanded');
    if (toggle) toggle.classList.add('visible');
  } else {
    sidebar.classList.remove('open');
    mainContent.classList.remove('expanded');
    if (toggle) toggle.classList.add('visible');
  }
};

// ── Init ──

window.addEventListener('DOMContentLoaded', function () {
  if (WORD.appInitialized) return;
  WORD.appInitialized = true;

  // Load configs from localStorage
  if (WORD.Storage && WORD.Storage.loadLLMConfig) {
    WORD.Storage.loadLLMConfig();
  }
  if (WORD.Storage && WORD.Storage.loadTTSConfig) {
    WORD.Storage.loadTTSConfig();
  }

  // Init background particles
  WORD.initBgCanvas();

  // Handle responsive
  WORD.handleResponsive();
  window.addEventListener('resize', WORD.handleResponsive);

  // Start on home
  WORD.navigateTo('home');
});
