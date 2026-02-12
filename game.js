// Boggle Game - Enhanced with Sound Effects and Improved Gameplay

const CONFIG = {
    DICE_4x4: [
        "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
        "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
        "DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
        "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ"
    ],
    
    DICE_5x5: [
        "AAAFRS", "AAEEEE", "AAFIRS", "ADENNN", "AEEEEM",
        "AEEGMU", "AEGMNN", "AFIRSY", "BJKQXZ", "CCNSTW",
        "CEIILT", "CEILPT", "CEIPST", "DDLNOR", "DHHLOR",
        "DHHNOT", "DHLNOR", "EIIITT", "EMOTTT", "ENSSSU",
        "FIPRSY", "GORRVW", "HIPRRY", "NOOTUW", "OOOTTU"
    ],
    
    LETTER_VALUES: {
        'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
        'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
        'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
    },
    
    DICT_URL: "https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt",
    
    NOTE_FREQUENCIES: {
        C4: 261.63,
        D4: 293.66,
        E4: 329.63,
        F4: 349.23,
        G4: 392.00,
        A4: 440.00,
        B4: 493.88,
        C5: 523.25,
        D5: 587.33,
        E5: 659.25
    }
};

// ==================== SOUND MANAGER ====================
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.soundEnabled = true;
        this.isResumed = false;
        this.resumePromise = null;
        
        // Listen for the first user gesture to resume audio
        const resumeOnFirstClick = () => {
            this.resume();
            document.removeEventListener('click', resumeOnFirstClick);
            document.removeEventListener('touchstart', resumeOnFirstClick);
        };
        document.addEventListener('click', resumeOnFirstClick);
        document.addEventListener('touchstart', resumeOnFirstClick);
    }
    
    // Create and resume the audio context (must be called after user gesture)
    // Returns a promise that resolves when the context is running.
    resume() {
        if (this.isResumed) return Promise.resolve();
        if (this.resumePromise) return this.resumePromise;
        
        this.resumePromise = new Promise((resolve, reject) => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log("Audio context initialized");
                } catch (e) {
                    console.warn("Web Audio API not supported, sound disabled");
                    this.soundEnabled = false;
                    this.isResumed = true;
                    resolve();
                    return;
                }
            }
            
            if (this.audioContext.state === 'running') {
                this.isResumed = true;
                resolve();
            } else if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log("Audio context resumed");
                    this.isResumed = true;
                    resolve();
                }).catch(e => {
                    console.warn("Failed to resume audio context:", e);
                    resolve(); // Still resolve to not block game start
                });
            } else {
                // closed or other state – just resolve
                this.isResumed = true;
                resolve();
            }
        });
        
        return this.resumePromise;
    }
    
    playNote(frequency, duration = 0.2, type = 'sine', volume = 0.3) {
        if (!this.soundEnabled) return;
        if (!this.audioContext || this.audioContext.state !== 'running') return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * this.masterVolume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        this.showSoundIndicator(type === 'sine' ? 'correct' : 'incorrect');
    }
    
    playTileSelect() {
        this.playNote(CONFIG.NOTE_FREQUENCIES.C5, 0.1, 'sine', 0.2);
    }
    
    playTileConnect(step) {
        const notes = [CONFIG.NOTE_FREQUENCIES.C4, CONFIG.NOTE_FREQUENCIES.D4, 
                      CONFIG.NOTE_FREQUENCIES.E4, CONFIG.NOTE_FREQUENCIES.F4,
                      CONFIG.NOTE_FREQUENCIES.G4, CONFIG.NOTE_FREQUENCIES.A4,
                      CONFIG.NOTE_FREQUENCIES.B4, CONFIG.NOTE_FREQUENCIES.C5];
        const noteIndex = Math.min(step, notes.length - 1);
        this.playNote(notes[noteIndex], 0.15, 'sine', 0.15);
    }
    
    playWordValid() {
        const notes = [
            CONFIG.NOTE_FREQUENCIES.C5,
            CONFIG.NOTE_FREQUENCIES.E5,
            CONFIG.NOTE_FREQUENCIES.G4,
            CONFIG.NOTE_FREQUENCIES.C5
        ];
        
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.playNote(note, 0.2, 'sine', 0.25);
            }, index * 100);
        });
        
        this.showSoundIndicator('correct');
    }
    
    playWordInvalid() {
        this.playNote(CONFIG.NOTE_FREQUENCIES.C4, 0.3, 'square', 0.2);
        this.showSoundIndicator('incorrect');
    }
    
    playWordDuplicate() {
        this.playNote(CONFIG.NOTE_FREQUENCIES.A4, 0.25, 'triangle', 0.2);
        this.showSoundIndicator('incorrect');
    }
    
    showSoundIndicator(type) {
        if (!this.soundEnabled) return;
        
        const indicator = document.createElement('div');
        indicator.className = `sound-indicator ${type}`;
        indicator.innerHTML = type === 'correct' ? '🎵' : '🔊';
        indicator.style.left = `${Math.random() * 80 + 10}%`;
        indicator.style.top = `${Math.random() * 80 + 10}%`;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.classList.add('visible');
        }, 10);
        
        setTimeout(() => {
            indicator.classList.remove('visible');
            setTimeout(() => indicator.remove(), 300);
        }, 300);
    }
    
    toggleSound(enabled) {
        this.soundEnabled = enabled;
        if (enabled && !this.audioContext) {
            // Will be created on first user gesture
        }
    }
}

// ==================== DICTIONARY STRUCTURES ====================
class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
        this.wordCount = 0;
    }
    
    insert(word) {
        let node = this.root;
        const upperWord = word.toUpperCase();
        
        for (let char of upperWord) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }
        
        if (!node.isEndOfWord) {
            node.isEndOfWord = true;
            this.wordCount++;
        }
    }
    
    search(word) {
        let node = this.root;
        const upperWord = word.toUpperCase();
        
        for (let char of upperWord) {
            if (!node.children.has(char)) {
                return false;
            }
            node = node.children.get(char);
        }
        
        return node.isEndOfWord;
    }
    
    startsWith(prefix) {
        let node = this.root;
        const upperPrefix = prefix.toUpperCase();
        
        for (let char of upperPrefix) {
            if (!node.children.has(char)) {
                return false;
            }
            node = node.children.get(char);
        }
        
        return true;
    }
}

let dictionaryTrie = new Trie();
let dictionarySet = new Set();
let soundManager = new SoundManager();

// ==================== GAME STATE ====================
let gameState = {
    gridSize: 4,
    timeLimit: 180,
    minWordLength: 3,
    isPlaying: false,
    timeLeft: 0,
    score: 0,
    wordsFound: new Map(),
    currentWord: "",
    selectedTiles: [],
    allPossibleWords: new Map(),
    isDragging: false,
    board: [],
    timerInterval: null,
    lastScoreTime: 0,
    scorePopups: new Set(),
    dictionaryLoaded: false,
    dictionarySize: 0,
    longestWord: "",
    longestWordPath: [],
    totalPossibleScore: 0,
    isEndlessMode: false,
    percentageFound: 0,
    soundEnabled: true
};

// ==================== DICTIONARY LOADING ====================
async function loadDictionary() {
    console.log("Loading dictionary...");
    updateLoadingProgress(20, "Loading dictionary...");
    
    try {
        const response = await fetch(CONFIG.DICT_URL);
        
        if (!response.ok) {
            throw new Error(`Failed to load dictionary: ${response.status}`);
        }
        
        const text = await response.text();
        const words = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length >= 2);
        
        updateLoadingProgress(40, `Processing ${words.length.toLocaleString()} words...`);
        
        const batchSize = 5000;
        for (let i = 0; i < words.length; i += batchSize) {
            const batch = words.slice(i, i + batchSize);
            
            for (let word of batch) {
                if (word.length >= 2) {
                    dictionaryTrie.insert(word);
                    dictionarySet.add(word);
                    
                    if (word.includes('Q') && !word.includes('QU')) {
                        const quWord = word.replace(/Q/g, 'QU');
                        dictionaryTrie.insert(quWord);
                        dictionarySet.add(quWord);
                    }
                }
            }
            
            const progress = 40 + Math.floor((i / words.length) * 50);
            updateLoadingProgress(progress, `Processing ${i.toLocaleString()}/${words.length.toLocaleString()} words...`);
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        for (let word of words) {
            if (word.includes('QU')) {
                const qWord = word.replace(/QU/g, 'Q');
                dictionaryTrie.insert(qWord);
                dictionarySet.add(qWord);
            }
        }
        
        gameState.dictionaryLoaded = true;
        gameState.dictionarySize = words.length;
        console.log(`Dictionary loaded: ${words.length.toLocaleString()} words`);
        return true;
        
    } catch (error) {
        console.error("Failed to load dictionary:", error);
        updateLoadingProgress(60, "Using fallback dictionary...");
        
        await loadFallbackDictionary();
        return false;
    }
}

async function loadFallbackDictionary() {
    const fallbackWords = [
        "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "ANY", "CAN", "HAD", "HAS", "HIM", "HIS", "HER", "ITS", "NOW", "OUR", "SEE", "TWO", "WAY", "WHO", "DID", "GET", "LET", "MAN", "MAT", "OUT", "PUT", "RAN", "RUN", "SAY", "SHE", "SIT", "TOO", "USE", "YES", "YET", "ASK", "BAD", "BAT", "BED", "BET", "BIG", "BOX", "BOY", "BUS", "BUY", "CAR", "CAT", "CUP", "CUT", "DAY", "DOG", "EAR", "EAT", "EGG", "EYE", "FAR", "FEW", "FLY", "FUN", "GOT", "HAT", "HOT", "HOW", "INK", "JAR", "JOB", "KEY", "KIT", "LAW", "LAY", "LEG", "LIE", "LOW", "MAP", "MAY", "MIX", "MOM", "MUD", "NET", "NEW", "NUT", "OFF", "OLD", "ONE", "OWN", "PAY", "PEN", "PET", "PIE", "PIG", "POT", "RAT", "RED", "ROW", "RUG", "SAD", "SEA", "SET", "SIX", "SKY", "SON", "SUN", "TAX", "TEA", "TEN", "TIE", "TOE", "TOP", "TOY", "TRY", "VAN", "WAR", "WET", "WIN", "WHY", "ZOO"
    ];
    
    for (let word of fallbackWords) {
        dictionaryTrie.insert(word);
        dictionarySet.add(word);
    }
    
    gameState.dictionaryLoaded = true;
    gameState.dictionarySize = fallbackWords.length;
}

// ==================== WORD VALIDATION ====================
function isValidWord(word) {
    const cleanWord = word.toUpperCase();
    
    if (cleanWord.length < gameState.minWordLength) {
        return false;
    }
    
    if (dictionarySet.has(cleanWord)) {
        return true;
    }
    
    if (cleanWord.includes('QU')) {
        const qWord = cleanWord.replace(/QU/g, 'Q');
        if (dictionarySet.has(qWord)) {
            return true;
        }
    }
    
    if (cleanWord.includes('Q') && !cleanWord.includes('QU')) {
        const quWord = cleanWord.replace(/Q/g, 'QU');
        if (dictionarySet.has(quWord)) {
            return true;
        }
    }
    
    return false;
}

function isValidPrefix(prefix) {
    const cleanPrefix = prefix.toUpperCase();
    return dictionaryTrie.startsWith(cleanPrefix);
}

function calculateWordScore(word) {
    let score = 0;
    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        score += CONFIG.LETTER_VALUES[letter] || 1;
    }
    
    if (word.length >= 5) {
        score += word.length * 2;
    }
    
    if (word.length >= 8) {
        score += word.length * 3;
    }
    
    return score;
}

// ==================== BOARD ANALYSIS ====================
function findAllPossibleWords() {
    if (!gameState.dictionaryLoaded) return new Map();
    
    const words = new Map();
    const gridSize = gameState.gridSize;
    const board = gameState.board;
    
    const grid = [];
    for (let i = 0; i < gridSize; i++) {
        grid.push(board.slice(i * gridSize, (i + 1) * gridSize));
    }
    
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    function dfs(row, col, visited, currentWord, path) {
        visited[row][col] = true;
        const letter = grid[row][col];
        currentWord += letter;
        path.push({row, col, index: row * gridSize + col});
        
        if (!isValidPrefix(currentWord)) {
            visited[row][col] = false;
            path.pop();
            return;
        }
        
        if (currentWord.length >= gameState.minWordLength && isValidWord(currentWord)) {
            const score = calculateWordScore(currentWord);
            if (!words.has(currentWord) || score > words.get(currentWord).score) {
                words.set(currentWord, {
                    score: score,
                    path: [...path]
                });
            }
        }
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < gridSize && 
                newCol >= 0 && newCol < gridSize && 
                !visited[newRow][newCol]) {
                dfs(newRow, newCol, visited, currentWord, path);
            }
        }
        
        visited[row][col] = false;
        path.pop();
    }
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
            dfs(row, col, visited, "", []);
        }
    }
    
    return words;
}

function findLongestWord(words) {
    let longestWord = "";
    let longestPath = [];
    let maxLength = 0;
    
    for (const [word, data] of words) {
        if (word.length > maxLength) {
            maxLength = word.length;
            longestWord = word;
            longestPath = data.path;
        }
    }
    
    return { longestWord, longestPath };
}

// ==================== INITIALIZATION ====================
const elements = {
    mainMenu: document.getElementById('main-menu'),
    gameUI: document.getElementById('game-ui'),
    gameOver: document.getElementById('game-over'),
    loadingScreen: document.getElementById('loading-screen'),
    startButton: document.getElementById('start-game'),
    highscore4x4: document.getElementById('highscore-4x4'),
    highscore5x5: document.getElementById('highscore-5x5'),
    scoreElement: document.getElementById('score'),
    timerElement: document.getElementById('timer'),
    wordCountElement: document.getElementById('word-count'),
    progressStats: document.getElementById('progress-stats'),
    progressFill: document.getElementById('progress-fill'),
    quitButton: document.getElementById('quit-btn'),
    board: document.getElementById('board'),
    currentWordElement: document.getElementById('current-word'),
    finalScoreElement: document.getElementById('final-score'),
    newRecordBadge: document.getElementById('new-record-badge'),
    bestScoreElement: document.getElementById('best-score'),
    totalWordsElement: document.getElementById('total-words'),
    percentageFoundElement: document.getElementById('percentage-found'),
    playAgainButton: document.getElementById('play-again'),
    backToMenuButton: document.getElementById('back-to-menu'),
    loadingBar: document.querySelector('.loading-bar'),
    loadingPercentage: document.querySelector('.loading-percentage'),
    loadingStatus: document.getElementById('loading-status'),
    summaryBoard: document.getElementById('summary-board'),
    longestWordLabel: document.getElementById('longest-word-label')
};

async function initializeGame() {
    console.log("Initializing Boggle game...");
    
    updateLoadingProgress(10, "Loading game assets...");
    
    const soundPref = localStorage.getItem('boggle_sound_enabled');
    gameState.soundEnabled = soundPref !== null ? JSON.parse(soundPref) : true;
    soundManager.toggleSound(gameState.soundEnabled);
    
    updateSoundToggle();
    
    updateLoadingProgress(30, "Loading dictionary...");
    await loadDictionary();
    
    updateLoadingProgress(80, "Loading high scores...");
    loadHighScores();
    
    updateLoadingProgress(90, "Setting up game...");
    setupEventListeners();
    
    updateLoadingProgress(100, "Game ready!");
    
    setTimeout(() => {
        switchScreen('main-menu');
        console.log(`Game initialized with ${gameState.dictionarySize.toLocaleString()} words in dictionary`);
    }, 500);
}

function updateLoadingProgress(percent, status) {
    if (elements.loadingBar) {
        elements.loadingBar.style.width = `${percent}%`;
    }
    if (elements.loadingPercentage) {
        elements.loadingPercentage.textContent = `${percent}%`;
    }
    if (elements.loadingStatus) {
        elements.loadingStatus.textContent = status;
    }
}

function loadHighScores() {
    const score4x4 = localStorage.getItem('boggle_highscore_4x4') || '0';
    const score5x5 = localStorage.getItem('boggle_highscore_5x5') || '0';
    const endless4x4 = localStorage.getItem('boggle_endless_4x4') || '0%';
    const endless5x5 = localStorage.getItem('boggle_endless_5x5') || '0%';
    
    elements.highscore4x4.textContent = score4x4;
    elements.highscore5x5.textContent = score5x5;
    
    gameState.endlessHighscore4x4 = endless4x4;
    gameState.endlessHighscore5x5 = endless5x5;
}

function updateSoundToggle() {
    const toggleGroup = document.querySelector('.toggle-group.sound-group');
    if (toggleGroup) {
        const btns = toggleGroup.querySelectorAll('.toggle-btn');
        btns.forEach(btn => btn.classList.remove('active'));
        const activeBtn = gameState.soundEnabled ? 
            toggleGroup.querySelector('.toggle-btn[data-sound="on"]') :
            toggleGroup.querySelector('.toggle-btn[data-sound="off"]');
        if (activeBtn) activeBtn.classList.add('active');
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    elements.startButton.addEventListener('click', async () => {
        elements.startButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.startButton.style.transform = 'scale(1)';
        }, 150);
        await startGame();
    });
    
    document.querySelectorAll('.toggle-btn').forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => this.style.transform = 'scale(1)', 100);
            
            const group = this.parentElement;
            
            if (group.classList.contains('sound-group')) {
                group.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const soundEnabled = this.dataset.sound === 'on';
                gameState.soundEnabled = soundEnabled;
                soundManager.toggleSound(soundEnabled);
                localStorage.setItem('boggle_sound_enabled', JSON.stringify(soundEnabled));
                return;
            }
            
            group.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            if (this.dataset.size) {
                gameState.gridSize = parseInt(this.dataset.size);
            } else if (this.dataset.time) {
                gameState.timeLimit = parseInt(this.dataset.time);
                gameState.isEndlessMode = gameState.timeLimit === 0;
            } else if (this.dataset.length) {
                gameState.minWordLength = parseInt(this.dataset.length);
            }
        });
    });
    
    addSoundToggleToSettings();
    
    elements.quitButton.addEventListener('click', quitGame);
    elements.playAgainButton.addEventListener('click', async () => {
        elements.playAgainButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.playAgainButton.style.transform = 'scale(1)';
        }, 150);
        await startGame();
    });
    
    elements.backToMenuButton.addEventListener('click', () => {
        elements.backToMenuButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.backToMenuButton.style.transform = 'scale(1)';
            switchScreen('main-menu');
        }, 150);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gameState.isPlaying) {
            clearSelection();
        }
    });
}

function addSoundToggleToSettings() {
    const settingsContainer = document.querySelector('.settings-container');
    if (!settingsContainer) return;
    
    if (document.querySelector('.sound-group')) return;
    
    const soundSection = document.createElement('div');
    soundSection.className = 'setting-group';
    soundSection.innerHTML = `
        <label class="setting-label">Sound Effects</label>
        <div class="toggle-group sound-group">
            <button class="toggle-btn ${gameState.soundEnabled ? 'active' : ''}" data-sound="on">On</button>
            <button class="toggle-btn ${!gameState.soundEnabled ? 'active' : ''}" data-sound="off">Off</button>
        </div>
    `;
    
    const settingsSection = document.querySelector('.settings-section');
    if (settingsSection) {
        settingsSection.appendChild(soundSection);
    }
}

// ==================== SCREEN MANAGEMENT ====================
function switchScreen(screenId) {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        currentScreen.style.transform = 'translateY(20px)';
        currentScreen.style.opacity = '0';
    }
    
    setTimeout(() => {
        elements.mainMenu.classList.remove('active');
        elements.gameUI.classList.remove('active');
        elements.gameOver.classList.remove('active');
        elements.loadingScreen.classList.remove('active');
        
        const newScreen = document.getElementById(screenId);
        newScreen.classList.add('active');
        newScreen.style.transform = 'translateY(0)';
        newScreen.style.opacity = '1';
    }, 200);
}

// ==================== GAME FUNCTIONS ====================
async function startGame() {
    console.log("Starting game...");
    
    // Ensure audio is ready (user gesture)
    if (gameState.soundEnabled) {
        await soundManager.resume();
    }
    
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.wordsFound.clear();
    gameState.selectedTiles = [];
    gameState.currentWord = "";
    gameState.isDragging = false;
    gameState.allPossibleWords.clear();
    gameState.lastScoreTime = 0;
    gameState.isEndlessMode = gameState.timeLimit === 0;
    
    gameState.board = generateBoard();
    
    gameState.allPossibleWords = findAllPossibleWords();
    
    const { longestWord, longestPath } = findLongestWord(gameState.allPossibleWords);
    gameState.longestWord = longestWord;
    gameState.longestWordPath = longestPath;
    
    gameState.totalPossibleScore = 0;
    gameState.allPossibleWords.forEach(data => {
        gameState.totalPossibleScore += data.score;
    });
    
    console.log(`Board has ${gameState.allPossibleWords.size} possible words`);
    console.log(`Longest word: ${longestWord} (${longestWord.length} letters)`);
    console.log(`Total possible score: ${gameState.totalPossibleScore}`);
    
    updateScore();
    elements.currentWordElement.textContent = '';
    elements.currentWordElement.classList.remove('invalid');
    
    if (gameState.isEndlessMode) {
        elements.timerElement.textContent = '∞';
        elements.timerElement.style.color = '#8b5cf6';
        elements.timerElement.classList.add('endless');
        elements.timerElement.classList.remove('blink');
    } else {
        elements.timerElement.style.color = '#10b981';
        elements.timerElement.classList.remove('blink', 'endless');
        startTimer();
    }
    
    renderBoard();
    switchScreen('game-ui');
}

function generateBoard() {
    const diceSet = gameState.gridSize === 4 ? CONFIG.DICE_4x4 : CONFIG.DICE_5x5;
    const shuffledDice = [...diceSet].sort(() => Math.random() - 0.5);
    
    return shuffledDice.map(die => {
        const face = die[Math.floor(Math.random() * die.length)];
        return face === 'Q' ? 'QU' : face;
    });
}

function renderBoard() {
    elements.board.innerHTML = '';
    elements.board.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    
    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = index;
        
        const content = document.createElement('div');
        content.className = 'tile-content';
        content.textContent = letter;
        tile.appendChild(content);
        
        const hitbox = document.createElement('div');
        hitbox.className = 'tile-hitbox';
        tile.appendChild(hitbox);
        
        tile.addEventListener('mousedown', (e) => handleTileStart(index, e));
        tile.addEventListener('touchstart', (e) => handleTileStart(index, e), { passive: false });
        
        tile.addEventListener('mouseenter', () => {
            if (gameState.isDragging && !gameState.selectedTiles.includes(index)) {
                tile.classList.add('hover');
            }
        });
        
        tile.addEventListener('mouseleave', () => {
            tile.classList.remove('hover');
        });
        
        elements.board.appendChild(tile);
    });
}

function updateScore() {
    let displayScore;
    
    if (gameState.isEndlessMode) {
        let totalFoundScore = 0;
        gameState.wordsFound.forEach(score => {
            totalFoundScore += score;
        });
        
        gameState.percentageFound = gameState.totalPossibleScore > 0 ? 
            Math.round((totalFoundScore / gameState.totalPossibleScore) * 100) : 0;
        
        displayScore = gameState.percentageFound;
        
        elements.timerElement.innerHTML = `
            ∞<br>
            <div class="endless-percentage">${gameState.percentageFound}%</div>
        `;
    } else {
        displayScore = gameState.score;
    }
    
    const oldScore = parseInt(elements.scoreElement.textContent) || 0;
    
    if (displayScore > oldScore) {
        createScorePopup(displayScore - oldScore);
        
        elements.scoreElement.style.transform = 'scale(1.2)';
        elements.scoreElement.style.color = '#22c55e';
        setTimeout(() => {
            elements.scoreElement.style.transform = 'scale(1)';
            elements.scoreElement.style.color = '#f1f5f9';
        }, 300);
    }
    
    elements.scoreElement.textContent = displayScore;
    elements.wordCountElement.textContent = gameState.wordsFound.size;
    
    const totalPossible = gameState.allPossibleWords.size || 50;
    const foundCount = gameState.wordsFound.size;
    const percentage = Math.min(100, Math.round((foundCount / totalPossible) * 100));
    elements.progressStats.textContent = `${foundCount}/${totalPossible}`;
    elements.progressFill.style.width = `${percentage}%`;
}

function createScorePopup(score) {
    const now = Date.now();
    if (now - gameState.lastScoreTime < 100) return;
    
    gameState.lastScoreTime = now;
    
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = gameState.isEndlessMode ? `+${score}%` : `+${score}`;
    
    document.body.appendChild(popup);
    
    setTimeout(() => popup.remove(), 800);
}

function startTimer() {
    if (gameState.isEndlessMode) return;
    
    gameState.timeLeft = gameState.timeLimit;
    updateTimerDisplay();
    elements.timerElement.style.color = '#10b981';
    elements.timerElement.classList.remove('blink');
    
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        
        if (gameState.timeLeft <= 0) {
            endGame();
        } else if (gameState.timeLeft <= 10) {
            elements.timerElement.classList.add('blink');
            elements.timerElement.style.color = '#ef4444';
            
            if (gameState.timeLeft <= 5) {
                elements.timerElement.classList.add('shake');
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    elements.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stopTimer() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    elements.timerElement.classList.remove('shake');
}

// ==================== TILE INTERACTION ====================
function getTileAtPosition(x, y) {
    const tiles = document.querySelectorAll('.tile');
    for (const tile of tiles) {
        const rect = tile.getBoundingClientRect();
        const hitboxWidth = rect.width * 0.7;
        const hitboxHeight = rect.height * 0.7;
        const hitboxX = rect.left + (rect.width - hitboxWidth) / 2;
        const hitboxY = rect.top + (rect.height - hitboxHeight) / 2;
        
        if (x >= hitboxX && x <= hitboxX + hitboxWidth && 
            y >= hitboxY && y <= hitboxY + hitboxHeight) {
            return tile;
        }
    }
    return null;
}

function handleTileStart(index, event) {
    if (!gameState.isPlaying) return;
    
    if (event.type === 'touchstart') {
        event.preventDefault();
    }
    
    if (gameState.selectedTiles.length > 0 && !gameState.selectedTiles.includes(index)) {
        clearSelection();
    }
    
    gameState.selectedTiles.push(index);
    const tile = document.querySelector(`.tile[data-index="${index}"]`);
    if (tile) {
        tile.classList.add('selected');
        tile.style.transform = 'scale(1.1)';
        setTimeout(() => tile.style.transform = 'scale(1.08)', 50);
    }
    
    const letter = gameState.board[index];
    gameState.currentWord += letter;
    elements.currentWordElement.textContent = gameState.currentWord;
    elements.currentWordElement.classList.remove('invalid');
    
    if (gameState.soundEnabled) {
        soundManager.playTileSelect();
    }
    
    gameState.isDragging = true;
    
    const moveHandler = (e) => handleTileMove(e);
    const endHandler = (e) => handleTileEnd(e);
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
    
    gameState.currentMoveHandler = moveHandler;
    gameState.currentEndHandler = endHandler;
}

function handleTileMove(event) {
    if (!gameState.isDragging) return;
    
    const clientX = event.type.includes('mouse') ? event.clientX : event.touches[0].clientX;
    const clientY = event.type.includes('mouse') ? event.clientY : event.touches[0].clientY;
    
    const tile = getTileAtPosition(clientX, clientY);
    if (tile) {
        const index = parseInt(tile.dataset.index);
        
        if (!gameState.selectedTiles.includes(index)) {
            const lastIndex = gameState.selectedTiles[gameState.selectedTiles.length - 1];
            const lastRow = Math.floor(lastIndex / gameState.gridSize);
            const lastCol = lastIndex % gameState.gridSize;
            const row = Math.floor(index / gameState.gridSize);
            const col = index % gameState.gridSize;
            
            const rowDiff = Math.abs(row - lastRow);
            const colDiff = Math.abs(col - lastCol);
            
            if (rowDiff <= 1 && colDiff <= 1) {
                gameState.selectedTiles.push(index);
                tile.classList.add('selected');
                tile.classList.add('new-selection');
                setTimeout(() => tile.classList.remove('new-selection'), 100);
                
                const letter = gameState.board[index];
                gameState.currentWord += letter;
                elements.currentWordElement.textContent = gameState.currentWord;
                elements.currentWordElement.classList.remove('invalid');
                
                if (gameState.soundEnabled) {
                    soundManager.playTileConnect(gameState.selectedTiles.length);
                }
                
                elements.currentWordElement.style.transform = 'scale(1.05)';
                setTimeout(() => elements.currentWordElement.style.transform = 'scale(1)', 100);
            }
        }
    }
}

function handleTileEnd() {
    gameState.isDragging = false;
    
    if (gameState.currentMoveHandler) {
        document.removeEventListener('mousemove', gameState.currentMoveHandler);
        document.removeEventListener('touchmove', gameState.currentMoveHandler);
    }
    if (gameState.currentEndHandler) {
        document.removeEventListener('mouseup', gameState.currentEndHandler);
        document.removeEventListener('touchend', gameState.currentEndHandler);
    }
    
    if (gameState.selectedTiles.length >= gameState.minWordLength) {
        submitWord();
    } else {
        clearSelection();
    }
}

function clearSelection() {
    gameState.selectedTiles.forEach(index => {
        const tile = document.querySelector(`.tile[data-index="${index}"]`);
        if (tile) {
            tile.style.transform = 'scale(1)';
            tile.classList.remove('selected');
        }
    });
    
    gameState.selectedTiles = [];
    gameState.currentWord = "";
    elements.currentWordElement.textContent = '';
    elements.currentWordElement.classList.remove('invalid');
}

// ==================== WORD VALIDATION ====================
function submitWord() {
    if (gameState.selectedTiles.length < gameState.minWordLength) {
        flashTiles('flash-invalid');
        elements.currentWordElement.style.color = '#ef4444';
        elements.currentWordElement.classList.add('invalid');
        
        if (gameState.soundEnabled) {
            soundManager.playWordInvalid();
        }
        
        setTimeout(() => {
            elements.currentWordElement.style.color = '#f1f5f9';
            elements.currentWordElement.classList.remove('invalid');
        }, 400);
        clearSelection();
        return;
    }
    
    let word = gameState.currentWord.toUpperCase();
    
    if (gameState.wordsFound.has(word)) {
        flashTiles('flash-duplicate');
        elements.currentWordElement.style.animation = 'shakeDuplicate 0.5s ease';
        elements.currentWordElement.style.color = '#8b5cf6';
        
        if (gameState.soundEnabled) {
            soundManager.playWordDuplicate();
        }
        
        setTimeout(() => {
            elements.currentWordElement.style.animation = '';
            elements.currentWordElement.style.color = '#f1f5f9';
        }, 500);
        clearSelection();
        return;
    }
    
    const isValid = isValidWord(word);
    
    if (!isValid) {
        flashTiles('flash-invalid');
        elements.currentWordElement.textContent = word;
        elements.currentWordElement.style.color = '#ef4444';
        elements.currentWordElement.classList.add('invalid');
        
        if (gameState.soundEnabled) {
            soundManager.playWordInvalid();
        }
        
        setTimeout(() => {
            elements.currentWordElement.style.color = '#f1f5f9';
            elements.currentWordElement.classList.remove('invalid');
        }, 400);
        clearSelection();
        return;
    }
    
    flashTiles('flash-valid');
    elements.currentWordElement.textContent = word;
    elements.currentWordElement.style.color = '#f1f5f9';
    
    if (gameState.soundEnabled) {
        soundManager.playWordValid();
    }
    
    addWord(word);
}

function flashTiles(className) {
    gameState.selectedTiles.forEach(index => {
        const tile = document.querySelector(`.tile[data-index="${index}"]`);
        if (tile) {
            tile.classList.remove('flash-valid', 'flash-invalid', 'flash-duplicate');
            void tile.offsetWidth;
            tile.classList.add(className);
            
            setTimeout(() => {
                tile.classList.remove(className);
            }, 500);
        }
    });
}

function addWord(word) {
    const wordData = gameState.allPossibleWords.get(word);
    const score = wordData ? wordData.score : calculateWordScore(word);
    
    gameState.wordsFound.set(word, score);
    
    if (!gameState.isEndlessMode) {
        gameState.score += score;
    }
    
    updateScore();
    clearSelection();
}

// ==================== GAME OVER ====================
function quitGame() {
    if (confirm('Are you sure you want to quit? Your current progress will be lost.')) {
        endGame();
    }
}

function endGame() {
    stopTimer();
    gameState.isPlaying = false;
    
    document.getElementById('game-ui').style.opacity = '0';
    setTimeout(() => {
        updateSummaryScreen();
        switchScreen('game-over');
    }, 300);
}

function updateSummaryScreen() {
    let finalScore;
    let finalPercentage;
    
    let totalFoundScore = 0;
    gameState.wordsFound.forEach(score => {
        totalFoundScore += score;
    });

    if (gameState.isEndlessMode) {
        finalPercentage = gameState.totalPossibleScore > 0 ? 
            Math.round((totalFoundScore / gameState.totalPossibleScore) * 100) : 0;
        finalScore = finalPercentage;
        elements.finalScoreElement.textContent = `${finalPercentage}%`;
    } else {
        finalScore = gameState.score;
        elements.finalScoreElement.textContent = finalScore;
    }
    
    if(elements.totalWordsElement) elements.totalWordsElement.textContent = `${gameState.wordsFound.size} / ${gameState.allPossibleWords.size}`;
    const percentage = gameState.totalPossibleScore > 0 ? 
        Math.round((totalFoundScore / gameState.totalPossibleScore) * 100) : 0;
    if(elements.percentageFoundElement) elements.percentageFoundElement.textContent = `${percentage}%`;
    
    const highScoreKey = gameState.isEndlessMode ? 
        `boggle_endless_${gameState.gridSize}x${gameState.gridSize}` :
        `boggle_highscore_${gameState.gridSize}x${gameState.gridSize}`;
    
    let currentHighScore = localStorage.getItem(highScoreKey);
    let isRecord = false;
    
    if (gameState.isEndlessMode) {
        const currentPercentage = currentHighScore ? parseInt(currentHighScore) : 0;
        if (finalPercentage > currentPercentage) {
            localStorage.setItem(highScoreKey, `${finalPercentage}%`);
            isRecord = true;
            elements.bestScoreElement.textContent = `${finalPercentage}%`;
        } else {
            elements.bestScoreElement.textContent = currentHighScore || '0%';
        }
    } else {
        const currentScore = parseInt(currentHighScore) || 0;
        if (finalScore > currentScore) {
            localStorage.setItem(highScoreKey, finalScore.toString());
            isRecord = true;
            elements.bestScoreElement.textContent = finalScore;
        } else {
            elements.bestScoreElement.textContent = currentScore;
        }
    }

    elements.newRecordBadge.style.display = isRecord ? 'block' : 'none';
    if(isRecord) elements.newRecordBadge.style.animation = 'trophyBounce 1s ease infinite';
    
    loadHighScores();
    renderUnifiedResults();
    renderSummaryBoard();
}

function renderSummaryBoard() {
    if (!elements.summaryBoard) return;
    
    elements.summaryBoard.innerHTML = '';
    elements.summaryBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    
    const longestPathIndices = new Set(gameState.longestWordPath.map(tile => tile.index));
    
    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        if (longestPathIndices.has(index)) {
            tile.classList.add('highlight-longest');
        }
        
        const content = document.createElement('div');
        content.className = 'tile-content';
        content.textContent = letter;
        tile.appendChild(content);
        
        elements.summaryBoard.appendChild(tile);
    });
    
    if (elements.longestWordLabel) {
        elements.longestWordLabel.textContent = gameState.longestWord || '—';
    }
}

function renderUnifiedResults() {
    const container = document.getElementById('results-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    const allWords = Array.from(gameState.allPossibleWords.keys());
    
    const wordsByLength = {};
    let maxLength = 0;
    let minLength = 99;

    allWords.forEach(word => {
        const len = word.length;
        if (!wordsByLength[len]) wordsByLength[len] = [];
        wordsByLength[len].push(word);
        if (len > maxLength) maxLength = len;
        if (len < minLength) minLength = len;
    });

    for (let len = maxLength; len >= minLength; len--) {
        if (!wordsByLength[len]) continue;

        const words = wordsByLength[len].sort();
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'word-length-group';
        
        const foundInGroup = words.filter(w => gameState.wordsFound.has(w)).length;
        
        const header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML = `
            <span>${len} Letters</span>
            <span>${foundInGroup}/${words.length}</span>
        `;
        groupDiv.appendChild(header);

        const wordListDiv = document.createElement('div');
        wordListDiv.className = 'group-words';

        words.forEach((word, index) => {
            const isFound = gameState.wordsFound.has(word);
            const isLongest = word === gameState.longestWord;
            
            const pill = document.createElement('span');
            pill.className = `word-pill ${isFound ? 'found' : 'missed'} ${isLongest ? 'longest-highlight' : ''}`;
            pill.textContent = word;
            
            pill.style.animation = 'fadeIn 0.3s ease forwards';
            pill.style.animationDelay = `${index * 0.01}s`;

            wordListDiv.appendChild(pill);
        });

        groupDiv.appendChild(wordListDiv);
        container.appendChild(groupDiv);
    }
}

// ==================== START THE GAME ====================
document.addEventListener('DOMContentLoaded', () => {
    switchScreen('loading-screen');
    
    setTimeout(initializeGame, 500);
});