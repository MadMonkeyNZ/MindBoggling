/* ================= SCREEN MANAGEMENT ================= */

/* ================= SCREEN MANAGEMENT ================= */

let screenHistory = [];

/* ================= LOADING SCREEN FUNCTIONS ================= */
function showLoadingScreen() {
  if (UI.loadingScreen) {
    UI.loadingScreen.classList.add('active');
    // Scroll to top when showing loading screen
    UI.loadingScreen.scrollTop = 0;
  }
}

function hideLoadingScreen() {
  if (UI.loadingScreen) {
    UI.loadingScreen.classList.remove('active');
  }
}

function updateLoadingProgress(percentage, status = "") {
  const percent = Math.min(100, Math.max(0, Math.round(percentage)));
  if (UI.loadingBar) {
    UI.loadingBar.style.width = percent + '%';
  }
  if (UI.loadingPercentage) {
    UI.loadingPercentage.textContent = percent + '%';
  }
  if (status && UI.loadingStatus) {
    UI.loadingStatus.textContent = status;
  }
}

/* ================= NAVIGATION ================= */
function showScreen(id) {
  const currentActive = document.querySelector('.screen.active');
  if (currentActive) {
    screenHistory.push(currentActive.id);
    currentActive.style.opacity = '0';
    setTimeout(() => {
      currentActive.classList.remove('active');
      currentActive.style.opacity = '';
    }, 400);
  }
  
  setTimeout(() => {
    const screen = document.getElementById(id);
    if (screen) {
      screen.classList.add('active');
      
      // Scroll to top when showing any screen (especially game-over)
      screen.scrollTop = 0;
      
      // If it's the game-over screen, also scroll the content container
      if (id === 'game-over') {
        const gameOverContent = screen.querySelector('.game-over-content');
        if (gameOverContent) {
          gameOverContent.scrollTop = 0;
        }
        
        // Ensure the entire screen is at the top
        setTimeout(() => {
          screen.scrollTop = 0;
          if (gameOverContent) {
            gameOverContent.scrollTop = 0;
          }
        }, 10);
      }
      
      // Handle music based on screen
      if (id === 'game-over') {
        // Already handled in endGame()
      } else if (id === 'game-ui') {
        // Already handled in startGame()
      } else if (id === 'main-menu' || id === 'game-modes' || id === 'statistics-screen') {
        // Play menu music (selected track)
        isGamePlaying = false;
        if (config.musicVolume > 0) {
          playMusic(config.musicTrack || 'game1');
        }
        
        // Scroll to top for these screens too
        setTimeout(() => {
          screen.scrollTop = 0;
        }, 10);
      }
      
      // Load statistics if needed
      if (id === 'statistics-screen') {
        loadStatistics();
        setTimeout(() => {
          screen.scrollTop = 0;
        }, 10);
      }
      
      // Update game mode button text
      if (id === 'game-modes') {
        updateGameModeButton();
        setTimeout(() => {
          screen.scrollTop = 0;
        }, 10);
      }
    }
  }, 100);
}

// ... rest of screens.js code remains the same ...

function updateGameModeButton() {
  const startButton = document.querySelector('#game-modes .menu-btn.primary');
  if (startButton && config.gameMode === 'wordhunt') {
    startButton.textContent = "Start Word Hunt";
  }
}

/* ================= STATISTICS FUNCTIONS ================= */
function loadStatistics() {
  // Load personal bests
  const allTimeHigh = getAllTimeHighScore();
  const todayHigh = getTodayHighScore();
  
  const statAlltimeHigh = document.getElementById('stat-alltime-high');
  const statTodayBest = document.getElementById('stat-today-best');
  
  if (statAlltimeHigh) statAlltimeHigh.textContent = allTimeHigh;
  if (statTodayBest) statTodayBest.textContent = todayHigh;
  
  // Load game statistics
  const totalGames = parseInt(localStorage.getItem('boggle_total_games') || '0');
  const totalWords = parseInt(localStorage.getItem('boggle_total_words') || '0');
  const totalScore = parseInt(localStorage.getItem('boggle_total_score') || '0');
  
  const statTotalGames = document.getElementById('stat-total-games');
  const statTotalWords = document.getElementById('stat-total-words');
  const statTotalScore = document.getElementById('stat-total-score');
  
  if (statTotalGames) statTotalGames.textContent = totalGames;
  if (statTotalWords) statTotalWords.textContent = totalWords;
  if (statTotalScore) statTotalScore.textContent = totalScore;
  
  // Calculate averages
  const avgWords = totalGames > 0 ? (totalWords / totalGames).toFixed(1) : '0.0';
  const avgScore = totalGames > 0 ? (totalScore / totalGames).toFixed(1) : '0.0';
  
  const statAvgWords = document.getElementById('stat-avg-words');
  const statAvgScore = document.getElementById('stat-avg-score');
  
  if (statAvgWords) statAvgWords.textContent = avgWords;
  if (statAvgScore) statAvgScore.textContent = avgScore;
  
  // Load common words
  loadCommonWords();
  
  // Load achievements
  loadAchievements();
}

function loadCommonWords() {
  // Get all word count keys from localStorage
  const wordCounts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('boggle_wordcount_')) {
      const word = key.replace('boggle_wordcount_', '');
      const count = parseInt(localStorage.getItem(key));
      wordCounts.push({ word, count });
    }
  }
  
  // Sort by count (descending) and take top 10
  wordCounts.sort((a, b) => b.count - a.count);
  const topWords = wordCounts.slice(0, 10);
  
  const commonWordsList = document.getElementById('common-words-list');
  if (!commonWordsList) return;
  
  commonWordsList.innerHTML = '';
  
  if (topWords.length === 0) {
    commonWordsList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No word data yet. Play some games!</div>';
    return;
  }
  
  topWords.forEach((item, index) => {
    const wordItem = document.createElement('div');
    wordItem.className = 'common-word-item';
    
    wordItem.innerHTML = `
      <div class="common-word-text">${item.word.toUpperCase()}</div>
      <div class="common-word-count">${item.count} ${item.count === 1 ? 'time' : 'times'}</div>
    `;
    
    commonWordsList.appendChild(wordItem);
  });
}

function loadAchievements() {
  const totalGames = parseInt(localStorage.getItem('boggle_total_games') || '0');
  const totalWords = parseInt(localStorage.getItem('boggle_total_words') || '0');
  const totalScore = parseInt(localStorage.getItem('boggle_total_score') || '0');
  const allTimeHigh = getAllTimeHighScore();
  
  const achievements = [];
  
  // Game count achievements
  if (totalGames >= 1) achievements.push({ icon: '🎮', text: 'First Game' });
  if (totalGames >= 10) achievements.push({ icon: '🏆', text: '10 Games' });
  if (totalGames >= 50) achievements.push({ icon: '👑', text: '50 Games' });
  if (totalGames >= 100) achievements.push({ icon: '🌟', text: '100 Games' });
  
  // Word count achievements
  if (totalWords >= 10) achievements.push({ icon: '📝', text: '10 Words' });
  if (totalWords >= 100) achievements.push({ icon: '📚', text: '100 Words' });
  if (totalWords >= 500) achievements.push({ icon: '📖', text: '500 Words' });
  
  // Score achievements
  if (allTimeHigh >= 100) achievements.push({ icon: '⭐', text: '100 Points' });
  if (allTimeHigh >= 500) achievements.push({ icon: '💫', text: '500 Points' });
  if (allTimeHigh >= 1000) achievements.push({ icon: '🚀', text: '1000 Points' });
  
  const achievementBadges = document.getElementById('achievement-badges');
  if (!achievementBadges) return;
  
  achievementBadges.innerHTML = '';
  
  if (achievements.length === 0) {
    achievementBadges.innerHTML = '<div style="text-align: center; color: #64748b; padding: 10px;">No achievements yet. Keep playing!</div>';
    return;
  }
  
  achievements.forEach(achievement => {
    const badge = document.createElement('div');
    badge.className = 'achievement-badge';
    
    badge.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-text">${achievement.text}</div>
    `;
    
    achievementBadges.appendChild(badge);
  });
}

function updateGameStatistics(wordsFound, score) {
  // Update total games
  const totalGames = parseInt(localStorage.getItem('boggle_total_games') || '0');
  localStorage.setItem('boggle_total_games', totalGames + 1);
  
  // Update total words
  const totalWords = parseInt(localStorage.getItem('boggle_total_words') || '0');
  localStorage.setItem('boggle_total_words', totalWords + wordsFound);
  
  // Update total score
  const totalScore = parseInt(localStorage.getItem('boggle_total_score') || '0');
  localStorage.setItem('boggle_total_score', totalScore + score);
}

function getWordLifetimeCount(word) {
  const key = `boggle_wordcount_${word.toLowerCase()}`;
  return parseInt(localStorage.getItem(key) || 0);
}

function updateWordLifetimeCount(word) {
  const key = `boggle_wordcount_${word.toLowerCase()}`;
  const currentCount = getWordLifetimeCount(word);
  localStorage.setItem(key, currentCount + 1);
}

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function getTodayHighScore() {
  const today = getTodayDateString();
  const key = `boggle_daily_high_${today}`;
  return parseInt(localStorage.getItem(key) || 0);
}

function setTodayHighScore(score) {
  const today = getTodayDateString();
  const key = `boggle_daily_high_${today}`;
  const currentHigh = getTodayHighScore();
  if (score > currentHigh) {
    localStorage.setItem(key, score);
  }
}

function getAllTimeHighScore() {
  const key = `boggle_highscore_${config.gridSize}x${config.gridSize}`;
  return parseInt(localStorage.getItem(key) || 0);
}

function setAllTimeHighScore(score) {
  const key = `boggle_highscore_${config.gridSize}x${config.gridSize}`;
  localStorage.setItem(key, score);
}

/* ================= GAME MODE SELECTION ================= */
function selectGameMode(mode) {
  config.gameMode = mode;
  
  // Update UI
  document.querySelectorAll('.game-mode-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  if (mode === 'wordhunt') {
    const firstCard = document.querySelector('.game-mode-card:first-child');
    if (firstCard) {
      firstCard.classList.add('selected');
    }
  }
  
  // Update start button text
  updateGameModeButton();
}

function startSelectedGameMode() {
  if (config.gameMode === 'wordhunt') {
    startWordHuntGame();
  } else {
    startGame();
  }
}

/* ================= SETTINGS MANAGEMENT ================= */
function updateSettingsUI() {
  // Update grid size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    if (parseInt(btn.dataset.size) === config.gridSize) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update sliders
  const timeSlider = document.getElementById('time-slider');
  const lengthSlider = document.getElementById('length-slider');
  const scoringToggle = document.getElementById('scoring-toggle');
  
  if (timeSlider) timeSlider.value = config.time;
  if (lengthSlider) lengthSlider.value = config.minLen;
  if (scoringToggle) scoringToggle.checked = config.scoring === "modern";
  
  // Update displays
  const timeValue = document.getElementById('time-value');
  const lengthValue = document.getElementById('length-value');
  
  if (timeValue) timeValue.textContent = config.time + 's';
  if (lengthValue) lengthValue.textContent = config.minLen;
  
  // Update volume sliders
  updateVolumeSliders();
  
  // Update music track buttons
  document.querySelectorAll('.music-type-btn').forEach(btn => {
    if (btn.dataset.track === config.musicTrack) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update high score display
  if (UI.highScoreDisplay) {
    UI.highScoreDisplay.textContent = getAllTimeHighScore();
  }
}

function saveSettings() {
  localStorage.setItem('boggle_cfg', JSON.stringify(config));
}

function updateVolumeSliders() {
  const uiVolumeSlider = document.getElementById('ui-volume-slider');
  const uiVolumeValue = document.getElementById('ui-volume-value');
  const musicVolumeSlider = document.getElementById('music-volume-slider');
  const musicVolumeValue = document.getElementById('music-volume-value');
  
  if (uiVolumeSlider && uiVolumeValue) {
    uiVolumeSlider.value = config.uiVolume * 100;
    uiVolumeValue.textContent = Math.round(config.uiVolume * 100) + '%';
  }
  
  if (musicVolumeSlider && musicVolumeValue) {
    musicVolumeSlider.value = config.musicVolume * 100;
    musicVolumeValue.textContent = Math.round(config.musicVolume * 100) + '%';
  }
}

// Setup settings event listeners
function setupSettingsEventListeners() {
  console.log("Setting up settings event listeners...");
  
  // Grid size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const size = parseInt(this.dataset.size);
      config.gridSize = size;
      updateSettingsUI();
      saveSettings();
    });
  });
  
  // Time slider
  const timeSlider = document.getElementById('time-slider');
  if (timeSlider) {
    timeSlider.addEventListener('input', function() {
      config.time = parseInt(this.value);
      document.getElementById('time-value').textContent = config.time + 's';
      saveSettings();
    });
  }
  
  // Length slider
  const lengthSlider = document.getElementById('length-slider');
  if (lengthSlider) {
    lengthSlider.addEventListener('input', function() {
      config.minLen = parseInt(this.value);
      document.getElementById('length-value').textContent = config.minLen;
      saveSettings();
    });
  }
  
  // Scoring toggle
  const scoringToggle = document.getElementById('scoring-toggle');
  if (scoringToggle) {
    scoringToggle.addEventListener('change', function() {
      config.scoring = this.checked ? "modern" : "traditional";
      saveSettings();
    });
  }
  
  // UI Volume Slider
  const uiVolumeSlider = document.getElementById('ui-volume-slider');
  if (uiVolumeSlider) {
    uiVolumeSlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      config.uiVolume = value / 100;
      document.getElementById('ui-volume-value').textContent = value + '%';
      saveSettings();
      
      // Apply UI volume change
      if (typeof setUIVolume === 'function') {
        setUIVolume(config.uiVolume);
      }
      
      console.log(`UI volume set to: ${config.uiVolume}`);
    });
  }
  
  // Music Volume Slider
  const musicVolumeSlider = document.getElementById('music-volume-slider');
  if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      config.musicVolume = value / 100;
      document.getElementById('music-volume-value').textContent = value + '%';
      saveSettings();
      
      // Apply music volume change
      if (typeof setMusicVolume === 'function') {
        setMusicVolume(config.musicVolume);
      }
      
      console.log(`Music volume set to: ${config.musicVolume}`);
    });
  }
  
  // Music track buttons
  document.querySelectorAll('.music-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const track = this.dataset.track;
      setGameTrack(track);
    });
  });
  
  console.log("Settings event listeners set up");
}

// Function to set game track
function setGameTrack(track) {
  console.log(`Setting game track to: ${track}`);
  
  // Update config
  config.musicTrack = track;
  
  // Update UI
  document.querySelectorAll('.music-type-btn').forEach(btn => {
    if (btn.dataset.track === track) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Save settings
  saveSettings();
  
  // IMPORTANT: Actually change the music if we're on a screen that plays music
  const currentScreen = document.querySelector('.screen.active');
  if (currentScreen && 
      (currentScreen.id === 'main-menu' || 
       currentScreen.id === 'game-modes' || 
       currentScreen.id === 'statistics-screen')) {
    
    // If music volume is not 0, play the new track
    if (config.musicVolume > 0 && typeof playMusic === 'function') {
      console.log(`Playing track: ${track}`);
      playMusic(track);
    }
  }
  
  // If game is currently playing, also change the music
  if (isGamePlaying && typeof playMusic === 'function') {
    playMusic(track);
  }
}

/* ================= AUDIO SETTINGS LOADER ================= */
function loadAudioSettings() {
  console.log("Loading audio settings...");
  
  // Load saved config
  const savedConfig = localStorage.getItem('boggle_cfg');
  if (savedConfig) {
    try {
      const parsedConfig = JSON.parse(savedConfig);
      
      // Update config object
      if (parsedConfig.uiVolume !== undefined) {
        config.uiVolume = Math.max(0, Math.min(1, parsedConfig.uiVolume));
      }
      
      if (parsedConfig.musicVolume !== undefined) {
        config.musicVolume = Math.max(0, Math.min(1, parsedConfig.musicVolume));
      }
      
      if (parsedConfig.musicTrack !== undefined) {
        config.musicTrack = parsedConfig.musicTrack;
      }
      
      // Apply to audio system if available
      if (typeof setUIVolume === 'function') {
        setUIVolume(config.uiVolume);
      }
      
      if (typeof setMusicVolume === 'function') {
        setMusicVolume(config.musicVolume);
      }
      
      console.log("Audio settings loaded from localStorage");
    } catch (e) {
      console.error("Error loading audio settings:", e);
    }
  }
  
  // Update UI
  updateSettingsUI();
}

// Make sure these functions are available globally
window.showScreen = showScreen;
window.selectGameMode = selectGameMode;
window.startSelectedGameMode = startSelectedGameMode;
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
window.updateLoadingProgress = updateLoadingProgress;
window.loadStatistics = loadStatistics;
window.updateGameStatistics = updateGameStatistics;
window.getWordLifetimeCount = getWordLifetimeCount;
window.updateWordLifetimeCount = updateWordLifetimeCount;
window.getTodayHighScore = getTodayHighScore;
window.setTodayHighScore = setTodayHighScore;
window.getAllTimeHighScore = getAllTimeHighScore;
window.setAllTimeHighScore = setAllTimeHighScore;
window.updateSettingsUI = updateSettingsUI;
window.saveSettings = saveSettings;
window.updateVolumeSliders = updateVolumeSliders;
window.setupSettingsEventListeners = setupSettingsEventListeners;
window.setGameTrack = setGameTrack;
window.loadAudioSettings = loadAudioSettings;

// Initialize everything when DOM is ready
// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing...");
  
  // Make sure config exists
  if (!window.config) {
    window.config = {
      gridSize: 4,
      time: 30,
      minLen: 3,
      scoring: "modern",
      uiVolume: 0.7,
      musicVolume: 0.2,
      musicTrack: "game1",
      gameMode: "classic"  // Set default to classic
    };
  } else {
    // Ensure gameMode is set to classic by default
    if (!config.gameMode || config.gameMode === 'wordhunt') {
      config.gameMode = "classic";
    }
  }
  
  // Update UI with current settings
  updateSettingsUI();
  
  // Setup event listeners
  setupSettingsEventListeners();
  
  // Initialize audio settings
  setTimeout(() => {
    if (typeof loadAudioSettings === 'function') {
      loadAudioSettings();
    }
    
    // Initialize audio system if available
    if (typeof initAudio === 'function') {
      initAudio();
    }
  }, 100);
  
  console.log("Initialization complete");
});