// game-core.js - Fixed version with working buttons

/* ================= CONFIG & STATE ================= */
const DICT_URL = "https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt";

const DICE_4x4 = [
  "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
  "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
  "DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
  "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ"
];

const DICE_5x5 = [
  "AAAFRS", "AAEEEE", "AAFIRS", "ADENNN", "AEEEEM",
  "AEEGMU", "AEGMNN", "AFIRSY", "BJKQXZ", "CCNSTW",
  "CEIILT", "CEILPT", "CEIPST", "DDLNOR", "DHHLOR",
  "DHHNOT", "DHLNOR", "EIIITT", "EMOTTT", "ENSSSU",
  "FIPRSY", "GORRVW", "HIPRRY", "NOOTUW", "OOOTTU"
];

const MULTS = ["DL", "TL", "DW", "TW"];

window.config = {
  gridSize: 4,
  time: 30,
  minLen: 3,
  scoring: "modern",
  uiVolume: 0.7,
  musicVolume: 0.5,
  musicTrack: "random",
  musicMode: "sequential"
};

let dict = new Set();
let board = [], mults = [];
let path = [], foundWords = new Map();
let allPossibleWords = new Map();
let timerInt, timeLeft, startTime;
let currentScore = 0;
let gameEnded = false;
let wordData = new Map();

const LETTER_VALUES = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10, 'QU': 10
};

/* ================= SCREEN MANAGEMENT ================= */
window.showScreen = function(screenId) {
  console.log(`🔄 Switching to screen: ${screenId}`);
  
  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Show the target screen
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    
    // If switching to main menu, ensure audio settings are loaded
    if (screenId === 'main-menu') {
      setTimeout(() => {
        if (typeof window.loadAudioSettings === 'function') {
          window.loadAudioSettings();
        }
        // Resume music if we're coming from game over screen
        if (typeof window.resumePreviousMusic === 'function') {
          window.resumePreviousMusic();
        }
      }, 100);
    }
    
    // If switching to game screen, setup event listeners
    if (screenId === 'game-ui') {
      setTimeout(() => {
        setupEventListeners();
      }, 100);
    }
  }
};

/* ================= ENHANCED HIGH SCORE SYSTEM ================= */
function getHighscoreKey() {
  return `boggle_${config.gridSize}x${config.gridSize}_${config.time}s_${config.minLen}l`;
}

function getDailyKey() {
  const today = new Date().toISOString().split('T')[0];
  return `boggle_daily_${today}_${config.gridSize}x${config.gridSize}_${config.time}s_${config.minLen}l`;
}

function getAllTimeKey() {
  return `boggle_alltime_${config.gridSize}x${config.gridSize}`;
}

function getSettingsSpecificKey() {
  return `boggle_settings_${config.gridSize}x${config.gridSize}_${config.time}s_${config.minLen}l`;
}

function saveHighscore(score) {
  const dailyKey = getDailyKey();
  const allTimeKey = getAllTimeKey();
  const settingsKey = getHighscoreKey();
  
  // For endless mode, calculate percentage instead of score
  let valueToSave = score;
  if (config.time === 0) {
    // Endless mode: save percentage of words found
    const totalPossible = allPossibleWords.size;
    const wordsFound = foundWords.size;
    const percentage = totalPossible > 0 ? Math.round((wordsFound / totalPossible) * 100) : 0;
    valueToSave = percentage;
  }
  
  // Daily high score
  const dailyData = JSON.parse(localStorage.getItem(dailyKey) || '{}');
  if (config.time === 0) {
    // For endless mode, compare percentages
    if (!dailyData.percentage || valueToSave > dailyData.percentage) {
      dailyData.percentage = valueToSave;
      dailyData.score = score; // Still store actual score for reference
      dailyData.date = new Date().toISOString();
      dailyData.gridSize = config.gridSize;
      dailyData.time = config.time;
      dailyData.minLen = config.minLen;
      localStorage.setItem(dailyKey, JSON.stringify(dailyData));
    }
  } else {
    // For timed modes, compare scores
    if (!dailyData.score || valueToSave > dailyData.score) {
      dailyData.score = valueToSave;
      dailyData.date = new Date().toISOString();
      dailyData.gridSize = config.gridSize;
      dailyData.time = config.time;
      dailyData.minLen = config.minLen;
      localStorage.setItem(dailyKey, JSON.stringify(dailyData));
    }
  }
  
  // All-time high score for these settings
  const allTimeData = JSON.parse(localStorage.getItem(allTimeKey) || '{}');
  if (config.time === 0) {
    // For endless mode, compare percentages
    if (!allTimeData.percentage || valueToSave > allTimeData.percentage) {
      allTimeData.percentage = valueToSave;
      allTimeData.score = score; // Still store actual score for reference
      allTimeData.date = new Date().toISOString();
      localStorage.setItem(allTimeKey, JSON.stringify(allTimeData));
    }
  } else {
    // For timed modes, compare scores
    if (!allTimeData.score || valueToSave > allTimeData.score) {
      allTimeData.score = valueToSave;
      allTimeData.date = new Date().toISOString();
      localStorage.setItem(allTimeKey, JSON.stringify(allTimeData));
    }
  }
  
  // Settings-specific high score
  const settingsData = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  if (config.time === 0) {
    // For endless mode, compare percentages
    if (!settingsData.percentage || valueToSave > settingsData.percentage) {
      settingsData.percentage = valueToSave;
      settingsData.score = score;
      settingsData.date = new Date().toISOString();
      localStorage.setItem(settingsKey, JSON.stringify(settingsData));
    }
  } else {
    // For timed modes, compare scores
    if (!settingsData.score || valueToSave > settingsData.score) {
      settingsData.score = valueToSave;
      settingsData.date = new Date().toISOString();
      localStorage.setItem(settingsKey, JSON.stringify(settingsData));
    }
  }
}

function getAllSettingCombinations() {
  const gridSizes = [4, 5];
  const times = [30, 60, 90, 120, 180, 0];
  const minLens = [3, 4, 5, 6];
  
  const combinations = [];
  for (const gridSize of gridSizes) {
    for (const time of times) {
      for (const minLen of minLens) {
        combinations.push({ gridSize, time, minLen });
      }
    }
  }
  return combinations;
}

function getHighscores() {
  const dailyKey = getDailyKey();
  const allTimeKey = getAllTimeKey();
  const settingsKey = getHighscoreKey();
  
  const dailyData = JSON.parse(localStorage.getItem(dailyKey) || '{}');
  const allTimeData = JSON.parse(localStorage.getItem(allTimeKey) || '{}');
  const settingsData = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  
  if (config.time === 0) {
    // Endless mode: return percentages
    return {
      daily: { 
        value: dailyData.percentage || 0, 
        type: 'percentage',
        score: dailyData.score || 0,
        date: dailyData.date 
      },
      allTime: { 
        value: allTimeData.percentage || 0, 
        type: 'percentage',
        score: allTimeData.score || 0,
        date: allTimeData.date 
      },
      settings: { 
        value: settingsData.percentage || 0, 
        type: 'percentage',
        score: settingsData.score || 0,
        date: settingsData.date 
      }
    };
  } else {
    // Timed mode: return scores
    return {
      daily: { 
        value: dailyData.score || 0, 
        type: 'score',
        date: dailyData.date 
      },
      allTime: { 
        value: allTimeData.score || 0, 
        type: 'score',
        date: allTimeData.date 
      },
      settings: { 
        value: settingsData.score || 0, 
        type: 'score',
        date: settingsData.date 
      }
    };
  }
}

/* ================= ENHANCED END GAME SCORING ================= */
function updateGameStatistics() {
  const highscores = getHighscores();
  
  // Update stats display
  const dailyStat = document.getElementById('stat-daily');
  const allTimeStat = document.getElementById('stat-alltime');
  const settingsStat = document.getElementById('stat-settings');
  const currentSettingsStat = document.getElementById('stat-current-settings');
  
  if (dailyStat) {
    if (config.time === 0 && highscores.daily.type === 'percentage') {
      dailyStat.textContent = `${highscores.daily.value}%`;
    } else {
      dailyStat.textContent = highscores.daily.value || 0;
    }
  }
  
  if (allTimeStat) {
    if (config.time === 0 && highscores.allTime.type === 'percentage') {
      allTimeStat.textContent = `${highscores.allTime.value}%`;
    } else {
      allTimeStat.textContent = highscores.allTime.value || 0;
    }
  }
  
  if (settingsStat) {
    if (config.time === 0 && highscores.settings.type === 'percentage') {
      settingsStat.textContent = `${highscores.settings.value}%`;
    } else {
      settingsStat.textContent = highscores.settings.value || 0;
    }
  }
  
  // Calculate settings-specific high score
  const settingsKey = getHighscoreKey();
  const settingsData = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  if (currentSettingsStat) {
    if (config.time === 0) {
      currentSettingsStat.textContent = `${settingsData.percentage || 0}%`;
    } else {
      currentSettingsStat.textContent = settingsData.score || 0;
    }
  }
  
  // Update high score labels
  updateHighScoreLabels();
  
  // Update new game over score comparison
  updateScoreComparison(highscores);
  
  // Update main menu high scores
  updateHighscoresDisplay();
}

function updateScoreComparison(highscores) {
  const scoreComparison = document.getElementById('score-comparison');
  const newRecordBadge = document.getElementById('new-record-badge');
  const settingsKey = getHighscoreKey();
  const settingsData = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  
  if (!scoreComparison || !newRecordBadge) return;
  
  let currentSettingsHigh;
  let currentValue;
  
  if (config.time === 0) {
    // Endless mode: compare percentages
    currentSettingsHigh = settingsData.percentage || 0;
    const totalPossible = allPossibleWords.size;
    const wordsFound = foundWords.size;
    currentValue = totalPossible > 0 ? Math.round((wordsFound / totalPossible) * 100) : 0;
    
    if (currentValue > currentSettingsHigh) {
      // New record!
      scoreComparison.innerHTML = `
        <div class="record-message">
          <span class="record-icon">🏆</span>
          <span class="record-text">New Settings Record!</span>
        </div>
        <div class="record-details">
          <span class="old-record">Previous: ${currentSettingsHigh}%</span>
          <span class="record-improvement">+${currentValue - currentSettingsHigh}%</span>
        </div>
      `;
      newRecordBadge.style.display = 'block';
    } else if (currentValue === currentSettingsHigh) {
      // Tied record
      scoreComparison.innerHTML = `
        <div class="record-message">
          <span class="record-icon">🎯</span>
          <span class="record-text">Tied Settings Record!</span>
        </div>
        <div class="record-details">
          <span class="old-record">Keep going to beat it!</span>
        </div>
      `;
      newRecordBadge.style.display = 'none';
    } else {
      // Didn't beat record
      const difference = currentSettingsHigh - currentValue;
      scoreComparison.innerHTML = `
        <div class="record-message">
          <span class="record-icon">📊</span>
          <span class="record-text">Settings Record: ${currentSettingsHigh}%</span>
        </div>
        <div class="record-details">
          <span class="old-record">You need ${difference} more %</span>
        </div>
      `;
      newRecordBadge.style.display = 'none';
    }
  } else {
    // Timed mode: compare scores
    currentSettingsHigh = settingsData.score || 0;
    currentValue = currentScore;
    
    if (currentValue > currentSettingsHigh) {
      // New record!
      scoreComparison.innerHTML = `
        <div class="record-message">
          <span class="record-icon">🏆</span>
          <span class="record-text">New Settings Record!</span>
        </div>
        <div class="record-details">
          <span class="old-record">Previous: ${currentSettingsHigh}</span>
          <span class="record-improvement">+${currentValue - currentSettingsHigh}</span>
        </div>
      `;
      newRecordBadge.style.display = 'block';
    } else if (currentValue === currentSettingsHigh) {
      // Tied record
      scoreComparison.innerHTML = `
        <div class="record-message">
          <span class="record-icon">🎯</span>
          <span class="record-text">Tied Settings Record!</span>
        </div>
        <div class="record-details">
          <span class="old-record">Keep going to beat it!</span>
        </div>
      `;
      newRecordBadge.style.display = 'none';
    } else {
      // Didn't beat record
      const difference = currentSettingsHigh - currentValue;
      scoreComparison.innerHTML = `
        <div class="record-message">
          <span class="record-icon">📊</span>
          <span class="record-text">Settings Record: ${currentSettingsHigh}</span>
        </div>
        <div class="record-details">
          <span class="old-record">You need ${difference} more points</span>
        </div>
      `;
      newRecordBadge.style.display = 'none';
    }
  }
}

function updateHighScoreLabels() {
  const dailyLabel = document.getElementById('daily-label');
  const settingsLabel = document.getElementById('settings-label');
  const allTimeLabel = document.getElementById('alltime-label');
  
  if (config.time === 0) {
    // Endless mode
    if (dailyLabel) dailyLabel.textContent = 'Daily % Best';
    if (settingsLabel) settingsLabel.textContent = 'Settings % Best';
    if (allTimeLabel) allTimeLabel.textContent = 'All-Time % Best';
  } else {
    // Timed mode
    if (dailyLabel) dailyLabel.textContent = 'Daily Score Best';
    if (settingsLabel) settingsLabel.textContent = 'Settings Score Best';
    if (allTimeLabel) allTimeLabel.textContent = 'All-Time Score Best';
  }
}

/* ================= TRIE DATA STRUCTURE ================= */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (let char of word.toUpperCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    node.isEndOfWord = true;
  }

  search(word) {
    let node = this.root;
    for (let char of word.toUpperCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char);
    }
    return node.isEndOfWord;
  }

  startsWith(prefix) {
    let node = this.root;
    for (let char of prefix.toUpperCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char);
    }
    return true;
  }
}

let trie = new Trie();

/* ================= PARTICLE SYSTEM ================= */
class Particle {
  constructor(x, y, color, score) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 8 + 2;
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * -8 - 2;
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.005;
    this.score = score || 0;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= this.decay;
    this.speedY += 0.15;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    if (this.score > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.globalAlpha = this.life * 0.8;
      ctx.fillText(`+${this.score}`, this.x, this.y - 15);
    }
  }
}

let particles = [];

function createParticles(x, y, color, score) {
  const particleCount = score ? 15 : 8;
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(x, y, color, score));
  }
}

function updateParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update()) {
      particles.splice(i, 1);
    } else {
      particles[i].draw(ctx);
    }
  }
}

function initParticleCanvas() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  function animateParticles() {
    updateParticles();
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

/* ================= 3D BOARD TILT EFFECT ================= */
let tiltEnabled = false;
let tiltX = 0;
let tiltY = 0;
const MAX_TILT = 1;

function initBoardTilt() {
  const board = document.getElementById('board');
  if (!board || !tiltEnabled) return;
  
  board.style.transformStyle = 'preserve-3d';
  board.style.perspective = '1000px';
  board.style.transition = 'transform 0.2s ease-out';
  board.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)';
  
  const boardWrap = document.getElementById('board-wrap');
  if (!boardWrap) return;
  
  boardWrap.addEventListener('mousemove', handleTilt);
  boardWrap.addEventListener('touchmove', handleTilt, { passive: false });
  boardWrap.addEventListener('mouseleave', resetTilt);
  boardWrap.addEventListener('touchend', resetTilt);
}

function handleTilt(e) {
  const board = document.getElementById('board');
  if (!tiltEnabled || gameEnded || !board) return;
  
  e.preventDefault();
  
  const rect = board.getBoundingClientRect();
  let clientX, clientY;
  
  if (e.type === 'touchmove') {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  
  tiltY = (relX - 0.5) * 2 * MAX_TILT;
  tiltX = -(relY - 0.5) * 2 * MAX_TILT;
  
  board.style.transform = `
    perspective(1000px)
    rotateX(${tiltX}deg)
    rotateY(${tiltY}deg)
    scale3d(1.02, 1.02, 1.02)
  `;
}

function resetTilt() {
  const board = document.getElementById('board');
  if (!board) return;
  
  tiltX = 0;
  tiltY = 0;
  board.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
}

/* ================= SETTINGS FUNCTIONS ================= */
window.setGridSize = function(size) {
  config.gridSize = size;
  updateSettingsUI();
  saveSettings();
  updateHighscoresDisplay();
  updateHighScoreLabels();
};

window.setTimeLimit = function(time) {
  config.time = time;
  updateSettingsUI();
  saveSettings();
  updateHighscoresDisplay();
  updateHighScoreLabels();
};

window.setMinLength = function(length) {
  config.minLen = length;
  updateSettingsUI();
  saveSettings();
  updateHighscoresDisplay();
  updateHighScoreLabels();
};

/* ================= IMPROVED BOARD GENERATION ================= */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isVowel(letter) {
  const vowels = ['A', 'E', 'I', 'O', 'U', 'QU'];
  return vowels.includes(letter.toUpperCase());
}

function generateImprovedBoard(gridSize) {
  const dice = gridSize === 4 ? DICE_4x4 : DICE_5x5;
  const totalTiles = gridSize * gridSize;
  let board = [];
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    board = [];
    const shuffledDice = shuffleArray([...dice]);
    
    for (let i = 0; i < totalTiles; i++) {
      const die = shuffledDice[i];
      const letter = die[Math.floor(Math.random() * die.length)];
      board.push(letter === "Q" ? "Qu" : letter);
    }
    
    attempts++;
    
    // For 5x5 grids, ensure good distribution
    if (gridSize === 5 && attempts < maxAttempts) {
      let vowelCount = 0;
      let consonantCount = 0;
      
      board.forEach(letter => {
        if (isVowel(letter)) vowelCount++;
        else consonantCount++;
      });
      
      const vowelRatio = vowelCount / totalTiles;
      if (vowelRatio < 0.3 || vowelRatio > 0.5) {
        continue;
      }
    }
  } while (attempts < maxAttempts);
  
  console.log(`Generated board with ${attempts} attempts`);
  return board;
}

/* ================= IMPROVED PROGRESS BAR ================= */
function updateProgressBar() {
  const totalWords = allPossibleWords.size;
  const foundCount = foundWords.size;
  
  const progressStats = document.getElementById('progress-stats');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.querySelector('.progress-label');
  
  if (progressStats) {
    progressStats.textContent = `${foundCount}`;
  }
  
  if (progressLabel) {
    progressLabel.textContent = `Words Found (${foundCount}/${totalWords})`;
  }
  
  if (progressFill && totalWords > 0) {
    const percentage = Math.min(100, (foundCount / totalWords) * 100);
    progressFill.style.width = `${percentage}%`;
    
    // Color coding based on completion
    if (percentage >= 75) {
      progressFill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
    } else if (percentage >= 50) {
      progressFill.style.background = 'linear-gradient(90deg, #0ea5e9, #3b82f6)';
    } else if (percentage >= 25) {
      progressFill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    } else {
      progressFill.style.background = 'linear-gradient(90deg, #0ea5e9, #8b5cf6)';
    }
  }
}

/* ================= CORE GAME FUNCTIONS ================= */
window.startGame = function() {
  console.log("Starting game with settings:", config);

  gameEnded = false;
  wordData.clear();
  foundWords.clear();
  allPossibleWords.clear();

  showLoadingScreen();
  updateLoadingProgress(10, "Initializing game...");

  // Use improved board generation
  board = generateImprovedBoard(config.gridSize);
  const totalTiles = config.gridSize * config.gridSize;

  generateSpecialTiles();

  timeLeft = config.time > 0 ? config.time : 999;
  startTime = Date.now();
  path = [];
  currentScore = 0;

  updateLoadingProgress(30, "Finding all possible words...");
  findAllPossibleWords().then(words => {
    allPossibleWords = words;
    updateLoadingProgress(90, "Finalizing setup...");
    completeGameSetup();
  }).catch(error => {
    console.error("Error finding words:", error);
    completeGameSetup();
  });
};

function completeGameSetup() {
  updateLoadingProgress(100, "Ready!");

  setTimeout(() => {
    hideLoadingScreen();

    // Switch to game screen
    showScreen('game-ui');

    // Setup canvas
    const canvas = document.getElementById('lineCanvas');
    const board = document.getElementById('board');
    if (canvas && board) {
      canvas.width = board.clientWidth;
      canvas.height = board.clientHeight;
    }

    // Initialize 3D tilt
    initBoardTilt();

    // Render board with enhanced 3D effect
    renderBoard(board);

    // Reset UI
    const scoreEl = document.getElementById('score');
    const timeEl = document.getElementById('time');
    if (scoreEl) scoreEl.textContent = "0";
    if (timeEl) timeEl.textContent = timeLeft;
    if (timeEl) timeEl.style.color = '';
    updateProgressBar();
    
    // Update game music controls
    updateGameMusicControls();

    // Start timer if not unlimited
    if (timerInt) clearInterval(timerInt);

    if (config.time > 0) {
      timerInt = setInterval(() => {
        timeLeft--;
        const timeEl = document.getElementById('time');
        if (timeEl) timeEl.textContent = timeLeft;

        if (timeLeft <= 10) {
          if (timeEl) timeEl.style.color = '#ef4444';
          if (timeLeft <= 5 && timeLeft > 0) {
            if (typeof playSound === 'function') playSound('warning');
          }
        }

        if (timeLeft <= 0) endGame();
      }, 1000);
    } else {
      const timeEl = document.getElementById('time');
      if (timeEl) {
        timeEl.textContent = "∞";
        timeEl.style.color = '#8b5cf6';
      }
    }
  }, 300);
}

function generateSpecialTiles() {
  const totalTiles = config.gridSize * config.gridSize;
  mults = new Array(totalTiles).fill("");

  const numSpecial = Math.floor(Math.random() * 3) + (config.gridSize === 4 ? 2 : 4);
  const specialIndices = [];

  while (specialIndices.length < numSpecial) {
    const idx = Math.floor(Math.random() * totalTiles);
    if (!specialIndices.includes(idx)) {
      specialIndices.push(idx);
    }
  }

  for (let i = 0; i < specialIndices.length; i++) {
    const mult = MULTS[Math.floor(Math.random() * MULTS.length)];
    mults[specialIndices[i]] = mult;
  }
}

function renderBoard(target) {
  if (!target) return;

  target.innerHTML = "";
  target.style.gridTemplateColumns = `repeat(${config.gridSize}, 1fr)`;

  board.forEach((l, i) => {
    let t = document.createElement('div');
    t.className = 'tile';

    if (mults[i]) {
      t.classList.add(mults[i]);
    }

    t.textContent = l;
    t.dataset.i = i;

    // Tile score element (only in game, not in game-over)
    if (!target.classList.contains('game-board')) {
      const tileScore = getTileScore(l, mults[i]);
      const scoreIndicator = document.createElement('div');
      scoreIndicator.className = 'tile-score';
      scoreIndicator.textContent = tileScore;
      t.appendChild(scoreIndicator);
    }

    if (mults[i]) {
      let m = document.createElement('div');
      m.className = `mult ${mults[i]}`;
      m.textContent = mults[i];
      t.appendChild(m);
    }

    target.appendChild(t);
  });
}

/* ================= INPUT HANDLING ================= */
let swiping = false;

function tileAt(x, y) {
  for (let t of document.querySelectorAll('#board .tile')) {
    let r = t.getBoundingClientRect();
    let cx = r.left + r.width / 2;
    let cy = r.top + r.height / 2;
    let radius = (r.width / 2) * 0.7;

    let dist = Math.hypot(x - cx, y - cy);
    if (dist < radius) return +t.dataset.i;
  }
  return null;
}

const handleStart = (e) => {
  e.preventDefault();
  swiping = true;
  path = [];
  const x = e.clientX || e.touches[0].clientX;
  const y = e.clientY || e.touches[0].clientY;
  let i = tileAt(x, y);
  if (i !== null) {
    addToPath(i);
  }
};

const handleMove = (e) => {
  if (!swiping) return;
  e.preventDefault();
  const x = e.clientX || e.touches[0].clientX;
  const y = e.clientY || e.touches[0].clientY;

  let i = tileAt(x, y);

  if (i !== null) {
    let last = path[path.length - 1];
    if (i !== last) {
      let size = config.gridSize;
      let r1 = Math.floor(last / size), c1 = last % size, r2 = Math.floor(i / size), c2 = i % size;
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) {
        if (!path.includes(i)) {
          addToPath(i);
          if (typeof playLinkSound === 'function') playLinkSound(path.length);
          if ('vibrate' in navigator) navigator.vibrate(10);
        } else if (path.length > 1 && i === path[path.length - 2]) popPath();
      }
    }
  }
};

const handleEnd = () => {
  if (!swiping) return;
  swiping = false;
  submitWord();
  clearPath();
};

function addToPath(i) {
  path.push(i);
  const tile = document.querySelector(`.tile[data-i="${i}"]`);
  if (tile) {
    tile.classList.add('active');
  }
  drawPath();
  const currentWord = document.getElementById('current-word');
  if (currentWord) currentWord.textContent = path.map(k => board[k]).join("").toUpperCase();
}

function popPath() {
  let i = path.pop();
  const tile = document.querySelector(`.tile[data-i="${i}"]`);
  if (tile) {
    tile.classList.remove('active');
  }
  drawPath();
  const currentWord = document.getElementById('current-word');
  if (currentWord) currentWord.textContent = path.map(k => board[k]).join("").toUpperCase();
}

function clearPath() {
  path.forEach(i => {
    const tile = document.querySelector(`.tile[data-i="${i}"]`);
    if (tile) {
      tile.classList.remove('active');
    }
  });
  path = [];
  drawPath();
  const currentWord = document.getElementById('current-word');
  if (currentWord) currentWord.textContent = "";
}

function drawPath() {
  const canvas = document.getElementById('lineCanvas');
  const board = document.getElementById('board');
  if (!canvas || !board) return;

  const ctx = canvas.getContext('2d');
  canvas.width = board.clientWidth;
  canvas.height = board.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (path.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let n = 0; n < path.length; n++) {
    const idx = path[n];
    const t = document.querySelector(`.tile[data-i="${idx}"]`);
    if (!t) continue;
    const tr = t.getBoundingClientRect();
    const br = board.getBoundingClientRect();
    const x = tr.left - br.left + tr.width / 2;
    const y = tr.top - br.top + tr.height / 2;

    if (n === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

/* ================= SCORING LOGIC ================= */
function submitWord() {
  let w = path.map(i => board[i]).join("").toUpperCase();
  if (w.length < config.minLen) return;

  const multipliers = getMultipliersForWord(path);
  let newScore = calcScore(w, path);

  if (foundWords.has(w)) {
    let oldScore = foundWords.get(w);

    if (newScore > oldScore) {
      foundWords.set(w, newScore);
      wordData.set(w, { score: newScore, path: [...path], multipliers: multipliers });

      currentScore = currentScore - oldScore + newScore;
      const scoreEl = document.getElementById('score');
      if (scoreEl) scoreEl.textContent = currentScore;

      flash('better');
      if (typeof playSound === 'function') playSound('better');
      
      // Play word complete sound for better feedback
      if (typeof playWordCompleteSound === 'function') {
        playWordCompleteSound(w.length, newScore);
      }

      const board = document.getElementById('board');
      if (board) {
        const boardRect = board.getBoundingClientRect();
        const centerX = boardRect.left + boardRect.width / 2;
        const centerY = boardRect.top + boardRect.height / 2;
        createParticles(centerX, centerY, '#8b5cf6', newScore);
      }

      updateProgressBar();
    } else {
      flash('repeat');
      if (typeof playSound === 'function') playSound('bad');
    }
  } else if (dict.has(w)) {
    foundWords.set(w, newScore);
    wordData.set(w, { score: newScore, path: [...path], multipliers: multipliers });

    currentScore += newScore;
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = currentScore;

    flash('good');
    if (typeof playSound === 'function') playSound('good');
    
    // Play word complete sound for better feedback
    if (typeof playWordCompleteSound === 'function') {
      playWordCompleteSound(w.length, newScore);
    }

    path.forEach(i => {
      const tile = document.querySelector(`.tile[data-i="${i}"]`);
      if (tile) {
        const rect = tile.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        createParticles(centerX, rect.top + 20, '#22c55e', newScore);
      }
    });

    updateProgressBar();

    if (scoreEl) {
      scoreEl.style.transform = 'scale(1.2)';
      scoreEl.style.color = '#22c55e';
      setTimeout(() => {
        scoreEl.style.transform = 'scale(1)';
        scoreEl.style.color = '';
      }, 200);
    }
  } else {
    flash('bad');
    if (typeof playSound === 'function') playSound('bad');
  }
}

// In the calcScore function (around line ~500)
function calcScore(w, idxs) {
  let pts = 0;
  let wordMultiplier = 1;

  for (let j = 0; j < idxs.length; j++) {
    const i = idxs[j];
    let letter = board[i].toUpperCase();
    let letterValue = LETTER_VALUES[letter] || 1;

    if (mults[i] === "DL") {
      letterValue *= 2;
    } else if (mults[i] === "TL") {
      letterValue *= 3;
    }

    if (mults[i] === "DW") {
      wordMultiplier *= 2;
    } else if (mults[i] === "TW") {
      wordMultiplier *= 3;
    }

    pts += letterValue;
  }

  pts *= wordMultiplier;

  // Bonus for longer words
  if (w.length >= 8) pts += 10;
  if (w.length >= 10) pts += 15; // Extra bonus for very long words

  return Math.max(pts, 1);
}

function flash(cls) {
  path.forEach(i => {
    let t = document.querySelector(`.tile[data-i="${i}"]`);
    if (t) {
      t.classList.remove('good', 'bad', 'repeat', 'better');
    }
  });

  path.forEach(i => {
    let t = document.querySelector(`.tile[data-i="${i}"]`);
    if (t) {
      t.classList.add(cls);
      setTimeout(() => {
        t.classList.remove(cls);
      }, 400);
    }
  });
}

function getMultipliersForWord(path) {
  const multiplierCounts = {
    DL: 0,
    TL: 0,
    DW: 0,
    TW: 0
  };

  for (const idx of path) {
    if (mults[idx]) {
      if (mults[idx] === 'DL') multiplierCounts.DL++;
      else if (mults[idx] === 'TL') multiplierCounts.TL++;
      else if (mults[idx] === 'DW') multiplierCounts.DW++;
      else if (mults[idx] === 'TW') multiplierCounts.TW++;
    }
  }

  return multiplierCounts;
}

/* ================= FIND ALL POSSIBLE WORDS ================= */
async function findAllPossibleWords() {
  const words = new Map();
  const visited = new Array(board.length).fill(false);
  const size = config.gridSize;
  const minLen = config.minLen;

  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  const stack = [];

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const idx = i * size + j;
      const newVisited = visited.slice();
      newVisited[idx] = true;
      const letter = board[idx].toUpperCase();
      
      if (letter === "QU") {
        if (trie.startsWith("Q")) {
          stack.push([i, j, "QU", trie.root.children.get("Q"), newVisited, [idx]]);
        }
      } else {
        if (trie.startsWith(letter)) {
          stack.push([i, j, letter, trie.root.children.get(letter), newVisited, [idx]]);
        }
      }
    }
  }

  let processed = 0;
  const batchSize = 1000;
  
  while (stack.length > 0) {
    const [row, col, currentWord, currentNode, currentVisited, currentPath] = stack.pop();
    
    if (currentNode.isEndOfWord && currentWord.length >= minLen) {
      words.set(currentWord, currentPath);
    }
    
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      
      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        const newIdx = newRow * size + newCol;
        if (!currentVisited[newIdx]) {
          const newLetter = board[newIdx].toUpperCase();
          
          if (newLetter === "QU") {
            if (currentNode.children.has("Q")) {
              const qNode = currentNode.children.get("Q");
              if (qNode.children.has("U")) {
                const newCurrentNode = qNode.children.get("U");
                const newCurrentWord = currentWord + "QU";
                const newCurrentPath = [...currentPath, newIdx];
                const newCurrentVisited = currentVisited.slice();
                newCurrentVisited[newIdx] = true;
                stack.push([newRow, newCol, newCurrentWord, newCurrentNode, newCurrentVisited, newCurrentPath]);
              }
            }
          } else {
            if (currentNode.children.has(newLetter)) {
              const newCurrentNode = currentNode.children.get(newLetter);
              const newCurrentWord = currentWord + newLetter;
              const newCurrentPath = [...currentPath, newIdx];
              const newCurrentVisited = currentVisited.slice();
              newCurrentVisited[newIdx] = true;
              stack.push([newRow, newCol, newCurrentWord, newCurrentNode, newCurrentVisited, newCurrentPath]);
            }
          }
        }
      }
    }
    
    processed++;
    if (processed % batchSize === 0) {
      const progress = 60 + Math.floor((processed / (size * size * 100)) * 30);
      updateLoadingProgress(Math.min(progress, 90), `Found ${words.size} words...`);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  console.log(`Found ${words.size} possible words on board`);
  return words;
}

/* ================= ENHANCED GAME OVER FUNCTIONS ================= */
window.endGame = function() {
  console.log("🔚 End game called");
  if (gameEnded) {
    console.log("Game already ended, skipping");
    return;
  }
  gameEnded = true;

  clearInterval(timerInt);
  resetTilt();

  // Save highscore
  saveHighscore(currentScore);

  // Switch to summary music
  if (config.musicVolume > 0 && typeof playMusic === 'function') {
    // Only play summary music if we're not already playing it
    if (!window.currentMusic || !window.currentMusic.id || window.currentMusic.id !== 'summary-music-track') {
      playMusic('summary');
    }
  }

  // Update game over screen elements
  const finalScore = document.getElementById('final-score');
  const statWords = document.getElementById('stat-words');
  
  if (finalScore) finalScore.textContent = currentScore;
  if (statWords) statWords.textContent = foundWords.size;

  // Update game statistics
  updateGameStatistics();

  // Render the game over board
  renderGameOverBoard();

  // Create celebration particles
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  for (let i = 0; i < 5; i++) {
    const x = Math.random() * screenWidth;
    const y = Math.random() * screenHeight;
    const colors = ['#0ea5e9', '#22c55e', '#8b5cf6', '#fbbf24', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    createParticles(x, y, color, 0);
  }

  // Generate word list with all possible words
  generateCompleteWordList();
  
  // Create word length distribution chart
  createWordLengthChart();
  
  // Draw longest word path
  drawLongestWordPath();

  // Show game over screen after a short delay
  console.log("Showing game over screen in 500ms");
  setTimeout(() => {
    console.log("Showing game over screen NOW");
    showScreen('game-over');
  }, 500);
};

function renderGameOverBoard() {
  const target = document.getElementById('game-over-board');
  if (!target) return;

  target.innerHTML = "";
  target.style.gridTemplateColumns = `repeat(${config.gridSize}, 1fr)`;
  target.style.gridTemplateRows = `repeat(${config.gridSize}, 1fr)`;

  const canvas = document.getElementById('game-over-lineCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  board.forEach((l, i) => {
    let t = document.createElement('div');
    t.className = 'game-over-tile';

    if (mults[i]) {
      t.classList.add(mults[i]);
    }

    t.textContent = l;
    t.dataset.i = i;

    if (mults[i]) {
      let m = document.createElement('div');
      m.className = `game-over-mult ${mults[i]}`;
      m.textContent = mults[i];
      t.appendChild(m);
    }

    target.appendChild(t);
  });
}

function drawLongestWordPath() {
  setTimeout(() => {
    const canvas = document.getElementById('game-over-lineCanvas');
    const boardElement = document.getElementById('game-over-board');
    if (!canvas || !boardElement) return;

    // Find the longest word from found words
    let longestWord = '';
    let longestPath = [];
    let highestScore = 0;
    
    for (let [word, data] of wordData.entries()) {
      if (word.length > longestWord.length || 
          (word.length === longestWord.length && data.score > highestScore)) {
        longestWord = word;
        longestPath = data.path;
        highestScore = data.score;
      }
    }
    
    if (longestPath.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = boardElement.clientWidth;
    canvas.height = boardElement.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the path with a more transparent line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let n = 0; n < longestPath.length; n++) {
      const idx = longestPath[n];
      const t = document.querySelector(`#game-over-board .game-over-tile[data-i="${idx}"]`);
      if (!t) continue;
      const tr = t.getBoundingClientRect();
      const br = boardElement.getBoundingClientRect();
      const x = tr.left - br.left + tr.width / 2;
      const y = tr.top - br.top + tr.height / 2;
      
      if (n === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    console.log(`🎯 Longest word path drawn: ${longestWord} (${longestWord.length} letters)`);
  }, 100);
}

/* ================= WORD LENGTH DISTRIBUTION CHART ================= */
function createWordLengthChart() {
  const chartContainer = document.getElementById('word-chart-container');
  if (!chartContainer) return;

  const lengthDistribution = {};
  
  allPossibleWords.forEach((path, word) => {
    const length = word.length;
    if (!lengthDistribution[length]) {
      lengthDistribution[length] = { total: 0, found: 0 };
    }
    lengthDistribution[length].total++;
    
    if (foundWords.has(word)) {
      lengthDistribution[length].found++;
    }
  });

  const lengths = Object.keys(lengthDistribution).sort((a, b) => a - b);
  
  if (lengths.length === 0) {
    chartContainer.innerHTML = '<div class="no-data">No words found on this board</div>';
    return;
  }

  let chartHTML = '<div class="chart-bars">';
  
  lengths.forEach(length => {
    const data = lengthDistribution[length];
    const foundPercent = (data.found / data.total) * 100;
    const missedPercent = 100 - foundPercent;
    
    chartHTML += `
      <div class="chart-row">
        <div class="chart-label">${length} letters</div>
        <div class="chart-bar-container">
          <div class="chart-bar found" style="width: ${foundPercent}%">
            <span class="chart-count">${data.found}</span>
          </div>
          <div class="chart-bar missed" style="width: ${missedPercent}%">
            <span class="chart-count">${data.total - data.found}</span>
          </div>
        </div>
        <div class="chart-total">${data.total}</div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  
  const totalFound = foundWords.size;
  const totalPossible = allPossibleWords.size;
  const percentageFound = totalPossible > 0 ? Math.round((totalFound / totalPossible) * 100) : 0;
  
  chartHTML += `
    <div class="chart-summary">
      <div class="summary-item">
        <span class="summary-label">Found:</span>
        <span class="summary-value found">${totalFound}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Missed:</span>
        <span class="summary-value missed">${totalPossible - totalFound}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Completion:</span>
        <span class="summary-value">${percentageFound}%</span>
      </div>
    </div>
  `;
  
  chartContainer.innerHTML = chartHTML;
}

function generateCompleteWordList() {
  const wordList = document.getElementById('word-list');
  if (!wordList) return;

  const allWords = Array.from(allPossibleWords.entries()).map(([word, path]) => ({
    word,
    path,
    found: foundWords.has(word),
    score: foundWords.get(word) || 0
  }));

  allWords.sort((a, b) => {
    if (b.word.length !== a.word.length) {
      return b.word.length - a.word.length;
    }
    return a.word.localeCompare(b.word);
  });

  wordList.innerHTML = '';

  if (allWords.length === 0) {
    wordList.innerHTML = '<div class="no-words">No words found on this board</div>';
    return;
  }

  const wordsByLength = {};
  allWords.forEach(item => {
    const length = item.word.length;
    if (!wordsByLength[length]) {
      wordsByLength[length] = [];
    }
    wordsByLength[length].push(item);
  });

  Object.keys(wordsByLength).sort((a, b) => b - a).forEach(length => {
    const section = document.createElement('div');
    section.className = 'word-length-section';
    
    const header = document.createElement('div');
    header.className = 'word-length-header';
    header.innerHTML = `<span class="word-length-label">${length}-letter words</span>
                       <span class="word-length-count">${wordsByLength[length].filter(w => w.found).length}/${wordsByLength[length].length}</span>`;
    section.appendChild(header);
    
    const wordGrid = document.createElement('div');
    wordGrid.className = 'word-grid';
    
    wordsByLength[length].forEach((item, index) => {
      const wordItem = document.createElement('div');
      wordItem.className = `word-item ${item.found ? 'found' : 'missed'}`;
      wordItem.style.animationDelay = `${index * 0.05}s`;
      
      const wordText = document.createElement('span');
      wordText.className = 'word-text';
      wordText.textContent = item.word.toUpperCase();
      
      if (item.found) {
        const scoreBadge = document.createElement('span');
        scoreBadge.className = 'word-score';
        scoreBadge.textContent = `+${item.score}`;
        wordItem.appendChild(scoreBadge);
      }
      
      wordItem.appendChild(wordText);
      wordGrid.appendChild(wordItem);
    });
    
    section.appendChild(wordGrid);
    wordList.appendChild(section);
  });
}

function getTileScore(letter, multiplier) {
  let letterValue = LETTER_VALUES[letter.toUpperCase()] || 1;

  if (multiplier === "DL") {
    letterValue *= 2;
  } else if (multiplier === "TL") {
    letterValue *= 3;
  }

  return letterValue;
}

window.quitGame = function() {
  if (confirm("End current game and see your results?")) {
    endGame();
  }
};

window.playAgain = function() {
  gameEnded = false;
  wordData.clear();
  
  // Start new game
  startGame();
};

/* ================= SIMPLIFIED GAME MUSIC CONTROLS ================= */
function updateGameMusicControls() {
  const gameTrackName = document.getElementById('game-track-name');
  if (gameTrackName && window.musicTracks) {
    const currentTrackId = window.getCurrentTrackId ? window.getCurrentTrackId() : null;
    if (currentTrackId) {
      const track = window.musicTracks.find(t => t.id === currentTrackId);
      if (track) {
        gameTrackName.textContent = track.name;
      }
    }
  }
}

/* ================= DICTIONARY LOADING ================= */
async function loadDictionary() {
  try {
    updateLoadingProgress(0, "Loading dictionary...");
    const r = await fetch(DICT_URL);
    const t = await r.text();
    updateLoadingProgress(50, "Processing words...");
    const words = t.toUpperCase().split(/\s+/);
    const totalWords = words.length;

    const chunkSize = 1000;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      chunk.forEach(w => {
        if (w.length < 3) return;
        dict.add(w);
        trie.insert(w);
      });

      const progress = Math.min(90, 50 + ((i / words.length) * 40));
      updateLoadingProgress(progress, `Loaded ${Math.min(i + chunkSize, totalWords)}/${totalWords} words...`);

      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const dictStatus = document.getElementById('dict-status');
    if (dictStatus) {
      dictStatus.textContent = "Dictionary Ready";
    }
  } catch (e) {
    console.error("Error loading dictionary:", e);
    
    const fallbackWords = ["APPLE", "PEAR", "BEAR", "GAME", "PLAY", "TIME", "WORD", "LETTER", "BOARD", "TILE",
      "SCORE", "GRID", "FIND", "SEARCH", "PUZZLE", "BRAIN", "FUN", "CHALLENGE"];

    fallbackWords.forEach(w => {
      dict.add(w);
      trie.insert(w);
    });
  }
}

/* ================= INITIALIZATION ================= */
function setupEventListeners() {
  const board = document.getElementById('board');
  
  // Remove any existing listeners
  if (board) {
    board.removeEventListener('mousedown', handleStart);
    board.removeEventListener('touchstart', handleStart);
  }

  // Remove window listeners
  window.removeEventListener('mousemove', handleMove);
  window.removeEventListener('touchmove', handleMove);
  window.removeEventListener('mouseup', handleEnd);
  window.removeEventListener('touchend', handleEnd);

  // Add listeners
  if (board) {
    board.addEventListener('mousedown', handleStart);
    board.addEventListener('touchstart', handleStart);
  }

  // Add window listeners
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('touchmove', handleMove);
  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchend', handleEnd);
}

function loadSettings() {
  const saved = localStorage.getItem('boggle_cfg');
  if (saved) {
    const savedConfig = JSON.parse(saved);
    Object.assign(config, savedConfig);
  }

  config.uiVolume = Math.max(0, Math.min(1, config.uiVolume || 0.7));
  config.musicVolume = Math.max(0, Math.min(1, config.musicVolume || 0.5));
  config.musicTrack = config.musicTrack || "random";

  updateSettingsUI();
  
  // Update high scores display
  updateHighscoresDisplay();
  
  // Update labels based on game mode
  updateHighScoreLabels();
}

function updateSettingsUI() {
  document.querySelectorAll('.size-btn').forEach(btn => {
    if (parseInt(btn.dataset.size) === config.gridSize) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.time-btn').forEach(btn => {
    if (parseInt(btn.dataset.time) === config.time) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.length-btn').forEach(btn => {
    if (parseInt(btn.dataset.length) === config.minLen) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

window.saveSettings = function() {
  localStorage.setItem('boggle_cfg', JSON.stringify(config));
  console.log("💾 Settings saved:", config);
};

function getRandomTrack() {
  const gameTracks = window.musicTracks ? window.musicTracks.filter(track => 
    track.id.startsWith('game') && track.id !== 'summary'
  ) : [];
  
  if (gameTracks.length > 0) {
    const randomTrack = gameTracks[Math.floor(Math.random() * gameTracks.length)];
    return randomTrack.id;
  }
  
  return 'game1';
}

function updateHighscoresDisplay() {
  const highscores = getHighscores();
  
  const dailyDisplay = document.getElementById('daily-highscore');
  const allTimeDisplay = document.getElementById('alltime-highscore');
  
  if (dailyDisplay) {
    if (config.time === 0 && highscores.daily.type === 'percentage') {
      dailyDisplay.textContent = `${highscores.daily.value}%`;
    } else {
      dailyDisplay.textContent = highscores.daily.value || 0;
    }
  }
  
  if (allTimeDisplay) {
    if (config.time === 0 && highscores.allTime.type === 'percentage') {
      allTimeDisplay.textContent = `${highscores.allTime.value}%`;
    } else {
      allTimeDisplay.textContent = highscores.allTime.value || 0;
    }
  }
}

/* ================= LOADING SCREEN FUNCTIONS ================= */
function showLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('active');
    loadingScreen.scrollTop = 0;
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.remove('active');
  }
}

function updateLoadingProgress(percentage, status = "") {
  const percent = Math.min(100, Math.max(0, Math.round(percentage)));
  const loadingBar = document.getElementById('loading-bar');
  const loadingPercentage = document.getElementById('loading-percentage');
  const loadingStatus = document.getElementById('loading-status');
  
  if (loadingBar) {
    loadingBar.style.width = percent + '%';
  }
  if (loadingPercentage) {
    loadingPercentage.textContent = percent + '%';
  }
  if (status && loadingStatus) {
    loadingStatus.textContent = status;
  }
}

// Initialize
window.addEventListener('load', function () {
    console.log("Boggle Party loaded!");
    loadSettings();
    setupEventListeners();
    initParticleCanvas();
    loadDictionary();

    // Make functions globally available
    window.getRandomTrack = getRandomTrack;
    window.getAllSettingCombinations = getAllSettingCombinations;
    
    // Don't redeclare updateMusicUI here - it's already in audio.js
    
    setTimeout(() => {
        if (typeof window.loadAudioSettings === 'function') {
            window.loadAudioSettings();
        }
        // Initial music UI update - wait for audio to initialize
        setTimeout(() => {
            if (typeof window.updateMusicUI === 'function') {
                window.updateMusicUI();
                console.log("🎵 Initial music UI update called");
            }
        }, 1500); // Increased delay for audio to fully initialize
    }, 500);
});