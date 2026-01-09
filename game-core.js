// Ensure isGamePlaying is declared if audio.js didn't load
if (typeof isGamePlaying === 'undefined') {
  window.isGamePlaying = false;
}

/* ================= CONFIG & STATE ================= */
const DICT_URL = "https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt";

const DICE_4x4 = [
  "AAEEGN",    "ABBJOO",    "ACHOPS",    "AFFKPS",
  "AOOTTW",    "CIMOTU",    "DEILRX",    "DELRVY",
  "DISTTY",    "EEGHNW",    "EEINSU",    "EHRTVW",
  "EIOSST",    "ELRTTY",    "HIMNQU",    "HLNNRZ"
];

const DICE_5x5 = [
  "AAAFRS", "AAEEEE", "AAFIRS", "ADENNN", "AEEEEM",
  "AEEGMU", "AEGMNN", "AFIRSY", "BJKQXZ", "CCNSTW",
  "CEIILT", "CEILPT", "CEIPST", "DDLNOR", "DHHLOR",
  "DHHNOT", "DHLNOR", "EIIITT", "EMOTTT", "ENSSSU",
  "FIPRSY", "GORRVW", "HIPRRY", "NOOTUW", "OOOTTU"
];

const MULTS = ["DL","TL","DW","TW"];

let config = { 
  gridSize: 4,
  time: 30, 
  minLen: 3, 
  scoring: "traditional",
  uiVolume: 0.7,
  musicVolume: 0.5,
  musicTrack: "game1",  // game1 or game2
  gameMode: "classic"
};

let dict = new Set();
let board = [], mults = [];
let path = [], foundWords = new Map();
let timerInt, timeLeft, startTime;
let currentScore = 0;
let gameEnded = false;

let wordData = new Map();

// Global audio state


const LETTER_VALUES = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10, 'QU': 10
};

const UI = {
  menu: document.getElementById('main-menu'),
  game: document.getElementById('game-ui'),
  gameOver: document.getElementById('game-over'),
  board: document.getElementById('board'),
  canvas: document.getElementById('lineCanvas'),
  particleCanvas: document.getElementById('particleCanvas'),
  currentWord: document.getElementById('current-word'),
  score: document.getElementById('score'),
  time: document.getElementById('time'),
  highScoreDisplay: document.getElementById('high-score-display'),
  finalScore: document.getElementById('final-score'),
  statWords: document.getElementById('stat-words'),
  statTime: document.getElementById('stat-time'),
  statAvg: document.getElementById('stat-avg'),
  wordList: document.getElementById('word-list'),
  comparisonCurrent: document.getElementById('comparison-current'),
  comparisonToday: document.getElementById('comparison-today'),
  comparisonAlltime: document.getElementById('comparison-alltime'),
  lengthBars: document.getElementById('length-bars'),
  longestWordResult: document.getElementById('longest-word-result'),
  longestWordInfo: document.getElementById('longest-word-info'),
  longestWordCount: document.getElementById('longest-word-count'),
  gameOverBoard: document.getElementById('game-over-board'),
  gameOverLineCanvas: document.getElementById('game-over-lineCanvas'),
  scoreLabel: document.getElementById('score-label'),
  wordhuntProgress: document.getElementById('wordhunt-progress'),
  wordhuntStats: document.getElementById('wordhunt-stats'),
  wordhuntProgressFill: document.getElementById('wordhunt-progress-fill'),
  wordhuntResults: document.getElementById('wordhunt-results'),
  wordhuntResultTitle: document.getElementById('wordhunt-result-title'),
  wordhuntPercentage: document.getElementById('wordhunt-percentage'),
  wordhuntResultProgress: document.getElementById('wordhunt-result-progress'),
  wordhuntFound: document.getElementById('wordhunt-found'),
  wordhuntTotal: document.getElementById('wordhunt-total'),
  loadingScreen: document.getElementById('loading-screen'),
  loadingBar: document.getElementById('loading-bar'),
  loadingPercentage: document.getElementById('loading-percentage'),
  loadingStatus: document.getElementById('loading-status')
};

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
let longestWordsOnBoard = [];
let longestWordPath = [];

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
  const ctx = UI.particleCanvas.getContext('2d');
  ctx.clearRect(0, 0, UI.particleCanvas.width, UI.particleCanvas.height);
  
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update()) {
      particles.splice(i, 1);
    } else {
      particles[i].draw(ctx);
    }
  }
}

function initParticleCanvas() {
  UI.particleCanvas.width = window.innerWidth;
  UI.particleCanvas.height = window.innerHeight;
  
  function animateParticles() {
    updateParticles();
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

/* ================= TILE SCORE FUNCTIONS ================= */
function getTileScore(letter, multiplier) {
    let letterValue = LETTER_VALUES[letter.toUpperCase()] || 1;
    
    if (multiplier === "DL") {
        letterValue *= 2;
    } else if (multiplier === "TL") {
        letterValue *= 3;
    }
    
    return letterValue;
}

/* ================= CORE GAME FUNCTIONS ================= */
function startGame() {
  // Reset game state
  gameEnded = false;
  wordData.clear();
  
  // Clear any existing event listeners and set up new ones
  setupEventListeners();
  
  // Show loading screen
  showLoadingScreen();
  updateLoadingProgress(10, "Initializing game...");
  
  // Update loading
  updateLoadingProgress(20, "Generating board...");
  
  // Generate board based on grid size
  const dice = config.gridSize === 4 ? DICE_4x4 : DICE_5x5;
  const totalTiles = config.gridSize * config.gridSize;
  
  board = [...dice].sort(()=>Math.random()-.5).map(x => {
    let c = x[Math.floor(Math.random()*x.length)];
    return c==="Q"?"Qu":c;
  }).slice(0, totalTiles);
  
  generateSpecialTiles();
  
  // Update loading
  updateLoadingProgress(40, "Setting up game...");
  
  // Reset game state
  foundWords.clear();
  timeLeft = config.time;
  startTime = Date.now();
  path = [];
  currentScore = 0;
  
  // Update loading
  updateLoadingProgress(60, "Finding word combinations...");
  
  // Find longest words on the new board
  setTimeout(() => {
    findLongestWordsOnBoardWithProgress().then(() => {
      updateLoadingProgress(90, "Finalizing setup...");
      
      // Set game state
      isGamePlaying = true;
      
      // Render board
      renderBoard(UI.board);
      
      // Reset UI
      UI.score.textContent = "0";
      UI.time.textContent = timeLeft;
      UI.time.style.color = '';
      UI.currentWord.textContent = "";
      
      // Reset Word Hunt UI if needed
      if (config.gameMode === 'wordhunt') {
        UI.scoreLabel.textContent = "Words";
        UI.wordhuntProgress.style.display = 'block';
      } else {
        UI.scoreLabel.textContent = "Score";
        UI.wordhuntProgress.style.display = 'none';
      }
      
      // Update loading
      updateLoadingProgress(100, "Ready!");
      
      // Hide loading screen after a brief delay
      setTimeout(() => {
        hideLoadingScreen();
        
        // Show game screen
        showScreen('game-ui');
        
        // Start game music with selected track
        if (config.musicVolume > 0 && typeof playMusic === 'function') {
          playMusic(config.musicTrack || 'game1');
        }
        
        // Setup canvas
        UI.canvas.width = UI.board.clientWidth;
        UI.canvas.height = UI.board.clientHeight;

        // Start timer
        if(timerInt) clearInterval(timerInt);
        timerInt = setInterval(() => {
          timeLeft--;
          UI.time.textContent = timeLeft;
          
          if (timeLeft <= 10) {
            UI.time.style.color = '#ef4444';
            if (timeLeft <= 5 && timeLeft > 0) {
              if (typeof playSound === 'function') playSound('warning');
            }
          }
          
          if(timeLeft <= 0) endGame();
        }, 1000);
      }, 300);
    }).catch(error => {
      console.error("Error finding words:", error);
      // Continue even if word finding fails
      hideLoadingScreen();
      showScreen('game-ui');
    });
  }, 100);
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
    
    // Add tile score indicator
    const tileScore = getTileScore(l, mults[i]);
    const scoreIndicator = document.createElement('div');
    scoreIndicator.className = 'tile-score';
    scoreIndicator.textContent = tileScore;
    t.appendChild(scoreIndicator);
    
    if(mults[i]) {
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
  for(let t of document.querySelectorAll('#board .tile')) {
    let r = t.getBoundingClientRect();
    let cx = r.left + r.width/2;
    let cy = r.top + r.height/2;
    let radius = (r.width/2) * 0.7; 
    
    let dist = Math.hypot(x - cx, y - cy);
    if(dist < radius) return +t.dataset.i;
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
  if(i!==null) {
    addToPath(i);
  }
};

const handleMove = (e) => {
  if(!swiping) return;
  e.preventDefault();
  const x = e.clientX || e.touches[0].clientX;
  const y = e.clientY || e.touches[0].clientY;
  
  let i = tileAt(x, y);
  
  if(i!==null) {
    let last = path[path.length-1];
    if(i !== last) {
      let size = config.gridSize;
      let r1=Math.floor(last/size), c1=last%size, r2=Math.floor(i/size), c2=i%size;
      if(Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1) {
        if(!path.includes(i)) {
          addToPath(i);
          if (typeof playLinkSound === 'function') playLinkSound(path.length);
          if ('vibrate' in navigator) navigator.vibrate(10);
        }
        else if(path.length>1 && i === path[path.length-2]) popPath();
      }
    }
  }
};

const handleEnd = () => {
  if(!swiping) return;
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
  UI.currentWord.textContent = path.map(k=>board[k]).join("").toUpperCase();
}

function popPath() {
  let i = path.pop();
  const tile = document.querySelector(`.tile[data-i="${i}"]`);
  if (tile) {
    tile.classList.remove('active');
  }
  drawPath();
  UI.currentWord.textContent = path.map(k=>board[k]).join("").toUpperCase();
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
  UI.currentWord.textContent = "";
}

function drawPath() {
  const ctx = UI.canvas.getContext('2d');
  UI.canvas.width = UI.board.clientWidth; 
  UI.canvas.height = UI.board.clientHeight;
  ctx.clearRect(0, 0, UI.canvas.width, UI.canvas.height);
  
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
    const br = UI.board.getBoundingClientRect();
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
  let w = path.map(i=>board[i]).join("").toUpperCase();
  if(w.length < config.minLen) return;
  
  // Get multipliers used in this path
  const multipliers = getMultipliersForWord(path);
  
  // Calculate score for this specific path
  let newScore = calcScore(w, path);
  
  // For Word Hunt mode, score is just 1 point per word
  if (config.gameMode === 'wordhunt') {
    newScore = 1;
  }
  
  // Check if multiplier was used in this path
  let multiplierUsed = false;
  for (let i = 0; i < path.length; i++) {
    if (mults[path[i]] && mults[path[i]].includes("W")) {
      multiplierUsed = true;
      break;
    }
  }
  
  if(foundWords.has(w)) {
    // Word already found - check if this path scores higher
    let oldScore = foundWords.get(w);
    
    if (newScore > oldScore) {
      // Higher score found! Update the score
      foundWords.set(w, newScore);
      wordData.set(w, {score: newScore, path: [...path], multiplierUsed: multiplierUsed, multipliers: multipliers});
      
      // Update total score
      currentScore = currentScore - oldScore + newScore;
      UI.score.textContent = currentScore;
      
      // Visual feedback with purple flash
      flash('better');
      if (typeof playSound === 'function') playSound('better');
      
      // Create particles from the center of the board
      const boardRect = UI.board.getBoundingClientRect();
      const centerX = boardRect.left + boardRect.width / 2;
      const centerY = boardRect.top + boardRect.height / 2;
      createParticles(centerX, centerY, '#8b5cf6', newScore);
      
      // Update high score if needed
      if (currentScore > getAllTimeHighScore()) {
        setAllTimeHighScore(currentScore);
        UI.highScoreDisplay.textContent = currentScore;
      }
      
      // Score animation
      UI.score.style.transform = 'scale(1.2)';
      UI.score.style.color = '#8b5cf6';
      setTimeout(() => {
        UI.score.style.transform = 'scale(1)';
        UI.score.style.color = '';
      }, 200);
    } else {
      // Same word with same or lower score
      flash('repeat');
      if (typeof playSound === 'function') playSound('bad');
    }
  } else if(dict.has(w)) {
    // New valid word
    foundWords.set(w, newScore);
    wordData.set(w, {score: newScore, path: [...path], multiplierUsed: multiplierUsed, multipliers: multipliers});
    
    // Update word count in lifetime stats
    updateWordLifetimeCount(w);
    
    // Update Score
    currentScore += newScore;
    UI.score.textContent = currentScore;
    
    // Visual feedback
    flash('good');
    if (typeof playSound === 'function') playSound('good');
    
    // Create particles from the tiles
    path.forEach(i => {
      const tile = document.querySelector(`.tile[data-i="${i}"]`);
      if (tile) {
        const rect = tile.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        createParticles(centerX, rect.top + 20, '#22c55e', newScore);
      }
    });
    
    // Score animation
    UI.score.style.transform = 'scale(1.2)';
    UI.score.style.color = '#22c55e';
    setTimeout(() => {
      UI.score.style.transform = 'scale(1)';
      UI.score.style.color = '';
    }, 200);
    
    // Update high score if needed
    if (currentScore > getAllTimeHighScore()) {
      setAllTimeHighScore(currentScore);
      UI.highScoreDisplay.textContent = currentScore;
    }
    
    // Update Word Hunt progress
    if (config.gameMode === 'wordhunt') {
      updateWordHuntProgress();
    }
  } else {
    // Invalid word
    flash('bad');
    if (typeof playSound === 'function') playSound('bad');
  }
}

function calcScore(w, idxs) {
  if (config.scoring === "traditional") {
    let len = w.length;
    let pts = len<=4?1 : len===5?2 : len===6?3 : len===7?5 : 11;
    
    idxs.forEach(i => {
      if(mults[i]==="DL") pts+=1;
      if(mults[i]==="TL") pts+=2;
      if(mults[i]==="DW") pts*=2;
      if(mults[i]==="TW") pts*=3;
    });
    return pts;
  } else {
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
    
    if (w.length >= 8) pts += 10;
    
    return Math.max(pts, 1);
  }
}

function flash(cls) {
  // Clear any existing flash classes from the current path first
  path.forEach(i => {
    let t = document.querySelector(`.tile[data-i="${i}"]`);
    if (t) {
      t.classList.remove('good', 'bad', 'repeat', 'better');
    }
  });
  
  // Now add the new flash class
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

/* ================= FIND LONGEST WORDS ================= */
async function findLongestWordsOnBoardWithProgress() {
  const words = new Map();
  const visited = new Array(board.length).fill(false);
  const size = config.gridSize;
  const totalCells = size * size;
  
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  let processedCells = 0;
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      processedCells++;
      const progress = (processedCells / totalCells) * 100;
      updateLoadingProgress(progress, `Analyzing cell ${i + 1},${j + 1}...`);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const newVisited = visited.slice();
      
      // Use a stack-based DFS for this starting cell
      const stack = [[i, j, '', trie.root, newVisited, []]];
      
      while (stack.length > 0) {
        const [row, col, currentWord, currentNode, currentVisited, currentPath] = stack.pop();
        const idx = row * size + col;
        const letter = board[idx].toUpperCase();
        
        // Special handling for "Qu" tile
        if (letter === "QU") {
          if (!currentNode.children.has('Q')) continue;
          let tempNode = currentNode.children.get('Q');
          if (!tempNode.children.has('U')) continue;
          const newCurrentNode = tempNode.children.get('U');
          const newCurrentWord = currentWord + 'QU';
          const newCurrentPath = [...currentPath, idx];
          const newCurrentVisited = currentVisited.slice();
          newCurrentVisited[idx] = true;
          
          if (newCurrentNode.isEndOfWord && newCurrentWord.length >= config.minLen) {
            words.set(newCurrentWord, newCurrentPath);
          }
          
          // Continue search
          for (const [dx, dy] of directions) {
            const newRow = row + dx;
            const newCol = col + dy;
            
            if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
              const newIdx = newRow * size + newCol;
              if (!newCurrentVisited[newIdx]) {
                stack.push([newRow, newCol, newCurrentWord, newCurrentNode, newCurrentVisited, newCurrentPath]);
              }
            }
          }
        } else {
          if (!currentNode.children.has(letter)) continue;
          const newCurrentNode = currentNode.children.get(letter);
          const newCurrentWord = currentWord + letter;
          const newCurrentPath = [...currentPath, idx];
          const newCurrentVisited = currentVisited.slice();
          newCurrentVisited[idx] = true;
          
          if (newCurrentNode.isEndOfWord && newCurrentWord.length >= config.minLen) {
            words.set(newCurrentWord, newCurrentPath);
          }
          
          // Continue search
          for (const [dx, dy] of directions) {
            const newRow = row + dx;
            const newCol = col + dy;
            
            if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
              const newIdx = newRow * size + newCol;
              if (!newCurrentVisited[newIdx]) {
                stack.push([newRow, newCol, newCurrentWord, newCurrentNode, newCurrentVisited, newCurrentPath]);
              }
            }
          }
        }
      }
    }
  }
  
  // Find the maximum length
  let maxLength = 0;
  for (const word of words.keys()) {
    if (word.length > maxLength) {
      maxLength = word.length;
    }
  }
  
  // Get all words with the maximum length
  const longestWords = [];
  const longestPaths = [];
  
  for (const [word, path] of words.entries()) {
    if (word.length === maxLength) {
      longestWords.push(word);
      longestPaths.push(path);
    }
  }
  
  // Remove duplicates
  const uniqueWords = [...new Set(longestWords)];
  const uniquePaths = [];
  
  for (let i = 0; i < longestWords.length; i++) {
    if (uniqueWords.includes(longestWords[i]) && !uniquePaths.some(p => JSON.stringify(p) === JSON.stringify(longestPaths[i]))) {
      uniquePaths.push(longestPaths[i]);
    }
  }
  
  longestWordsOnBoard = uniqueWords;
  longestWordPath = uniquePaths[0] || [];
  
  return words;
}

/* ================= GAME OVER FUNCTIONS ================= */
function endGame() {
  console.log("endGame called"); // Debug log
  if (gameEnded) return; // Prevent multiple calls
  gameEnded = true;
  
  clearInterval(timerInt);
  
  // Set game state
  isGamePlaying = false;
  
  // Switch to summary music
  if (config.musicVolume > 0 && typeof playMusic === 'function') {
    playMusic('summary');
  }
  
  // Set today's high score
  setTodayHighScore(currentScore);
  
  // Update game statistics
  updateGameStatistics(foundWords.size, currentScore);
  
  // Calculate time used
  const timeUsed = config.time - timeLeft;
  
  // Update game over screen
  UI.finalScore.textContent = currentScore;
  UI.statWords.textContent = foundWords.size;
  UI.statTime.textContent = timeUsed + 's';
  UI.statAvg.textContent = (foundWords.size > 0 ? (currentScore / foundWords.size).toFixed(1) : '0.0');
  
  // Update score comparisons
  const todayHigh = getTodayHighScore();
  const allTimeHigh = getAllTimeHighScore();
  
  UI.comparisonCurrent.textContent = currentScore;
  UI.comparisonToday.textContent = todayHigh;
  UI.comparisonAlltime.textContent = allTimeHigh;
  
  // Render the game over board with highlighted longest word path
  renderGameOverBoard();
  
  // Handle Word Hunt specific end game
  if (config.gameMode === 'wordhunt') {
    endWordHuntGame();
    UI.finalScore.textContent = foundWords.size; // Show word count instead of score
  }
  
  // Create celebration particles
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Create multiple particle bursts
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * screenWidth;
    const y = Math.random() * screenHeight;
    const colors = ['#0ea5e9', '#22c55e', '#8b5cf6', '#fbbf24', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    createParticles(x, y, color, 0);
  }
  
  // Special particles for final score
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;
  createParticles(centerX, centerY, '#22c55e', currentScore);
  
  if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 100]);
  
  // Generate enhanced end-game summary
  generateLongestWordInfo();
  generateWordLengthDistribution();
  generateWordList();
  
  // Show game over screen (summary music will start via showScreen)
  setTimeout(() => {
    console.log("Showing game-over screen");
    showScreen('game-over');
  }, 500);
}

function renderGameOverBoard() {
  const target = UI.gameOverBoard;
  if (!target) {
    console.error("Game over board element not found!");
    return;
  }
  
  target.innerHTML = "";
  target.style.gridTemplateColumns = `repeat(${config.gridSize}, 1fr)`;
  
  // Clear previous canvas
  const ctx = UI.gameOverLineCanvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, UI.gameOverLineCanvas.width, UI.gameOverLineCanvas.height);
  }
  
  // Set canvas size
  const boardWrap = document.getElementById('game-over-board-wrap');
  if (boardWrap && UI.gameOverLineCanvas) {
    UI.gameOverLineCanvas.width = boardWrap.clientWidth;
    UI.gameOverLineCanvas.height = boardWrap.clientHeight;
  }
  
  // Render tiles
  board.forEach((l, i) => {
    let t = document.createElement('div');
    t.className = 'game-over-tile';
    
    // Check if this tile is in the longest word path
    if (longestWordPath.includes(i)) {
      if (i === longestWordPath[0]) {
        t.classList.add('longest-path-start');
      } else if (i === longestWordPath[longestWordPath.length - 1]) {
        t.classList.add('longest-path-end');
      } else {
        t.classList.add('longest-path');
      }
    }
    
    // Apply multiplier styling
    if (mults[i]) {
      t.classList.add(mults[i]);
    }
    
    t.textContent = l;
    t.dataset.i = i;
    
    // Add tile score indicator
    const tileScore = getTileScore(l, mults[i]);
    const scoreIndicator = document.createElement('div');
    scoreIndicator.className = 'tile-score';
    scoreIndicator.textContent = tileScore;
    t.appendChild(scoreIndicator);
    
    // Add multiplier badge
    if(mults[i]) {
      let m = document.createElement('div');
      m.className = `game-over-mult ${mults[i]}`;
      m.textContent = mults[i];
      t.appendChild(m);
    }
    
    target.appendChild(t);
  });
  
  // Draw the path for the longest word if found by player
  if (longestWordPath.length > 0) {
    // Check if player found any of the longest words
    let playerFoundLongest = false;
    for (const word of longestWordsOnBoard) {
      if (foundWords.has(word)) {
        playerFoundLongest = true;
        break;
      }
    }
    
    if (playerFoundLongest) {
      drawLongestWordPath();
    }
  }
}

function drawLongestWordPath() {
  const ctx = UI.gameOverLineCanvas.getContext('2d');
  if (!ctx) return;
  
  if (longestWordPath.length < 2) return;
  
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let n = 0; n < longestWordPath.length; n++) {
    const idx = longestWordPath[n];
    const t = document.querySelector(`#game-over-board .game-over-tile[data-i="${idx}"]`);
    if (!t) continue;
    const tr = t.getBoundingClientRect();
    const br = UI.gameOverBoard.getBoundingClientRect();
    const x = tr.left - br.left + tr.width / 2;
    const y = tr.top - br.top + tr.height / 2;
    
    if (n === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Draw circles at start and end
  const startIdx = longestWordPath[0];
  const endIdx = longestWordPath[longestWordPath.length - 1];
  
  const startTile = document.querySelector(`#game-over-board .game-over-tile[data-i="${startIdx}"]`);
  const endTile = document.querySelector(`#game-over-board .game-over-tile[data-i="${endIdx}"]`);
  
  if (startTile && endTile) {
    const startRect = startTile.getBoundingClientRect();
    const endRect = endTile.getBoundingClientRect();
    const boardRect = UI.gameOverBoard.getBoundingClientRect();
    
    const startX = startRect.left - boardRect.left + startRect.width / 2;
    const startY = startRect.top - boardRect.top + startRect.height / 2;
    
    const endX = endRect.left - boardRect.left + endRect.width / 2;
    const endY = endRect.top - boardRect.top + endRect.height / 2;
    
    // Draw start circle
    ctx.beginPath();
    ctx.arc(startX, startY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw end circle
    ctx.beginPath();
    ctx.arc(endX, endY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function generateLongestWordInfo() {
  if (!UI.longestWordResult) return;
  
  if (longestWordsOnBoard.length === 0) {
    UI.longestWordResult.textContent = "No words found";
    UI.longestWordResult.className = "longest-word-result";
    if (UI.longestWordInfo) {
      UI.longestWordInfo.textContent = "No valid words could be formed from this board.";
    }
    if (UI.longestWordCount) {
      UI.longestWordCount.textContent = "";
    }
    return;
  }
  
  const longestWord = longestWordsOnBoard[0];
  const wordLength = longestWord.length;
  
  // Check if player found the longest word
  const playerFoundLongest = foundWords.has(longestWord);
  
  // Display the longest word
  UI.longestWordResult.textContent = `${longestWord} (${wordLength} letters)`;
  
  // Set color based on whether found or not
  if (playerFoundLongest) {
    UI.longestWordResult.className = "longest-word-result longest-word-found";
    if (UI.longestWordInfo) {
      UI.longestWordInfo.textContent = `Found! The path is highlighted on the board above.`;
    }
  } else {
    UI.longestWordResult.className = "longest-word-result longest-word-missed";
    if (UI.longestWordInfo) {
      UI.longestWordInfo.textContent = `Missed! See the highlighted path on the board.`;
    }
  }
  
  // Show additional information if multiple longest words
  if (UI.longestWordCount && longestWordsOnBoard.length > 1) {
    const otherWords = longestWordsOnBoard.slice(1).map(w => w.toUpperCase()).join(", ");
    UI.longestWordCount.textContent = `Also ${longestWordsOnBoard.length - 1} other ${wordLength}-letter word${longestWordsOnBoard.length > 2 ? 's' : ''}: ${otherWords}`;
  } else if (UI.longestWordCount) {
    UI.longestWordCount.textContent = "";
  }
}

function generateWordLengthDistribution() {
  if (!UI.lengthBars) return;
  
  // Count words by length
  const lengthCounts = {};
  
  for (const word of foundWords.keys()) {
    const length = word.length;
    lengthCounts[length] = (lengthCounts[length] || 0) + 1;
  }
  
  // Find max count for scaling
  const maxCount = Math.max(...Object.values(lengthCounts), 1);
  
  // Clear previous bars
  UI.lengthBars.innerHTML = '';
  
  // Create bars for lengths 3-10+
  for (let len = 3; len <= 10; len++) {
    const count = lengthCounts[len] || 0;
    const height = (count / maxCount) * 80; // 80px max height
    
    const bar = document.createElement('div');
    bar.className = 'length-bar';
    bar.style.height = `${height}px`;
    
    const countEl = document.createElement('div');
    countEl.className = 'length-count';
    countEl.textContent = count;
    
    const labelEl = document.createElement('div');
    labelEl.className = 'length-label';
    labelEl.textContent = len === 10 ? '10+' : len;
    
    bar.appendChild(countEl);
    bar.appendChild(labelEl);
    UI.lengthBars.appendChild(bar);
  }
}

function generateWordList() {
  if (!UI.wordList) return;
  
  // Sort words by score (highest first)
  const sortedWords = Array.from(wordData.entries())
    .sort((a, b) => b[1].score - a[1].score);
  
  UI.wordList.innerHTML = '';
  
  sortedWords.forEach(([word, data], index) => {
    const lifetimeCount = getWordLifetimeCount(word);
    
    const wordItem = document.createElement('div');
    wordItem.className = 'word-item';
    wordItem.style.animationDelay = `${index * 0.05}s`;
    
    // Create multiplier badges
    const multiplierBadges = [];
    if (data.multipliers.DL > 0) {
      multiplierBadges.push(`<div class="multiplier-badge DL">DL×${data.multipliers.DL}</div>`);
    }
    if (data.multipliers.TL > 0) {
      multiplierBadges.push(`<div class="multiplier-badge TL">TL×${data.multipliers.TL}</div>`);
    }
    if (data.multipliers.DW > 0) {
      multiplierBadges.push(`<div class="multiplier-badge DW">DW×${data.multipliers.DW}</div>`);
    }
    if (data.multipliers.TW > 0) {
      multiplierBadges.push(`<div class="multiplier-badge TW">TW×${data.multipliers.TW}</div>`);
    }
    
    wordItem.innerHTML = `
      <div class="word-text">${word.toUpperCase()}</div>
      <div class="word-stats">
        ${multiplierBadges.length > 0 ? `<div class="word-multipliers">${multiplierBadges.join('')}</div>` : ''}
        ${lifetimeCount > 1 ? `<div class="word-count">×${lifetimeCount}</div>` : ''}
        <div class="word-score">${data.score}</div>
      </div>
    `;
    
    UI.wordList.appendChild(wordItem);
  });
}

function quitGame() {
  if (confirm("End current game and see your results?")) {
    endGame();
  }
}

function playAgain() {
  // Reset game state
  gameEnded = false;
  wordData.clear();
  
  // Switch back to game music
  if (config.musicVolume > 0 && typeof playMusic === 'function') {
    playMusic(config.musicTrack || 'game1');
  }
  
  // Start new game with same settings
  if (config.gameMode === 'wordhunt') {
    startWordHuntGame();
  } else {
    startGame();
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
    
    // Process in chunks to avoid blocking
    const chunkSize = 1000;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      chunk.forEach(w => {
        if(w.length < 3) return;
        dict.add(w);
        trie.insert(w);
      });
      
      // Update progress
      const progress = Math.min(90, 50 + ((i / words.length) * 40));
      updateLoadingProgress(progress, `Loaded ${Math.min(i + chunkSize, totalWords)}/${totalWords} words...`);
      
      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    const dictStatus = document.getElementById('dict-status');
    if (dictStatus) {
      dictStatus.textContent = "Dictionary Ready";
    }
  } catch(e) {
    console.error("Error loading dictionary:", e);
    const dictStatus = document.getElementById('dict-status');
    if (dictStatus) {
      dictStatus.textContent = "Offline Dictionary Loaded";
    }
    
    // Add some fallback words
    const fallbackWords = ["APPLE","PEAR","BEAR","GAME","PLAY","TIME","WORD","LETTER","BOARD","TILE",
     "SCORE","GRID","FIND","SEARCH","PUZZLE","BRAIN","FUN","CHALLENGE"];
    
    fallbackWords.forEach(w => {
      dict.add(w);
      trie.insert(w);
    });
  }
}

/* ================= INITIALIZATION ================= */
function setupEventListeners() {
  // Remove any existing listeners first
  if (UI.board) {
    UI.board.removeEventListener('mousedown', handleStart);
    UI.board.removeEventListener('touchstart', handleStart);
  }
  
  // Remove window listeners
  window.removeEventListener('mousemove', handleMove);
  window.removeEventListener('touchmove', handleMove);
  window.removeEventListener('mouseup', handleEnd);
  window.removeEventListener('touchend', handleEnd);
  
  // Add listeners
  if (UI.board) {
    UI.board.addEventListener('mousedown', handleStart);
    UI.board.addEventListener('touchstart', handleStart);
  }
  
  // Add window listeners
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('touchmove', handleMove);
  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchend', handleEnd);
}

function loadSettings() {
  const saved = localStorage.getItem('boggle_cfg');
  if(saved) {
    const savedConfig = JSON.parse(saved);
    config = { ...config, ...savedConfig };
  }
  
  // Ensure volume values are within range
  config.uiVolume = Math.max(0, Math.min(1, config.uiVolume || 0.7));
  config.musicVolume = Math.max(0, Math.min(1, config.musicVolume || 0.5));
  config.musicTrack = config.musicTrack || "game1";
  
  updateSettingsUI();
}

// Initialize
// Add this to game-core.js initialization section (around line 1100)
window.addEventListener('load', function() {
    console.log("Boggle Party loaded!");
    loadSettings();
    setupEventListeners();
    initParticleCanvas();
    loadDictionary();
    
    // Initialize audio settings
    setTimeout(() => {
        // Load audio settings
        if (typeof loadAudioSettings === 'function') {
            loadAudioSettings();
        }
        
        // Setup settings event listeners
        if (typeof setupSettingsEventListeners === 'function') {
            setupSettingsEventListeners();
        }
    }, 500);
    
    // Set up global config reference for audio.js
    window.config = config;
});

// Make functions globally available
window.startGame = startGame;
window.quitGame = quitGame;
window.playAgain = playAgain;
window.isGamePlaying = isGamePlaying; // Export for audio.js