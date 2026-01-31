// audio.js - Enhanced Audio System with improved sound feedback (fixed mobile init and state)

let currentMusic = null;
let musicVolume = 0.5;
let uiVolume = 0.7;
let isMusicPlaying = false;
let isMusicPaused = false;
let currentTrackIndex = 0;
let musicPlaylist = [];
let musicMode = 'sequential';

// Audio Context for UI sounds
let audioContext = null;

// Available music tracks (will be auto-populated)
let musicTracks = [];

// State for music continuity
let pausedMusicState = {
  trackId: null,
  currentTime: 0,
  paused: false,
  audioElement: null
};

// IMPROVED Audio settings with better linking sound
const SOUND_SETTINGS = {
  good: { baseFreq: 800, type: 'sine' },
  bad: { baseFreq: 300, type: 'sawtooth' },
  warning: { baseFreq: 500, type: 'square' },
  better: { baseFreq: 700, type: 'sine' },
  repeat: { baseFreq: 400, type: 'triangle' },
  link: {
    baseFreq: 350,
    minFreq: 350,
    maxFreq: 1400,
    minLength: 2,
    maxLength: 12,
    duration: 0.25,
    type: 'sine',
    harmonics: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 1.5, gain: 0.6 },
      { ratio: 2.0, gain: 0.4 },
      { ratio: 2.5, gain: 0.3 }
    ]
  }
};

// Initialize Audio Context
function initAudioContext() {
  if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log("✅ Audio Context initialized successfully");

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (e) {
      console.error("❌ Failed to initialize Audio Context:", e);
    }
  }
}

// Test if a single audio file exists
async function testAudioFile(url) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = url;

    audio.addEventListener('canplaythrough', () => resolve(true));
    audio.addEventListener('error', () => resolve(false));

    // Safety timeout
    setTimeout(() => resolve(false), 1500);
  });
}

async function discoverMusicTracks() {
  console.log("🔍 Discovering music tracks...");

  const trackPatterns = [
    'game1.mp3', 'game2.mp3', 'game3.mp3', 'game4.mp3', 'game5.mp3',
    'game6.mp3', 'game7.mp3', 'game8.mp3', 'game9.mp3', 'game10.mp3',
    'summary-music.mp3'
  ];

  musicTracks = [];
  let foundTracks = 0;

  for (const pattern of trackPatterns) {
    const filePath = `audio/${pattern}`;
    const exists = await testAudioFile(filePath);
    if (exists) {
      let name = pattern.replace('.mp3', '');
      if (name.startsWith('game')) {
        const num = name.replace('game', '');
        name = `Game ${num}`;
      } else if (name === 'summary-music') {
        name = 'Summary Music';
      }
      const trackId = pattern.replace('.mp3', '');
      if (!musicTracks.some(t => t.id === trackId)) {
        musicTracks.push({
          id: trackId,
          name,
          file: filePath,
          type: trackId.includes('summary') ? 'summary' : 'game'
        });
        foundTracks++;
      }
    }
  }

  console.log(`Found ${foundTracks} music tracks`);
  musicPlaylist = musicTracks.filter(track => track.type === 'game');
  window.musicTracks = musicTracks;

  if (foundTracks === 0) {
    console.warn("⚠️ No audio files found in /audio/ folder");
    musicTracks.push({
      id: 'demo',
      name: 'Demo Track (Add MP3 files)',
      file: '',
      type: 'demo'
    });
  }

  return musicTracks;
}

// Update music player UI everywhere
window.updateMusicUI = function() {
  const playBtn = document.getElementById('play-pause-btn');
  const gamePlayBtn = document.getElementById('game-play-pause-btn');
  const trackNameElement = document.getElementById('current-track-name');
  const gameTrackNameElement = document.getElementById('game-track-name');

  console.log("🎵 Updating music UI...");

  // Update play/pause icons
  const iconState = isMusicPaused || !isMusicPlaying ? '▶️' : '⏸️';
  if (playBtn) {
    const icon = playBtn.querySelector('.btn-icon');
    if (icon) icon.textContent = iconState;
  }
  if (gamePlayBtn) {
    const icon = gamePlayBtn.querySelector('.btn-icon');
    if (icon) icon.textContent = iconState;
  }

  // Track name
  const currentTrackId = window.getCurrentTrackId ? window.getCurrentTrackId() : null;
  if (currentTrackId && musicTracks && musicTracks.length > 0) {
    const track = musicTracks.find(t => t.id === currentTrackId);
    if (track) {
      if (trackNameElement) {
        trackNameElement.textContent = track.name;
        trackNameElement.style.opacity = '1';
      }
      if (gameTrackNameElement) {
        gameTrackNameElement.textContent = track.name;
        gameTrackNameElement.style.opacity = '1';
      }
    } else {
      setDefaultTrackName();
    }
  } else {
    setDefaultTrackName();
  }

  // Mode display
  const modeElement = document.getElementById('track-mode');
  if (modeElement) {
    if (window.config && window.config.musicTrack === 'random') {
      modeElement.textContent = 'Random Play';
      modeElement.style.color = '#8b5cf6';
    } else if (window.config && window.config.musicTrack) {
      const track = musicTracks.find(t => t.id === window.config.musicTrack);
      modeElement.textContent = track ? `Playing: ${track.name}` : 'Single Track';
      modeElement.style.color = '#0ea5e9';
    } else {
      modeElement.textContent = 'Sequential Play';
      modeElement.style.color = '#0ea5e9';
    }
  }

  function setDefaultTrackName() {
    if (trackNameElement) {
      trackNameElement.textContent = musicTracks && musicTracks.length > 0 ?
        `${musicTracks.length} tracks available` : 'Loading Music...';
      trackNameElement.style.opacity = '0.7';
    }
    if (gameTrackNameElement) {
      gameTrackNameElement.textContent = musicTracks && musicTracks.length > 0 ?
        `${musicTracks.length} tracks available` : 'Loading...';
      gameTrackNameElement.style.opacity = '0.7';
    }
  }
};

// When playMusic changes currentMusic, keep window.currentMusic in sync
function setCurrentMusicReference(el) {
  currentMusic = el;
  window.currentMusic = currentMusic;
  window.isMusicPlaying = isMusicPlaying;
  window.isMusicPaused = isMusicPaused;
}

// Play music track with continuity
function playMusic(trackId, forceRestart = false) {
  console.log(`🎵 Requested to play music: ${trackId}, forceRestart: ${forceRestart}`);

  if (currentMusic && currentMusic.src && currentMusic.src.includes(trackId) && !forceRestart && trackId !== 'summary') {
    console.log(`🎵 ${trackId} is already playing, continuing...`);
    if (isMusicPaused) {
      currentMusic.play().then(() => {
        isMusicPaused = false;
        isMusicPlaying = true;
        updateMusicUI();
      }).catch(err => console.error("❌ Failed to resume existing track:", err));
    }
    return;
  }

  if (trackId === 'summary' && shouldPlayGameMusic()) {
    console.log("🎵 Not playing summary music on game screen");
    return;
  }

  if (currentMusic && currentMusic.id !== 'summary-music-track' && !pausedMusicState.audioElement) {
    pausedMusicState = {
      trackId: window.getCurrentTrackId ? window.getCurrentTrackId() : null,
      currentTime: currentMusic.currentTime || 0,
      paused: isMusicPaused,
      audioElement: currentMusic
    };
    console.log(`💾 Saved music state: ${pausedMusicState.trackId} at ${pausedMusicState.currentTime}s`);
  }

  // Stop current music
  if (currentMusic) {
    stopMusic();
  }

  if (musicVolume <= 0) {
    console.log("🔇 Music volume is 0, skipping playback");
    isMusicPlaying = false;
    isMusicPaused = false;
    updateMusicUI();
    return;
  }

  let actualTrackId = trackId;
  if (trackId === 'random') {
    if (musicPlaylist.length > 0) {
      const randomIndex = Math.floor(Math.random() * musicPlaylist.length);
      actualTrackId = musicPlaylist[randomIndex].id;
      currentTrackIndex = randomIndex;
    } else {
      actualTrackId = 'game1';
    }
  }

  const validTracks = musicTracks.filter(track => track.id !== 'demo');
  if (validTracks.length === 0) {
    console.error("❌ No valid tracks available to play");
    return;
  }

  let track = validTracks.find(t => t.id === actualTrackId);
  if (!track) {
    track = validTracks[0];
  }

  if (track.type === 'game') {
    currentTrackIndex = musicPlaylist.findIndex(t => t.id === track.id);
  }

  console.log(`🎵 Loading track: ${track.name} (${track.file})`);

  const audioElement = new Audio();
  audioElement.preload = 'auto';
  audioElement.src = track.file;
  audioElement.volume = musicVolume;

  if (track.type === 'summary') audioElement.id = 'summary-music-track';
  else audioElement.id = 'game-music-track';

  if (track.type === 'summary') audioElement.loop = false;
  else audioElement.loop = (window.config && window.config.musicTrack !== 'random');

  audioElement.addEventListener('play', () => {
    console.log(`▶️ Music started playing: ${track.name}`);
    isMusicPlaying = true;
    isMusicPaused = false;
    setCurrentMusicReference(audioElement);
    updateMusicUI();
  });

  audioElement.addEventListener('ended', () => {
    console.log(`⏹️ Music ended: ${track.name}`);
    if (track.type === 'summary') {
      const activeScreen = document.querySelector('.screen.active');
      if (activeScreen && activeScreen.id === 'game-over') {
        return;
      }
      resumePreviousMusic();
    } else if (window.config && window.config.musicTrack === 'random') {
      setTimeout(() => playNextTrack(), 800);
    } else if (audioElement.loop) {
      // do nothing (looping)
    } else {
      playNextTrack();
    }
  });

  audioElement.addEventListener('error', (e) => {
    console.error(`❌ Music playback error for ${track.id}:`, e);
    if (track.type !== 'summary') playNextTrack();
    else resumePreviousMusic();
  });

  // start playback (may reject due to autoplay policies)
  const promise = audioElement.play();
  setCurrentMusicReference(audioElement);
  if (promise !== undefined) {
    promise.then(() => {
      isMusicPlaying = true;
      isMusicPaused = false;
      setCurrentMusicReference(audioElement);
      updateMusicUI();
      console.log(`🎵 Successfully playing: ${track.name}`);
    }).catch(error => {
      console.error(`❌ Failed to play music: ${track.id}`, error);
      isMusicPlaying = false;
      isMusicPaused = true;
      updateMusicUI();
    });
  } else {
    // no promise returned — update UI
    updateMusicUI();
  }
}

// Provide getCurrentTrackId and name
window.getCurrentTrackId = function() {
  if (!currentMusic || !currentMusic.src) return null;
  const src = currentMusic.src;
  const track = musicTracks.find(t => src.includes(t.file));
  return track ? track.id : null;
};
window.getCurrentTrackName = function() {
  const id = window.getCurrentTrackId();
  if (!id) return 'No Track';
  const t = musicTracks.find(x => x.id === id);
  return t ? t.name : 'Unknown Track';
};

function resumePreviousMusic() {
  console.log("🎵 Attempting to resume previous music...");
  if (pausedMusicState.trackId && pausedMusicState.audioElement) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'game-over') {
      console.log("🎵 Still on summary screen, not resuming");
      return;
    }
    if (!shouldPlayGameMusic()) {
      console.log("🎵 Not on a game screen, not resuming");
      return;
    }
    const trackToResume = pausedMusicState.trackId;
    const resumeTime = pausedMusicState.currentTime;
    playMusic(trackToResume, true);
    setTimeout(() => {
      if (currentMusic && currentMusic.readyState > 0) {
        try { currentMusic.currentTime = resumeTime; } catch(e) {}
      }
    }, 150);
    pausedMusicState = { trackId: null, currentTime: 0, paused: false, audioElement: null };
  } else {
    console.log("🎵 No previous music state to resume");
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && shouldPlayGameMusic()) {
      const trackToPlay = window.config && window.config.musicTrack === 'random' ? 'random' : (window.config ? window.config.musicTrack : 'game1');
      playMusic(trackToPlay);
    }
  }
}

window.playNextTrack = function() {
  if (musicPlaylist.length === 0) return;
  if (isMusicPaused && currentMusic) {
    toggleMusicPlayback();
    return;
  }
  let nextIndex = currentTrackIndex + 1;
  if (nextIndex >= musicPlaylist.length) nextIndex = 0;
  const nextTrack = musicPlaylist[nextIndex];
  if (nextTrack) playMusic(nextTrack.id);
};

window.playPreviousTrack = function() {
  if (musicPlaylist.length === 0) return;
  if (isMusicPaused && currentMusic) {
    toggleMusicPlayback();
    return;
  }
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) prevIndex = musicPlaylist.length - 1;
  const prevTrack = musicPlaylist[prevIndex];
  if (prevTrack) playMusic(prevTrack.id);
};

window.toggleMusicPlayback = function() {
  console.log("🎵 Toggling music playback");
  if (!currentMusic) {
    const trackToPlay = window.config && window.config.musicTrack === 'random' ? 'random' : (window.config ? window.config.musicTrack : 'game1');
    playMusic(trackToPlay);
    return;
  }
  if (isMusicPaused) {
    currentMusic.play().then(() => {
      isMusicPaused = false;
      isMusicPlaying = true;
      updateMusicUI();
    }).catch(err => console.error("❌ Failed to resume music:", err));
  } else {
    currentMusic.pause();
    isMusicPaused = true;
    isMusicPlaying = false;
    updateMusicUI();
  }
};

function stopMusic() {
  if (currentMusic) {
    console.log("⏹️ Stopping current music");
    if (currentMusic.id !== 'summary-music-track') {
      pausedMusicState = {
        trackId: window.getCurrentTrackId ? window.getCurrentTrackId() : null,
        currentTime: currentMusic.currentTime || 0,
        paused: isMusicPaused,
        audioElement: currentMusic
      };
    }
    try {
      currentMusic.pause();
      currentMusic.currentTime = 0;
    } catch (e) {}
    currentMusic.onplay = null;
    currentMusic.onended = null;
    currentMusic.onerror = null;
    currentMusic = null;
    window.currentMusic = null;
    isMusicPlaying = false;
    isMusicPaused = false;
    updateMusicUI();
  }
}

window.setMusicVolume = function(volume) {
  const newVolume = Math.max(0, Math.min(1, volume));
  console.log(`🔊 Setting music volume to: ${newVolume}`);
  musicVolume = newVolume;
  if (currentMusic) currentMusic.volume = musicVolume;
  if (window.config) { 
    window.config.musicVolume = musicVolume; 
    if (typeof window.saveSettings === 'function') window.saveSettings(); 
  }
  
  // Update the slider display
  const musicVolumeSlider = document.getElementById('music-volume-slider');
  const musicVolumeValue = document.getElementById('music-volume-value');
  if (musicVolumeSlider) musicVolumeSlider.value = Math.round(newVolume * 100);
  if (musicVolumeValue) musicVolumeValue.textContent = Math.round(newVolume * 100) + '%';
};

window.setUIVolume = function(volume) {
  const newVolume = Math.max(0, Math.min(1, volume));
  console.log(`🔊 Setting UI volume to: ${newVolume}`);
  uiVolume = newVolume;
  if (window.config) { 
    window.config.uiVolume = uiVolume; 
    if (typeof window.saveSettings === 'function') window.saveSettings(); 
  }
  
  // Update the slider display
  const uiVolumeSlider = document.getElementById('ui-volume-slider');
  const uiVolumeValue = document.getElementById('ui-volume-value');
  if (uiVolumeSlider) uiVolumeSlider.value = Math.round(newVolume * 100);
  if (uiVolumeValue) uiVolumeValue.textContent = Math.round(newVolume * 100) + '%';
};

window.playSound = function(type) {
  if (uiVolume <= 0) return;
  if (!audioContext) initAudioContext();
  if (!audioContext) return;
  try {
    const settings = SOUND_SETTINGS[type] || { baseFreq: 600, type: 'sine' };
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = settings.baseFreq;
    oscillator.type = settings.type;
    gainNode.gain.setValueAtTime(uiVolume * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.error("❌ Error playing sound effect:", error);
  }
};

window.playLinkSound = function(pathLength) {
  if (uiVolume <= 0 || pathLength < 2) return;
  if (!audioContext) initAudioContext();
  if (!audioContext) return;
  try {
    const now = audioContext.currentTime;
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25];
    const noteIndex = Math.min(pathLength - 2, notes.length - 1);
    const frequency = notes[noteIndex];
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    const duration = 0.12 + (pathLength * 0.02);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(uiVolume * 0.45, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    if (pathLength >= 4) {
      const osc2 = audioContext.createOscillator();
      const g2 = audioContext.createGain();
      osc2.connect(g2);
      g2.connect(audioContext.destination);
      osc2.frequency.value = frequency * 2;
      osc2.type = 'triangle';
      g2.gain.setValueAtTime(0, now);
      g2.gain.linearRampToValueAtTime(uiVolume * 0.18, now + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc2.start(now);
      osc2.stop(now + duration);
    }
    const clickOsc = audioContext.createOscillator();
    const clickGain = audioContext.createGain();
    clickOsc.connect(clickGain);
    clickGain.connect(audioContext.destination);
    clickOsc.frequency.value = 800;
    clickOsc.type = 'square';
    clickGain.gain.setValueAtTime(uiVolume * 0.25, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    clickOsc.start(now);
    clickOsc.stop(now + 0.04);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (error) {
    console.error("❌ Error playing link sound:", error);
  }
};

window.playWordCompleteSound = function(wordLength, score) {
  if (uiVolume <= 0) return;
  if (!audioContext) initAudioContext();
  if (!audioContext) return;
  try {
    const now = audioContext.currentTime;
    const baseFreq = 540 + (wordLength * 12);
    const duration = 0.28 + (wordLength * 0.04);
    const o1 = audioContext.createOscillator();
    const g1 = audioContext.createGain();
    o1.connect(g1);
    g1.connect(audioContext.destination);
    o1.frequency.setValueAtTime(baseFreq, now);
    o1.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + duration * 0.25);
    o1.type = 'sine';
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(uiVolume * 0.6, now + 0.04);
    g1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    const o2 = audioContext.createOscillator();
    const g2 = audioContext.createGain();
    o2.connect(g2);
    g2.connect(audioContext.destination);
    o2.frequency.setValueAtTime(baseFreq * 1.5, now);
    o2.type = 'triangle';
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(uiVolume * 0.3, now + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o1.start(now);
    o2.start(now);
    o1.stop(now + duration);
    o2.stop(now + duration);
    if (score > 20) {
      const clickTime = now + 0.02;
      const clickGain = audioContext.createGain();
      const clickOsc = audioContext.createOscillator();
      clickOsc.connect(clickGain);
      clickGain.connect(audioContext.destination);
      clickOsc.frequency.value = 1200;
      clickOsc.type = 'square';
      clickGain.gain.setValueAtTime(uiVolume * 0.28, clickTime);
      clickGain.gain.exponentialRampToValueAtTime(0.01, clickTime + 0.08);
      clickOsc.start(clickTime);
      clickOsc.stop(clickTime + 0.08);
    }
  } catch (error) {
    console.error("❌ Error playing word complete sound:", error);
  }
};

window.setGameTrack = function(track) {
  console.log(`🎵 Setting game track to: ${track}`);
  if (window.config) { 
    window.config.musicTrack = track; 
    if (typeof window.saveSettings === 'function') window.saveSettings(); 
  }
  updateMusicUI();
  if (musicVolume > 0 && !isMusicPlaying) playMusic(track);
};

window.setGameMode = function(mode) {
  console.log(`🎵 Setting game mode to: ${mode}`);
  if (mode === 'random') setGameTrack('random');
  else {
    const track = musicTracks.find(t => t.id === mode);
    if (track) setGameTrack(track.id);
  }
  updateMusicUI();
};

window.getRandomTrack = function() {
  const list = musicPlaylist.length ? musicPlaylist : musicTracks.filter(t => t.type === 'game');
  if (!list.length) return 'game1';
  return list[Math.floor(Math.random() * list.length)].id;
};

// Load and apply audio settings from config
window.loadAudioSettings = function() {
  console.log("🔊 Loading audio settings from config");
  
  if (window.config) {
    // Apply volumes
    if (typeof window.setMusicVolume === 'function') {
      window.setMusicVolume(window.config.musicVolume || 0.5);
    }
    if (typeof window.setUIVolume === 'function') {
      window.setUIVolume(window.config.uiVolume || 0.7);
    }
    
    // Update UI sliders immediately
    const uiVolumeSlider = document.getElementById('ui-volume-slider');
    const uiVolumeValue = document.getElementById('ui-volume-value');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeValue = document.getElementById('music-volume-value');
    
    if (uiVolumeSlider && uiVolumeValue) {
      const uiVol = Math.round((window.config.uiVolume || 0.7) * 100);
      uiVolumeSlider.value = uiVol;
      uiVolumeValue.textContent = uiVol + '%';
    }
    
    if (musicVolumeSlider && musicVolumeValue) {
      const musicVol = Math.round((window.config.musicVolume || 0.5) * 100);
      musicVolumeSlider.value = musicVol;
      musicVolumeValue.textContent = musicVol + '%';
    }
    
    console.log("🔊 Audio settings loaded:", {
      musicVolume: window.config.musicVolume,
      uiVolume: window.config.uiVolume
    });
  }
};

function initAudio() {
  console.log("🎵 Initializing audio system...");

  function initOnce() {
    initAudioContext();
    document.removeEventListener('click', initOnce);
    document.removeEventListener('touchstart', initOnce);
  }

  document.addEventListener('click', initOnce, { once: true, passive: true });
  document.addEventListener('touchstart', initOnce, { once: true, passive: true });

  discoverMusicTracks().then(() => {
    console.log("✅ Audio system initialized");
    // expose functions globally
    window.playMusic = playMusic;
    window.stopMusic = stopMusic;
    window.playSound = playSound;
    window.playLinkSound = playLinkSound;
    window.playWordCompleteSound = playWordCompleteSound;
    window.setMusicVolume = setMusicVolume;
    window.setUIVolume = setUIVolume;
    window.setGameTrack = setGameTrack;
    window.setGameMode = setGameMode;
    window.playNextTrack = window.playNextTrack;
    window.playPreviousTrack = window.playPreviousTrack;
    window.toggleMusicPlayback = toggleMusicPlayback;
    window.getRandomTrack = getRandomTrack;
    window.getCurrentTrackId = window.getCurrentTrackId;
    window.getCurrentTrackName = window.getCurrentTrackName;
    window.resumePreviousMusic = resumePreviousMusic;
    window.shouldPlayGameMusic = shouldPlayGameMusic;
    window.updateMusicUI = window.updateMusicUI;
    window.loadAudioSettings = window.loadAudioSettings;

    // Setup volume slider event listeners
    const uiVolumeSlider = document.getElementById('ui-volume-slider');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    
    if (uiVolumeSlider) {
      uiVolumeSlider.addEventListener('input', function() {
        const value = this.value / 100;
        setUIVolume(value);
      });
      
      // Set initial value from config if available
      if (window.config && window.config.uiVolume) {
        uiVolumeSlider.value = Math.round(window.config.uiVolume * 100);
      }
    }
    
    if (musicVolumeSlider) {
      musicVolumeSlider.addEventListener('input', function() {
        const value = this.value / 100;
        setMusicVolume(value);
      });
      
      // Set initial value from config if available
      if (window.config && window.config.musicVolume) {
        musicVolumeSlider.value = Math.round(window.config.musicVolume * 100);
      }
    }

    // Load audio settings from config
    setTimeout(() => {
      if (typeof window.loadAudioSettings === 'function') {
        window.loadAudioSettings();
      }
    }, 100);
    
    // initial UI update
    setTimeout(() => updateMusicUI(), 120);
  }).catch(err => console.error("❌ Failed initializing audio system:", err));
}

window.addEventListener('DOMContentLoaded', function() {
  console.log("📄 DOM Loaded - scheduling audio init");
  setTimeout(() => initAudio(), 300);
  // Force final UI update after full load
  setTimeout(() => { 
    if (typeof window.updateMusicUI === 'function') window.updateMusicUI();
    // Ensure volume sliders are set correctly
    setTimeout(() => {
      if (typeof window.loadAudioSettings === 'function') window.loadAudioSettings();
    }, 500);
  }, 2000);
});

// Ensure basic functions exist early
window.ensureAudioFunctionsAvailable = function() {
  if (!window.toggleMusicPlayback) window.toggleMusicPlayback = function() { console.log("Audio not initialized yet"); };
  if (!window.playNextTrack) window.playNextTrack = function() { console.log("Audio not initialized yet"); };
  if (!window.setGameMode) window.setGameMode = function(mode) { console.log("Audio not initialized yet"); };
  if (!window.setMusicVolume) window.setMusicVolume = function(vol) { console.log("Audio not initialized yet"); };
  if (!window.setUIVolume) window.setUIVolume = function(vol) { console.log("Audio not initialized yet"); };
};
window.ensureAudioFunctionsAvailable();