/**
 * WORD v2 — Youdao TTS Audio Module
 * Ported from v1 WORD.html. Uses Web Crypto API for SHA-256 signing.
 */
WORD.TTS = {};

// Audio cache: maps text → blob URL, avoids repeated API calls
WORD.TTS._cache = {};

WORD.TTS.config = {
  get appKey() { return WORD.state.tts.appKey; },
  get secretKey() { return WORD.state.tts.secretKey; },
  voiceName: 'youxiaodao',
  format: 'mp3',
  apiUrl: 'https://openapi.youdao.com/ttsapi'
};

WORD.TTS.sha256 = async function (message) {
  var encoder = new TextEncoder();
  var data = encoder.encode(message);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
};

WORD.TTS.generateSalt = function () {
  return crypto.randomUUID();
};

WORD.TTS.fetchTTSAudio = async function (text) {
  // Check cache first
  if (WORD.TTS._cache[text]) {
    return WORD.TTS._cache[text];
  }

  var salt = WORD.TTS.generateSalt();
  var curtime = Math.floor(Date.now() / 1000).toString();
  var q = text;
  var input;
  if (q.length > 20) {
    input = q.substring(0, 10) + q.length.toString() + q.substring(q.length - 10);
  } else {
    input = q;
  }
  var signStr = WORD.TTS.config.appKey + input + salt + curtime + WORD.TTS.config.secretKey;
  var sign = await WORD.TTS.sha256(signStr);

  var formData = new URLSearchParams();
  formData.append('q', q);
  formData.append('appKey', WORD.TTS.config.appKey);
  formData.append('salt', salt);
  formData.append('sign', sign);
  formData.append('signType', 'v3');
  formData.append('curtime', curtime);
  formData.append('voiceName', WORD.TTS.config.voiceName);
  formData.append('format', WORD.TTS.config.format);

  var response = await fetch(WORD.TTS.config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });

  var contentType = response.headers.get('Content-Type') || '';
  var audioUrl;
  if (contentType.includes('audio')) {
    var blob = await response.blob();
    audioUrl = URL.createObjectURL(blob);
  } else {
    var json = await response.json();
    if (json.errorCode && json.errorCode !== '0') {
      throw new Error('TTS Error [' + json.errorCode + ']: ' + (json.errorMsg || 'unknown'));
    }
    if (json.audio) {
      var binaryString = atob(json.audio);
      var bytes = new Uint8Array(binaryString.length);
      for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      var blob2 = new Blob([bytes], { type: 'audio/mp3' });
      audioUrl = URL.createObjectURL(blob2);
    } else if (json.audioUrl) {
      audioUrl = json.audioUrl;
    } else {
      throw new Error('TTS 响应中未找到音频数据');
    }
  }
  // Cache the result
  WORD.TTS._cache[text] = audioUrl;
  return audioUrl;
};

/**
 * Pre-fetch audio for all words to reduce API calls.
 */
WORD.TTS.prefetchAll = async function (words, onProgress) {
  var total = words.length;
  var done = 0;
  for (var i = 0; i < words.length; i++) {
    var text = words[i].english_std;
    if (WORD.TTS._cache[text]) { done++; continue; }
    try {
      await WORD.TTS.fetchTTSAudio(text);
      done++;
      if (onProgress) onProgress(done, total);
    } catch (e) {
      done++;
      if (onProgress) onProgress(done, total);
    }
  }
};

WORD.TTS.cleanup = function () {
  var btn = document.getElementById('audioPlayBtn');
  if (btn && btn._audioEl) {
    btn._audioEl.pause();
    btn._audioEl = null;
  }
  if (WORD.state.audioBlobUrl) {
    // Don't revoke cached URLs — they're reused
    var isCached = false;
    var cacheUrls = WORD.TTS._cache;
    for (var k in cacheUrls) {
      if (cacheUrls.hasOwnProperty(k) && cacheUrls[k] === WORD.state.audioBlobUrl) {
        isCached = true; break;
      }
    }
    if (!isCached) {
      URL.revokeObjectURL(WORD.state.audioBlobUrl);
    }
    WORD.state.audioBlobUrl = null;
  }
  WORD.state.audioLoaded = false;
  WORD.state.audioPlaying = false;
  WORD.TTS.updateBtnUI();
};

WORD.TTS.playCurrentWordAudio = async function (text) {
  if (!text) return;
  var btn = document.getElementById('audioPlayBtn');
  var icon = document.getElementById('audioPlayIcon');
  if (btn) {
    btn.classList.add('audio-loading');
    if (icon) icon.className = 'fas fa-spinner';
  }
  try {
    WORD.TTS.cleanup();
    var audioUrl = await WORD.TTS.fetchTTSAudio(text);
    WORD.state.audioBlobUrl = audioUrl;
    WORD.state.audioLoaded = true;
    var audio = new Audio(audioUrl);
    audio.onended = function () {
      WORD.state.audioPlaying = false;
      WORD.TTS.updateBtnUI();
    };
    audio.onerror = function () {
      WORD.state.audioPlaying = false;
      WORD.state.audioLoaded = false;
      WORD.TTS.updateBtnUI();
      WORD.UI.showToast('音频播放失败', 'error');
    };
    if (btn) {
      btn.classList.remove('audio-loading');
      btn._audioEl = audio;
    }
    audio.play();
    WORD.state.audioPlaying = true;
    WORD.TTS.updateBtnUI();
  } catch (err) {
    WORD.state.audioLoaded = false;
    WORD.state.audioPlaying = false;
    if (btn) btn.classList.remove('audio-loading');
    WORD.TTS.updateBtnUI();
    WORD.UI.showToast('语音合成失败：' + err.message, 'error');
  }
};

WORD.TTS.replay = function () {
  if (WORD.state.audioPlaying) return;
  if (!WORD.state.audioBlobUrl) {
    // Re-fetch with current word's English
    var currentWord = WORD.state.reinforce.currentRoundWords[WORD.state.reinforce.roundProgress];
    if (currentWord) {
      WORD.TTS.playCurrentWordAudio(currentWord.english_std);
    }
    return;
  }
  var audio = new Audio(WORD.state.audioBlobUrl);
  audio.onended = function () {
    WORD.state.audioPlaying = false;
    WORD.TTS.updateBtnUI();
  };
  audio.onerror = function () {
    WORD.state.audioPlaying = false;
    WORD.TTS.updateBtnUI();
    WORD.UI.showToast('音频播放失败', 'error');
  };
  var btn = document.getElementById('audioPlayBtn');
  if (btn) btn._audioEl = audio;
  audio.play();
  WORD.state.audioPlaying = true;
  WORD.TTS.updateBtnUI();
};

WORD.TTS.updateBtnUI = function () {
  var btn = document.getElementById('audioPlayBtn');
  var icon = document.getElementById('audioPlayIcon');
  var wave = document.getElementById('audioWave');
  var hint = document.getElementById('audioHint');
  if (!btn || !icon) return;
  if (WORD.state.audioPlaying) {
    btn.classList.add('playing');
    icon.className = 'fas fa-volume-high play-icon';
    if (wave) wave.style.display = 'flex';
    if (hint) hint.textContent = '正在播放...';
  } else {
    btn.classList.remove('playing');
    icon.className = 'fas fa-play play-icon';
    if (wave) wave.style.display = 'none';
    if (hint) hint.textContent = WORD.state.audioLoaded ? '点击重播音频' : '点击播放音频';
  }
};
