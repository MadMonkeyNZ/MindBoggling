// Boggle Game - Full Feature: Multipliers, Combo, Time Bonuses, Earnable Power-ups, Time-Based Streak, Score Milestones

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
        'A':1,'B':3,'C':3,'D':2,'E':1,'F':4,'G':2,'H':4,'I':1,
        'J':8,'K':5,'L':1,'M':3,'N':1,'O':1,'P':3,'Q':10,'R':1,
        'S':1,'T':1,'U':1,'V':4,'W':4,'X':8,'Y':4,'Z':10
    },
    
    DICT_URL: "https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt",
    
    NOTE_FREQUENCIES: {
        C4:261.63, D4:293.66, E4:329.63, F4:349.23,
        G4:392.00, A4:440.00, B4:493.88, C5:523.25,
        D5:587.33, E5:659.25, C6:1046.50
    }
};

// Background music tracks – edit these to match your files in the "audio" folder
const BACKGROUND_TRACKS = [
    'audio/game1.mp3',
    'audio/game2.mp3',
    'audio/game3.mp3',
    'audio/game4.mp3',
    'audio/game5.mp3',
    'audio/game6.mp3',
    'audio/game7.mp3',
    'audio/game8.mp3',
    'audio/game9.mp3',
    'audio/game10.mp3'
];

let backgroundMusic = null;
let musicEnabled = false;
let currentTrackIndex = 0;

// Multiplier chances: 80% normal, 15% double, 5% triple
const MULTIPLIER_CHANCES = [
    { value: 1, prob: 0.8 },
    { value: 2, prob: 0.15 },
    { value: 3, prob: 0.05 }
];

// ==================== SOUND MANAGER ====================
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.soundEnabled = true;
        this.isResumed = false;
        this.resumePromise = null;
    }
    
    resume() {
        if (this.isResumed) return Promise.resolve();
        if (this.resumePromise) return this.resumePromise;
        
        this.resumePromise = new Promise((resolve) => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
                    this.isResumed = true;
                    resolve();
                }).catch(e => {
                    console.warn("Failed to resume audio context:", e);
                    resolve();
                });
            } else {
                this.isResumed = true;
                resolve();
            }
        });
        
        return this.resumePromise;
    }
    
    playNote(frequency, duration = 0.2, type = 'sine', volume = 0.3) {
        // Guard against NaN or invalid values
        if (!this.soundEnabled) return;
        if (!this.audioContext || this.audioContext.state !== 'running') return;
        if (typeof frequency !== 'number' || isNaN(frequency) || frequency <= 0) return;
        if (typeof volume !== 'number' || isNaN(volume)) volume = 0.3;
        const finalVolume = volume * this.masterVolume;
        if (isNaN(finalVolume)) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            this.showSoundIndicator(type === 'sine' ? 'correct' : 'incorrect');
        } catch (e) {
            console.warn("Audio play error:", e);
        }
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
        const notes = [CONFIG.NOTE_FREQUENCIES.C5, CONFIG.NOTE_FREQUENCIES.E5,
                      CONFIG.NOTE_FREQUENCIES.G4, CONFIG.NOTE_FREQUENCIES.C5];
        notes.forEach((note, index) => {
            setTimeout(() => this.playNote(note, 0.2, 'sine', 0.25), index * 100);
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
    
    playWordHigherScore() {
        // A short happy melody for a higher‑score duplicate
        const notes = [CONFIG.NOTE_FREQUENCIES.E5, CONFIG.NOTE_FREQUENCIES.G5, CONFIG.NOTE_FREQUENCIES.C5];
        notes.forEach((note, index) => {
            setTimeout(() => this.playNote(note, 0.15, 'sine', 0.2), index * 120);
        });
        this.showSoundIndicator('correct');
    }
    
    playPowerupUnlock() {
        // Joyful fanfare – louder and longer
        const notes = [
            CONFIG.NOTE_FREQUENCIES.C5,
            CONFIG.NOTE_FREQUENCIES.E5,
            CONFIG.NOTE_FREQUENCIES.G5,
            CONFIG.NOTE_FREQUENCIES.C6
        ];
        notes.forEach((note, index) => {
            setTimeout(() => this.playNote(note, 0.3, 'sine', 0.5), index * 200);
        });
    }
    
    playBombDrop() {
        // Low rumble for bomb
        this.playNote(110, 0.5, 'sawtooth', 0.2);
    }
    
    showSoundIndicator(type) {
        if (!this.soundEnabled) return;
        const indicator = document.createElement('div');
        indicator.className = `sound-indicator ${type}`;
        indicator.innerHTML = type === 'correct' ? '🎵' : '🔊';
        indicator.style.left = `${Math.random() * 80 + 10}%`;
        indicator.style.top = `${Math.random() * 80 + 10}%`;
        document.body.appendChild(indicator);
        setTimeout(() => indicator.classList.add('visible'), 10);
        setTimeout(() => {
            indicator.classList.remove('visible');
            setTimeout(() => indicator.remove(), 300);
        }, 300);
    }
    
    toggleSound(enabled) {
        this.soundEnabled = enabled;
    }
}

// ==================== BACKGROUND MUSIC ====================
function initMusic() {
    if (backgroundMusic) return;
    backgroundMusic = new Audio();
    backgroundMusic.loop = true;        // Make tracks loop
    backgroundMusic.volume = 0.2;
    loadTrack(currentTrackIndex);
}

function loadTrack(index) {
    if (!backgroundMusic) return;
    if (index < 0 || index >= BACKGROUND_TRACKS.length) index = 0;
    currentTrackIndex = index;
    backgroundMusic.src = BACKGROUND_TRACKS[currentTrackIndex];
    backgroundMusic.load();
}

function playMusic() {
    if (!backgroundMusic || !musicEnabled) return;
    backgroundMusic.play().catch(e => {
        console.log('Music autoplay blocked – waiting for user interaction', e);
    });
}

function pauseMusic() {
    if (backgroundMusic) backgroundMusic.pause();
}

function nextTrack() {
    if (!backgroundMusic) initMusic();
    currentTrackIndex = (currentTrackIndex + 1) % BACKGROUND_TRACKS.length;
    loadTrack(currentTrackIndex);
    if (musicEnabled) playMusic();
    localStorage.setItem('boggle_music_track', currentTrackIndex);
    updateMusicToggle();
}

function toggleMusic(enable) {
    musicEnabled = enable;
    localStorage.setItem('boggle_music_enabled', JSON.stringify(musicEnabled));
    if (musicEnabled) {
        if (!backgroundMusic) initMusic();
        playMusic();
    } else {
        pauseMusic();
    }
    updateMusicToggle();
}

function updateMusicToggle() {
    const musicGroup = document.querySelector('.toggle-group.music-group');
    if (!musicGroup) return;
    musicGroup.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = musicEnabled ?
        musicGroup.querySelector('.toggle-btn[data-music="on"]') :
        musicGroup.querySelector('.toggle-btn[data-music="off"]');
    if (activeBtn) activeBtn.classList.add('active');
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
            if (!node.children.has(char)) node.children.set(char, new TrieNode());
            node = node.children.get(char);
        }
        if (!node.isEndOfWord) {
            node.isEndOfWord = true;
            this.wordCount++;
        }
    }
    
    search(word) {
        let node = this.root;
        for (let char of word.toUpperCase()) {
            if (!node.children.has(char)) return false;
            node = node.children.get(char);
        }
        return node.isEndOfWord;
    }
    
    startsWith(prefix) {
        let node = this.root;
        for (let char of prefix.toUpperCase()) {
            if (!node.children.has(char)) return false;
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
    timeLimit: 120,
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
    soundEnabled: true,
    analysisComplete: false,
    maxWordLength: 0,
    // New features
    powerupsEnabled: true,
    tileMultipliers: [],       // parallel to board
    combo: 0,
    comboMultiplier: 1,
    wordsFoundCount: 0,        // total words found (for shuffle unlock)
    powerups: {
        hint: 0,
        vowelBomb: 0,
        consonantBomb: 0,
        shuffle: 0
    },
    // Track power-up usage
    powerupsUsed: {
        hint: 0,
        vowelBomb: 0,
        consonantBomb: 0,
        shuffle: 0
    },
    totalTimeBonus: 0,          // seconds added by time bonuses
    longestWordFound: "",       // longest word actually found
    bombPlacementMode: null,   // 'vowel' or 'consonant' or null
    bombHighlightCells: [],    // indices of current highlight
    streakTimer: null,
    streakTimeout: 5000,       // base 5 seconds
    lastWordTime: 0,
    scoreMilestone: 100,       // bonus every 100 points
    nextScoreBonus: 100,
    // Persistent hint
    hintedWord: null,
    hintedPath: [],
    // Bomb drag state
    bombDragActive: false,
    bombDragType: null,
    bombGhost: null,
};

// ==================== PRISM VOID CANVAS (IMPROVED) ====================
let prismCtx = null;
let prismAnimationFrame = null;
let prismSystems = {}; // key: tileIndex, value: { particles: [], multiplier }

function initPrismCanvas() {
    const canvas = document.getElementById('prism-canvas');
    if (!canvas) return;
    const boardWrap = document.getElementById('board-wrap');
    canvas.width = boardWrap.clientWidth;
    canvas.height = boardWrap.clientHeight;
    prismCtx = canvas.getContext('2d');
}

// Resize listener for canvas
window.addEventListener('resize', () => {
    if (gameState.isPlaying) initPrismCanvas();
});

// Create a new particle system for a given tile index
function createPrismSystem(tileIndex) {
    const multiplier = gameState.tileMultipliers[tileIndex];
    const particles = [];
    const count = 40; // More particles for richer effect
    for (let i = 0; i < count; i++) {
        particles.push({
            angle: Math.random() * Math.PI * 2,
            life: Math.random() * 100,
            speed: 0.3 + Math.random() * 0.7,
            size: 2 + Math.random() * 4,
            offset: Math.random() * 50,
            driftX: (Math.random() - 0.5) * 2,
            driftY: (Math.random() - 0.5) * 2,
        });
    }
    prismSystems[tileIndex] = { particles, multiplier };
}

// Remove a particle system
function removePrismSystem(tileIndex) {
    delete prismSystems[tileIndex];
}

// Start or restart effect for a tile
function startPrismEffect(tileIndex) {
    if (!gameState.powerupsEnabled) return;
    if (!prismCtx) initPrismCanvas();

    // If system already exists, we can keep it or reset; we'll just ensure it's there
    if (!prismSystems[tileIndex]) {
        createPrismSystem(tileIndex);
    }

    // If animation not running, start it
    if (!prismAnimationFrame) {
        drawPrism();
    }
}

// Draw all active systems
function drawPrism() {
    if (!prismCtx) return;
    
    // Clear canvas completely – no darkening
    prismCtx.clearRect(0, 0, prismCtx.canvas.width, prismCtx.canvas.height);
    
    const boardWrap = document.getElementById('board-wrap');
    const boardRect = boardWrap.getBoundingClientRect();
    
    // For each active system
    for (let [idxStr, system] of Object.entries(prismSystems)) {
        const idx = parseInt(idxStr);
        const tile = document.querySelector(`.tile[data-index="${idx}"]`);
        if (!tile) continue; // tile might be gone? shouldn't happen
        
        const rect = tile.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 - boardRect.left;
        const centerY = rect.top + rect.height / 2 - boardRect.top;
        const multiplier = system.multiplier;
        
        // Draw a soft radial glow behind the tile
        const gradient = prismCtx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 80);
        if (multiplier === 2) {
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)'); // gold
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(155, 48, 255, 0.3)'); // purple
            gradient.addColorStop(1, 'rgba(155, 48, 255, 0)');
        }
        prismCtx.fillStyle = gradient;
        prismCtx.beginPath();
        prismCtx.arc(centerX, centerY, 80, 0, Math.PI * 2);
        prismCtx.fill();
        
        prismCtx.globalCompositeOperation = 'lighter';
        
        // Update and draw particles
        system.particles.forEach(p => {
            p.life += p.speed;
            if (p.life > 100) {
                p.life = 0;
                p.angle = Math.random() * Math.PI * 2;
            }
            
            const pct = p.life / 100;
            // Dynamic hue based on multiplier and time
            const timeHue = (Date.now() / 30) % 360;
            let hue;
            if (multiplier === 2) {
                hue = 45 + Math.sin(timeHue * 0.1) * 15; // gold range
            } else {
                hue = 270 + Math.sin(timeHue * 0.1) * 20; // purple range
            }
            
            const alpha = 0.8 * (1 - pct);
            prismCtx.strokeStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
            prismCtx.fillStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
            prismCtx.lineWidth = p.size * (1 - pct);
            
            // Arc around tile
            prismCtx.beginPath();
            const radius = 60 + pct * 70 + Math.sin(Date.now() * 0.005 + p.angle) * 10;
            prismCtx.arc(centerX, centerY, radius, p.angle, p.angle + 0.4);
            prismCtx.stroke();
            
            // Drifting blob with extra waviness
            let vx = centerX + Math.cos(p.angle) * (50 + pct * 80);
            let vy = centerY + Math.sin(p.angle) * (50 + pct * 80);
            
            vx += Math.sin(Date.now() * 0.004 + p.angle * 2) * 20;
            vy += Math.cos(Date.now() * 0.003 + p.angle * 2) * 20;
            
            prismCtx.beginPath();
            prismCtx.arc(vx, vy, p.size * (1 - pct) * 2, 0, Math.PI * 2);
            prismCtx.fill();
        });
        
        prismCtx.globalCompositeOperation = 'source-over';
    }
    
    // Continue animation if any systems exist
    if (Object.keys(prismSystems).length > 0 && gameState.isPlaying) {
        prismAnimationFrame = requestAnimationFrame(drawPrism);
    } else {
        prismAnimationFrame = null;
    }
}

// Update systems based on current selected tiles
function syncPrismSystems() {
    // Remove systems for tiles no longer selected
    for (let idxStr in prismSystems) {
        const idx = parseInt(idxStr);
        if (!gameState.selectedTiles.includes(idx)) {
            removePrismSystem(idx);
        }
    }
    // Add systems for newly selected multiplier tiles
    gameState.selectedTiles.forEach(idx => {
        if (gameState.tileMultipliers[idx] > 1 && !prismSystems[idx]) {
            createPrismSystem(idx);
        }
    });
    
    // Start/stop animation as needed
    if (Object.keys(prismSystems).length > 0 && !prismAnimationFrame && gameState.isPlaying) {
        drawPrism();
    } else if (Object.keys(prismSystems).length === 0 && prismAnimationFrame) {
        cancelAnimationFrame(prismAnimationFrame);
        prismAnimationFrame = null;
        if (prismCtx) prismCtx.clearRect(0, 0, prismCtx.canvas.width, prismCtx.canvas.height);
    }
}

// ==================== DICTIONARY LOADING ====================
async function loadDictionary() {
    console.log("Loading dictionary...");
    updateLoadingProgress(20, "Loading dictionary...");
    
    try {
        const response = await fetch(CONFIG.DICT_URL);
        if (!response.ok) throw new Error(`Failed to load dictionary: ${response.status}`);
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
        
        gameState.maxWordLength = 0;
        dictionarySet.forEach(word => {
            if (word.length > gameState.maxWordLength) gameState.maxWordLength = word.length;
        });
        
        gameState.dictionaryLoaded = true;
        gameState.dictionarySize = words.length;
        console.log(`Dictionary loaded: ${words.length.toLocaleString()} words, max length ${gameState.maxWordLength}`);
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
        "THE","AND","FOR","ARE","BUT","NOT","YOU","ALL","ANY","CAN","HAD","HAS","HIM","HIS","HER","ITS","NOW","OUR","SEE","TWO","WAY","WHO","DID","GET","LET","MAN","MAT","OUT","PUT","RAN","RUN","SAY","SHE","SIT","TOO","USE","YES","YET","ASK","BAD","BAT","BED","BET","BIG","BOX","BOY","BUS","BUY","CAR","CAT","CUP","CUT","DAY","DOG","EAR","EAT","EGG","EYE","FAR","FEW","FLY","FUN","GOT","HAT","HOT","HOW","INK","JAR","JOB","KEY","KIT","LAW","LAY","LEG","LIE","LOW","MAP","MAY","MIX","MOM","MUD","NET","NEW","NUT","OFF","OLD","ONE","OWN","PAY","PEN","PET","PIE","PIG","POT","RAT","RED","ROW","RUG","SAD","SEA","SET","SIX","SKY","SON","SUN","TAX","TEA","TEN","TIE","TOE","TOP","TOY","TRY","VAN","WAR","WET","WIN","WHY","ZOO"
    ];
    for (let word of fallbackWords) {
        dictionaryTrie.insert(word);
        dictionarySet.add(word);
    }
    gameState.maxWordLength = Math.max(...fallbackWords.map(w => w.length));
    gameState.dictionaryLoaded = true;
    gameState.dictionarySize = fallbackWords.length;
}

// ==================== WORD VALIDATION ====================
function isValidWord(word) {
    const cleanWord = word.toUpperCase();
    if (cleanWord.length < gameState.minWordLength) return false;
    if (dictionarySet.has(cleanWord)) return true;
    if (cleanWord.includes('QU')) {
        if (dictionarySet.has(cleanWord.replace(/QU/g, 'Q'))) return true;
    }
    if (cleanWord.includes('Q') && !cleanWord.includes('QU')) {
        if (dictionarySet.has(cleanWord.replace(/Q/g, 'QU'))) return true;
    }
    return false;
}

function isValidPrefix(prefix) {
    return dictionaryTrie.startsWith(prefix.toUpperCase());
}

function calculateWordScore(word) {
    let score = 0;
    for (let i = 0; i < word.length; i++) {
        score += CONFIG.LETTER_VALUES[word[i]] || 1;
    }
    if (word.length >= 5) score += word.length * 2;
    if (word.length >= 8) score += word.length * 3;
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
        [-1,-1], [-1,0], [-1,1],
        [0,-1],          [0,1],
        [1,-1],  [1,0],  [1,1]
    ];
    
    const maxDepth = gameState.maxWordLength;
    
    function dfs(row, col, visited, currentWord, path) {
        if (currentWord.length > maxDepth) {
            visited[row][col] = false;
            path.pop();
            return;
        }
        
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
                words.set(currentWord, { score, path: [...path] });
            }
        }
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize && !visited[newRow][newCol]) {
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

// ==================== TARGETED BOARD SEARCH ====================
function isWordOnBoard(word) {
    const gridSize = gameState.gridSize;
    const board = gameState.board;
    const grid = [];
    for (let i = 0; i < gridSize; i++) {
        grid.push(board.slice(i * gridSize, (i + 1) * gridSize));
    }
    
    const directions = [
        [-1,-1], [-1,0], [-1,1],
        [0,-1],          [0,1],
        [1,-1],  [1,0],  [1,1]
    ];
    
    const target = word.toUpperCase();
    
    function search(row, col, idx, visited) {
        if (idx === target.length) return true;
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return false;
        if (visited[row][col]) return false;
        
        const cellLetter = grid[row][col];
        const targetChar = target[idx];
        
        if (cellLetter === 'QU') {
            if (target[idx] !== 'Q' || idx+1 >= target.length || target[idx+1] !== 'U') return false;
            visited[row][col] = true;
            for (const [dr, dc] of directions) {
                if (search(row+dr, col+dc, idx+2, visited)) {
                    visited[row][col] = false;
                    return true;
                }
            }
            visited[row][col] = false;
            return false;
        } else {
            if (cellLetter !== targetChar) return false;
            visited[row][col] = true;
            for (const [dr, dc] of directions) {
                if (search(row+dr, col+dc, idx+1, visited)) {
                    visited[row][col] = false;
                    return true;
                }
            }
            visited[row][col] = false;
            return false;
        }
    }
    
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
            if (search(r, c, 0, visited)) return true;
        }
    }
    return false;
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
    longestWordLabel: document.getElementById('longest-word-label'),
    // New power-up summary elements
    powerupSummary: document.getElementById('powerup-summary'),
    hintUsed: document.getElementById('powerup-hint-used'),
    vowelUsed: document.getElementById('powerup-vowel-used'),
    consonantUsed: document.getElementById('powerup-consonant-used'),
    shuffleUsed: document.getElementById('powerup-shuffle-used'),
    timeBonusTotal: document.getElementById('time-bonus-total'),
    longestWordFound: document.getElementById('longest-word-found'),
    foundWordsList: document.getElementById('found-words-list'),
    // Power-up bar inside top-bar
    powerupBar: document.getElementById('powerup-bar'),
    wordsProgress: document.getElementById('words-progress')
};

async function initializeGame() {
    console.log("Initializing Boggle game...");
    updateLoadingProgress(10, "Loading game assets...");
    
    // Load sound preference
    const soundPref = localStorage.getItem('boggle_sound_enabled');
    gameState.soundEnabled = soundPref !== null ? JSON.parse(soundPref) : true;
    soundManager.toggleSound(gameState.soundEnabled);
    updateSoundToggle();
    
    // Load power-ups preference
    const powerupsPref = localStorage.getItem('boggle_powerups_enabled');
    if (powerupsPref !== null) {
        gameState.powerupsEnabled = JSON.parse(powerupsPref);
    }
    updatePowerupsToggle();
    
    // Load background music preference
    const musicPref = localStorage.getItem('boggle_music_enabled');
    musicEnabled = musicPref !== null ? JSON.parse(musicPref) : false;
    const savedTrack = localStorage.getItem('boggle_music_track');
    if (savedTrack !== null) currentTrackIndex = parseInt(savedTrack) % BACKGROUND_TRACKS.length;
    initMusic();
    updateMusicToggle();
    
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
    if (elements.loadingBar) elements.loadingBar.style.width = `${percent}%`;
    if (elements.loadingPercentage) elements.loadingPercentage.textContent = `${percent}%`;
    if (elements.loadingStatus) elements.loadingStatus.textContent = status;
}

function loadHighScores() {
    const score4x4 = localStorage.getItem('boggle_highscore_4x4') || '0';
    const score5x5 = localStorage.getItem('boggle_highscore_5x5') || '0';
    elements.highscore4x4.textContent = score4x4;
    elements.highscore5x5.textContent = score5x5;
}

function updateSoundToggle() {
    const toggleGroup = document.querySelector('.toggle-group.sound-group');
    if (toggleGroup) {
        toggleGroup.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = gameState.soundEnabled ? 
            toggleGroup.querySelector('.toggle-btn[data-sound="on"]') :
            toggleGroup.querySelector('.toggle-btn[data-sound="off"]');
        if (activeBtn) activeBtn.classList.add('active');
    }
}

function updatePowerupsToggle() {
    const toggleGroup = document.querySelector('.toggle-group.powerups-group');
    if (toggleGroup) {
        toggleGroup.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = gameState.powerupsEnabled ? 
            toggleGroup.querySelector('.toggle-btn[data-powerups="on"]') :
            toggleGroup.querySelector('.toggle-btn[data-powerups="off"]');
        if (activeBtn) activeBtn.classList.add('active');
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    elements.startButton.addEventListener('click', async () => {
        elements.startButton.style.transform = 'scale(0.95)';
        setTimeout(() => elements.startButton.style.transform = 'scale(1)', 150);
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
            
            if (group.classList.contains('powerups-group')) {
                group.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                gameState.powerupsEnabled = this.dataset.powerups === 'on';
                localStorage.setItem('boggle_powerups_enabled', JSON.stringify(gameState.powerupsEnabled));
                return;
            }
            
            if (group.classList.contains('music-group')) {
                group.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const musicOn = this.dataset.music === 'on';
                toggleMusic(musicOn);
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
    
    document.getElementById('next-track-btn').addEventListener('click', () => {
        nextTrack();
        const btn = document.getElementById('next-track-btn');
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    });
    
    elements.quitButton.addEventListener('click', quitGame);
    elements.playAgainButton.addEventListener('click', async () => {
        elements.playAgainButton.style.transform = 'scale(0.95)';
        setTimeout(() => elements.playAgainButton.style.transform = 'scale(1)', 150);
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
            if (gameState.bombPlacementMode) {
                exitBombMode();
            } else {
                clearSelection();
            }
        }
    });

    // Global listeners to end bomb drag
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
    document.addEventListener('touchcancel', onDragEnd);
}

// ==================== SCREEN MANAGEMENT ====================
function switchScreen(screenId) {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        currentScreen.classList.remove('active');
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

// ==================== POWER-UP TILES (now inside top bar) ====================
function createPowerupTiles() {
    if (!elements.powerupBar) {
        // Create if not exists
        elements.powerupBar = document.createElement('div');
        elements.powerupBar.id = 'powerup-bar';
        elements.topBar.appendChild(elements.powerupBar);
    }
    elements.powerupBar.innerHTML = `
        <div class="powerup-tile hint" data-powerup="hint">
            <div class="icon">💡</div>
            <div class="count">0</div>
        </div>
        <div class="powerup-tile vowelBomb" data-powerup="vowelBomb">
            <div class="icon">a</div>
            <div class="count">0</div>
        </div>
        <div class="powerup-tile consonantBomb" data-powerup="consonantBomb">
            <div class="icon">b</div>
            <div class="count">0</div>
        </div>
        <div class="powerup-tile shuffle" data-powerup="shuffle">
            <div class="icon">🔄</div>
            <div class="count">0</div>
        </div>
    `;

    // Add click listeners for hint and shuffle (non-drag)
    elements.powerupBar.querySelectorAll('.powerup-tile.hint, .powerup-tile.shuffle').forEach(tile => {
        tile.addEventListener('click', (e) => {
            const powerup = tile.dataset.powerup;
            if (powerup === 'hint') useHint();
            else if (powerup === 'shuffle') useShuffle();
        });
    });

    // Add drag start for bombs
    elements.powerupBar.querySelectorAll('.powerup-tile.vowelBomb, .powerup-tile.consonantBomb').forEach(tile => {
        tile.addEventListener('mousedown', (e) => startBombDrag(e));
        tile.addEventListener('touchstart', (e) => startBombDrag(e), { passive: false });
    });
}

function updatePowerupTiles() {
    if (!elements.powerupBar) return;
    const tiles = {
        hint: elements.powerupBar.querySelector('.powerup-tile.hint .count'),
        vowelBomb: elements.powerupBar.querySelector('.powerup-tile.vowelBomb .count'),
        consonantBomb: elements.powerupBar.querySelector('.powerup-tile.consonantBomb .count'),
        shuffle: elements.powerupBar.querySelector('.powerup-tile.shuffle .count')
    };
    if (tiles.hint) tiles.hint.textContent = gameState.powerups.hint || 0;
    if (tiles.vowelBomb) tiles.vowelBomb.textContent = gameState.powerups.vowelBomb || 0;
    if (tiles.consonantBomb) tiles.consonantBomb.textContent = gameState.powerups.consonantBomb || 0;
    if (tiles.shuffle) tiles.shuffle.textContent = gameState.powerups.shuffle || 0;

    // Enable/disable based on count
    elements.powerupBar.querySelectorAll('.powerup-tile').forEach(tile => {
        const powerup = tile.dataset.powerup;
        const count = gameState.powerups[powerup] || 0;
        if (count === 0) {
            tile.classList.add('disabled');
        } else {
            tile.classList.remove('disabled');
        }
    });
}

// ==================== BOMB DRAG & DROP ====================
function startBombDrag(e) {
    e.preventDefault();
    if (!gameState.isPlaying) return;
    const tile = e.currentTarget;
    const powerup = tile.dataset.powerup; // 'vowelBomb' or 'consonantBomb'
    if (gameState.powerups[powerup] === 0) return;

    // Cancel any existing drag
    cancelBombDrag();

    gameState.bombDragActive = true;
    gameState.bombDragType = powerup === 'vowelBomb' ? 'vowel' : 'consonant';

    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'bomb-drag-ghost';
    ghost.textContent = powerup === 'vowelBomb' ? 'a' : 'b';
    document.body.appendChild(ghost);
    gameState.bombGhost = ghost;

    // Initial position
    updateGhostPosition(e);
}

function updateGhostPosition(e) {
    if (!gameState.bombDragActive || !gameState.bombGhost) return;
    let clientX, clientY;
    if (e.type === 'touchmove' || e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    gameState.bombGhost.style.left = clientX + 'px';
    gameState.bombGhost.style.top = clientY + 'px';
}

function onDragMove(e) {
    if (!gameState.bombDragActive) return;
    e.preventDefault();
    updateGhostPosition(e);

    // Check if over board
    const boardRect = elements.board.getBoundingClientRect();
    let clientX, clientY;
    if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    if (clientX >= boardRect.left && clientX <= boardRect.right &&
        clientY >= boardRect.top && clientY <= boardRect.bottom) {
        // Find tile under cursor and update bomb hover
        const tile = getTileAtPosition(clientX, clientY);
        if (tile) {
            const index = parseInt(tile.dataset.index);
            const size = gameState.gridSize;
            const row = Math.floor(index / size);
            const col = index % size;
            if (row < size-1 && col < size-1) {
                // Valid 2x2 area
                const indices = [
                    row * size + col,
                    row * size + col + 1,
                    (row + 1) * size + col,
                    (row + 1) * size + col + 1
                ];
                clearBombHighlight();
                indices.forEach(idx => {
                    const t = document.querySelector(`.tile[data-index="${idx}"]`);
                    if (t) t.classList.add('bomb-target');
                });
                gameState.bombHighlightCells = indices;
            } else {
                clearBombHighlight();
            }
        } else {
            clearBombHighlight();
        }
    } else {
        clearBombHighlight();
    }
}

function onDragEnd(e) {
    if (!gameState.bombDragActive) return;
    e.preventDefault();

    // Check if dropped over board with valid highlight
    if (gameState.bombHighlightCells.length > 0) {
        // Trigger bomb drop
        const type = gameState.bombDragType;
        const indices = gameState.bombHighlightCells;
        
        // Apply bomb (letter change)
        const vowels = ['A','E','I','O','U'];
        const consonants = ['R','S','T','N','L','C','D','M','P','B','G','F'];
        indices.forEach(idx => {
            if (type === 'vowel') {
                gameState.board[idx] = vowels[Math.floor(Math.random() * vowels.length)];
            } else {
                gameState.board[idx] = consonants[Math.floor(Math.random() * consonants.length)];
            }
        });
        
        // Animate tiles
        indices.forEach((idx, i) => {
            const tile = document.querySelector(`.tile[data-index="${idx}"]`);
            if (tile) {
                setTimeout(() => {
                    tile.classList.add('bomb-drop');
                    tile.querySelector('.tile-content').textContent = gameState.board[idx];
                    setTimeout(() => tile.classList.remove('bomb-drop'), 400);
                }, i * 50);
            }
        });

        // Directional shake
        const size = gameState.gridSize;
        const topLeftIdx = indices[0];
        const r = Math.floor(topLeftIdx / size);
        const c = topLeftIdx % size;
        const bombCenterRow = r + 0.5;
        const bombCenterCol = c + 0.5;

        const allTiles = document.querySelectorAll('.tile');
        allTiles.forEach(tile => {
            const idx = parseInt(tile.dataset.index);
            const row = Math.floor(idx / size);
            const col = idx % size;

            const dx = col - bombCenterCol;
            const dy = row - bombCenterRow;

            let dirClass = '';
            if (Math.abs(dx) > Math.abs(dy)) {
                dirClass = dx > 0 ? 'bomb-shake-right' : 'bomb-shake-left';
            } else {
                dirClass = dy > 0 ? 'bomb-shake-down' : 'bomb-shake-up';
            }

            tile.classList.remove('bomb-shake-right', 'bomb-shake-left', 'bomb-shake-up', 'bomb-shake-down');
            tile.style.animationDelay = '';

            const distance = Math.sqrt(dx * dx + dy * dy);
            const delay = distance * 0.05;
            tile.style.animationDelay = `${delay}s`;
            tile.classList.add(dirClass);

            if (indices.includes(idx)) {
                tile.classList.add('bomb-drop');
            }
        });

        elements.board.classList.add('exploding');
        setTimeout(() => {
            elements.board.classList.remove('exploding');
        }, 600);

        setTimeout(() => {
            allTiles.forEach(tile => {
                tile.classList.remove('bomb-shake-right', 'bomb-shake-left', 'bomb-shake-up', 'bomb-shake-down', 'bomb-drop');
                tile.style.animationDelay = '';
            });
        }, 600);
        
        // Decrement power-up
        gameState.powerups[type === 'vowel' ? 'vowelBomb' : 'consonantBomb']--;
        gameState.powerupsUsed[type === 'vowel' ? 'vowelBomb' : 'consonantBomb']++;
        updatePowerupTiles();
        if (gameState.soundEnabled) soundManager.playBombDrop();
        
        clearSelection();
        setTimeout(() => analyzeBoardAsync(), 500);
    }

    // Clean up drag state
    cancelBombDrag();
    clearBombHighlight();
}

function cancelBombDrag() {
    if (gameState.bombGhost) {
        gameState.bombGhost.remove();
        gameState.bombGhost = null;
    }
    gameState.bombDragActive = false;
    gameState.bombDragType = null;
    clearBombHighlight();
}

function clearBombHighlight() {
    gameState.bombHighlightCells.forEach(idx => {
        const t = document.querySelector(`.tile[data-index="${idx}"]`);
        if (t) t.classList.remove('bomb-target');
    });
    gameState.bombHighlightCells = [];
}

// ==================== GAME FUNCTIONS ====================
async function startGame() {
    console.log("Starting game...");
    
    if (gameState.soundEnabled) {
        try {
            await Promise.race([
                soundManager.resume(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Audio resume timeout')), 1000))
            ]);
        } catch (e) {
            console.warn("Audio resume failed, disabling sound for this session", e);
            gameState.soundEnabled = false;
            soundManager.toggleSound(false);
            updateSoundToggle();
        }
    }
    
    // Try to play background music if enabled
    if (musicEnabled) {
        playMusic();
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
    gameState.analysisComplete = false;
    gameState.combo = 0;
    gameState.comboMultiplier = 1;
    gameState.wordsFoundCount = 0;
    gameState.bombPlacementMode = null;
    gameState.bombHighlightCells = [];
    gameState.nextScoreBonus = gameState.scoreMilestone;
    gameState.lastWordTime = Date.now();
    // Reset power-up usage stats
    gameState.powerupsUsed = { hint: 0, vowelBomb: 0, consonantBomb: 0, shuffle: 0 };
    gameState.totalTimeBonus = 0;
    gameState.longestWordFound = "";
    // Reset persistent hint
    gameState.hintedWord = null;
    gameState.hintedPath = [];
    
    if (gameState.streakTimer) clearTimeout(gameState.streakTimer);
    startStreakTimer();
    
    // Reset power-ups if enabled (start at zero)
    if (gameState.powerupsEnabled) {
        gameState.powerups = { hint: 0, vowelBomb: 0, consonantBomb: 0, shuffle: 0 };
        // Hide progress bar, show power-up bar
        if (elements.wordsProgress) elements.wordsProgress.style.display = 'none';
        createPowerupTiles();
        elements.powerupBar.style.display = 'flex';
    } else {
        // Show progress bar, hide power-up bar
        if (elements.wordsProgress) elements.wordsProgress.style.display = 'block';
        if (elements.powerupBar) elements.powerupBar.style.display = 'none';
    }
    
    gameState.board = generateBoard();
    
    renderBoard();
    initPrismCanvas(); // Initialize canvas after board is rendered
    switchScreen('game-ui');
    updateScore();
    updateComboDisplay();
    
    if (gameState.isEndlessMode) {
        elements.timerElement.innerHTML = '∞<br><div class="endless-percentage">0%</div>';
        elements.timerElement.style.color = '#8b5cf6';
        elements.timerElement.classList.add('endless');
    } else {
        elements.timerElement.style.color = '#10b981';
        elements.timerElement.classList.remove('blink', 'endless');
        startTimer();
    }
    
    setTimeout(() => analyzeBoardAsync(), 50);
}

function startStreakTimer() {
    if (!gameState.powerupsEnabled) return;
    if (gameState.streakTimer) clearTimeout(gameState.streakTimer);
    gameState.streakTimer = setTimeout(() => {
        // Combo expires
        gameState.combo = 0;
        gameState.comboMultiplier = 1;
        updateComboDisplay();
        if (gameState.soundEnabled) soundManager.playNote(220, 0.2, 'square'); // sad sound
    }, gameState.streakTimeout);
}

function generateBoard() {
    const diceSet = gameState.gridSize === 4 ? CONFIG.DICE_4x4 : CONFIG.DICE_5x5;
    const shuffledDice = [...diceSet].sort(() => Math.random() - 0.5);
    const board = shuffledDice.map(die => {
        const face = die[Math.floor(Math.random() * die.length)];
        return face === 'Q' ? 'QU' : face;
    });
    
    // Generate multipliers if power-ups enabled
    if (gameState.powerupsEnabled) {
        gameState.tileMultipliers = board.map(() => {
            const rand = Math.random();
            let cumulative = 0;
            for (let m of MULTIPLIER_CHANCES) {
                cumulative += m.prob;
                if (rand < cumulative) return m.value;
            }
            return 1;
        });
    } else {
        gameState.tileMultipliers = board.map(() => 1);
    }
    
    return board;
}

function renderBoard() {
    elements.board.innerHTML = '';
    elements.board.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    
    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = index;
        tile.dataset.multiplier = gameState.tileMultipliers[index];
        
        // Add multiplier class if power-ups enabled and multiplier > 1
        if (gameState.powerupsEnabled && gameState.tileMultipliers[index] > 1) {
            tile.classList.add(`multiplier-${gameState.tileMultipliers[index]}`);
        }
        
        const content = document.createElement('div');
        content.className = 'tile-content';
        content.textContent = letter;
        tile.appendChild(content);
        
        // Add multiplier badge if >1
        if (gameState.powerupsEnabled && gameState.tileMultipliers[index] > 1) {
            const badge = document.createElement('div');
            badge.className = 'tile-multiplier';
            badge.textContent = `${gameState.tileMultipliers[index]}x`;
            tile.appendChild(badge);
        }
        
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
        tile.addEventListener('mouseleave', () => tile.classList.remove('hover'));
        
        elements.board.appendChild(tile);
    });
}

function updateScore() {
    let displayScore;
    
    if (gameState.isEndlessMode) {
        let totalFoundScore = 0;
        gameState.wordsFound.forEach(score => totalFoundScore += score);
        gameState.percentageFound = gameState.totalPossibleScore > 0 ? 
            Math.round((totalFoundScore / gameState.totalPossibleScore) * 100) : 0;
        displayScore = gameState.percentageFound;
        elements.timerElement.innerHTML = `∞<br><div class="endless-percentage">${gameState.percentageFound}%</div>`;
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
    
    if (!gameState.powerupsEnabled) {
        // Update progress bar only in classic mode
        const totalPossible = gameState.analysisComplete ? gameState.allPossibleWords.size : '?';
        const foundCount = gameState.wordsFound.size;
        elements.progressStats.textContent = `${foundCount}/${totalPossible}`;
        if (gameState.analysisComplete && gameState.allPossibleWords.size > 0) {
            const percentage = Math.min(100, Math.round((foundCount / gameState.allPossibleWords.size) * 100));
            elements.progressFill.style.width = `${percentage}%`;
        } else {
            elements.progressFill.style.width = '0%';
        }
    }
}

function createScorePopup(score) {
    const now = Date.now();
    if (now - gameState.lastScoreTime < 100) return;
    gameState.lastScoreTime = now;
    
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = gameState.isEndlessMode ? `+${score}%` : `+${score}`;
    popup.style.position = 'fixed';
    popup.style.zIndex = '10000';
    popup.style.pointerEvents = 'none';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.fontSize = '2.5rem';
    popup.style.fontWeight = '800';
    popup.style.color = '#22c55e';
    popup.style.textShadow = '0 0 20px rgba(34, 197, 94, 0.8)';
    popup.style.animation = 'scorePopup 0.8s ease-out forwards';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

function startTimer() {
    if (gameState.isEndlessMode) return;
    gameState.timeLeft = gameState.timeLimit;
    updateTimerDisplay();
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        if (gameState.timeLeft <= 0) {
            endGame();
        } else if (gameState.timeLeft <= 10) {
            elements.timerElement.classList.add('blink');
            elements.timerElement.style.color = '#ef4444';
            if (gameState.timeLeft <= 5) elements.timerElement.classList.add('shake');
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
        if (x >= hitboxX && x <= hitboxX + hitboxWidth && y >= hitboxY && y <= hitboxY + hitboxHeight) {
            return tile;
        }
    }
    return null;
}

function handleTileStart(index, event) {
    if (!gameState.isPlaying) return;
    if (event.type === 'touchstart') event.preventDefault();
    
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
    
    if (gameState.soundEnabled) soundManager.playTileSelect();
    
    gameState.isDragging = true;
    
    // Sync prism systems after adding tile
    syncPrismSystems();
    
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
            // New tile – must be adjacent to last tile
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
                
                if (gameState.soundEnabled) soundManager.playTileConnect(gameState.selectedTiles.length);
                
                elements.currentWordElement.style.transform = 'scale(1.05)';
                setTimeout(() => elements.currentWordElement.style.transform = 'scale(1)', 100);

                // Sync prism systems after adding tile
                syncPrismSystems();
            }
        } else {
            // Already selected – if it's not the last tile, truncate back to it (deselect after)
            const lastIndex = gameState.selectedTiles[gameState.selectedTiles.length - 1];
            if (index !== lastIndex) {
                truncateSelectionTo(index);
                elements.currentWordElement.style.transform = 'scale(1.05)';
                setTimeout(() => elements.currentWordElement.style.transform = 'scale(1)', 100);
            }
            // If it's the last tile, do nothing (already selected)
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
    
    // Remove all prism systems
    prismSystems = {};
    if (prismAnimationFrame) {
        cancelAnimationFrame(prismAnimationFrame);
        prismAnimationFrame = null;
        if (prismCtx) prismCtx.clearRect(0, 0, prismCtx.canvas.width, prismCtx.canvas.height);
    }
}

// New function to truncate selection when backtracking
function truncateSelectionTo(index) {
    const pos = gameState.selectedTiles.indexOf(index);
    if (pos === -1) return; // shouldn't happen

    // Remove tiles after this position
    const toRemove = gameState.selectedTiles.slice(pos + 1);
    toRemove.forEach(idx => {
        const tile = document.querySelector(`.tile[data-index="${idx}"]`);
        if (tile) {
            tile.classList.remove('selected');
            tile.style.transform = 'scale(1)';
        }
    });

    // Update selectedTiles array
    gameState.selectedTiles = gameState.selectedTiles.slice(0, pos + 1);

    // Rebuild currentWord from remaining tiles
    gameState.currentWord = gameState.selectedTiles.map(idx => gameState.board[idx]).join('');
    elements.currentWordElement.textContent = gameState.currentWord;

    // Sync prism systems after removal
    syncPrismSystems();
}

// ==================== WORD SUBMISSION ====================
function getWordMultiplier(selectedIndices) {
    let multiplier = 1;
    selectedIndices.forEach(idx => {
        multiplier *= gameState.tileMultipliers[idx] || 1;
    });
    return multiplier;
}

function submitWord() {
    if (gameState.selectedTiles.length < gameState.minWordLength) {
        flashTiles('flash-invalid');
        elements.currentWordElement.style.color = '#ef4444';
        elements.currentWordElement.classList.add('invalid');
        if (gameState.soundEnabled) soundManager.playWordInvalid();
        setTimeout(() => {
            elements.currentWordElement.style.color = '#f1f5f9';
            elements.currentWordElement.classList.remove('invalid');
        }, 400);
        // Do NOT reset combo
        clearSelection();
        return;
    }
    
    let word = gameState.currentWord.toUpperCase();
    let baseScore = calculateWordScore(word);
    let finalScore = baseScore;
    let tileMult = 1;
    
    if (gameState.powerupsEnabled) {
        tileMult = getWordMultiplier(gameState.selectedTiles);
        finalScore = Math.round(baseScore * tileMult);
        finalScore = Math.round(finalScore * gameState.comboMultiplier);
    }
    
    // Check for duplicate (already found)
    if (gameState.wordsFound.has(word)) {
        const oldScore = gameState.wordsFound.get(word);
        // In power-up mode, we allow re-finding if the new score is higher
        if (gameState.powerupsEnabled && finalScore > oldScore) {
            // Higher score duplicate – flash gold and update
            flashTiles('flash-higher-score');
            elements.currentWordElement.textContent = word;
            elements.currentWordElement.style.color = '#fbbf24';
            if (gameState.soundEnabled) soundManager.playWordHigherScore();
            
            // Update score: add the difference
            const diff = finalScore - oldScore;
            gameState.wordsFound.set(word, finalScore);
            gameState.score += diff;
            
            // Track longest word (if this word is longer than current longest)
            if (word.length > gameState.longestWordFound.length) {
                gameState.longestWordFound = word;
            }
            
            // If this word was hinted, clear the hint
            if (gameState.hintedWord === word) {
                clearHint();
            }
            
            updateScore();
            clearSelection();
            return;
        } else {
            // Normal duplicate – flash purple, do NOT reset combo
            flashTiles('flash-duplicate');
            elements.currentWordElement.style.animation = 'shakeDuplicate 0.5s ease';
            elements.currentWordElement.style.color = '#8b5cf6';
            if (gameState.soundEnabled) soundManager.playWordDuplicate();
            setTimeout(() => {
                elements.currentWordElement.style.animation = '';
                elements.currentWordElement.style.color = '#f1f5f9';
            }, 500);
            clearSelection();
            return;
        }
    }
    
    // Check validity
    let valid;
    if (gameState.analysisComplete) {
        valid = gameState.allPossibleWords.has(word);
    } else {
        valid = isValidWord(word) && isWordOnBoard(word);
    }
    
    if (!valid) {
        flashTiles('flash-invalid');
        elements.currentWordElement.textContent = word;
        elements.currentWordElement.style.color = '#ef4444';
        elements.currentWordElement.classList.add('invalid');
        if (gameState.soundEnabled) soundManager.playWordInvalid();
        setTimeout(() => {
            elements.currentWordElement.style.color = '#f1f5f9';
            elements.currentWordElement.classList.remove('invalid');
        }, 400);
        // Do NOT reset combo
        clearSelection();
        return;
    }
    
    // Valid new word
    flashTiles('flash-valid');
    elements.currentWordElement.textContent = word;
    elements.currentWordElement.style.color = '#f1f5f9';
    if (gameState.soundEnabled) soundManager.playWordValid();
    
    addWord(word, finalScore, tileMult);
}

function flashTiles(className) {
    gameState.selectedTiles.forEach(index => {
        const tile = document.querySelector(`.tile[data-index="${index}"]`);
        if (tile) {
            tile.classList.remove('flash-valid', 'flash-invalid', 'flash-duplicate', 'flash-higher-score');
            void tile.offsetWidth;
            tile.classList.add(className);
            setTimeout(() => tile.classList.remove(className), 500);
        }
    });
}

// ==================== RANDOM POWER-UP UNLOCK ====================
function unlockRandomPowerup() {
    const powerupTypes = ['hint', 'vowelBomb', 'consonantBomb', 'shuffle'];
    const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    gameState.powerups[randomType] = (gameState.powerups[randomType] || 0) + 1;
    celebratePowerup(randomType);
    updatePowerupTiles(); // Update tile counts
}

// ==================== ADD WORD ====================
function addWord(word, finalScore, tileMult) {
    gameState.wordsFound.set(word, finalScore);
    gameState.wordsFoundCount++;
    
    // Track longest word found
    if (word.length > gameState.longestWordFound.length) {
        gameState.longestWordFound = word;
    }
    
    if (!gameState.isEndlessMode) {
        gameState.score += finalScore;
        
        // Score milestone time bonus
        if (gameState.score >= gameState.nextScoreBonus) {
            const bonusSeconds = 5;
            gameState.timeLeft += bonusSeconds;
            gameState.totalTimeBonus += bonusSeconds;
            updateTimerDisplay();
            showTimeBonus(bonusSeconds);
            gameState.nextScoreBonus += gameState.scoreMilestone;
        }
    }
    
    // Award random power-ups based on triggers
    if (gameState.powerupsEnabled) {
        // Trigger: word length >=6
        if (word.length >= 6) {
            unlockRandomPowerup();
        }
        // Trigger: word length >=8
        if (word.length >= 8) {
            unlockRandomPowerup();
        }
        // Trigger: every 10 words found
        if (gameState.wordsFoundCount % 10 === 0) {
            unlockRandomPowerup();
        }
    }
    
    // Update streak timer and combo
    if (gameState.powerupsEnabled) {
        // Increase combo (only on valid new words)
        gameState.combo++;
        // Trigger: combo milestones
        if (gameState.combo === 3 || gameState.combo === 5) {
            unlockRandomPowerup();
        }
        if (gameState.combo >= 3) gameState.comboMultiplier = 1.5;
        if (gameState.combo >= 5) gameState.comboMultiplier = 2;
        
        // Extend timer based on word length
        const extraTime = Math.max(0, word.length - 5) * 1000; // +1 sec per letter over 5
        gameState.streakTimeout = 5000 + extraTime;
        gameState.lastWordTime = Date.now();
        startStreakTimer();
        
        // Extra multiplier for long words
        if (word.length >= 6) {
            gameState.comboMultiplier += 0.1;
            if (gameState.comboMultiplier > 3) gameState.comboMultiplier = 3;
        }
    }
    
    // If this word was hinted, clear the hint
    if (gameState.hintedWord === word) {
        clearHint();
    }
    
    updateComboDisplay();
    updateScore();
    clearSelection();
}

// ==================== FIXED POPUP FUNCTIONS ====================
function showTimeBonus(seconds) {
    const popup = document.createElement('div');
    popup.className = 'time-bonus-popup';
    popup.textContent = `+${seconds} sec!`;
    popup.style.position = 'fixed';
    popup.style.zIndex = '10000';
    popup.style.pointerEvents = 'none';
    popup.style.left = '50%';
    popup.style.top = '30%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.fontSize = '2rem';
    popup.style.fontWeight = 'bold';
    popup.style.color = '#22c55e';
    popup.style.textShadow = '0 0 10px rgba(34,197,94,0.8)';
    popup.style.animation = 'fadeUp 1s ease-out forwards';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
}

function celebratePowerup(type) {
    const tile = elements.powerupBar?.querySelector(`.powerup-tile.${type}`);
    if (tile) {
        tile.classList.add('powerup-unlock');
        setTimeout(() => tile.classList.remove('powerup-unlock'), 500);
    }
    if (gameState.soundEnabled) soundManager.playPowerupUnlock();
    
    // Show "+1" popup – now with fixed positioning
    const popup = document.createElement('div');
    popup.className = 'powerup-popup';
    popup.textContent = '+1';
    popup.style.position = 'fixed';
    popup.style.zIndex = '10000';
    popup.style.pointerEvents = 'none';
    popup.style.textAlign = 'center';
    popup.style.fontSize = '2rem';
    popup.style.fontWeight = 'bold';
    popup.style.color = '#fbbf24';
    popup.style.textShadow = '0 0 10px #f59e0b';
    popup.style.animation = 'fadeUp 0.8s ease-out forwards';
    
    const rect = tile?.getBoundingClientRect();
    if (rect) {
        popup.style.left = (rect.left + rect.width / 2) + 'px';
        popup.style.top = rect.top + 'px';
        popup.style.transform = 'translate(-50%, -50%)';
    } else {
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
    }
    
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

function updateComboDisplay() {
    if (!gameState.powerupsEnabled) {
        const comboEl = document.getElementById('combo-meter');
        if (comboEl) comboEl.style.display = 'none';
        return;
    }
    let comboEl = document.getElementById('combo-meter');
    if (!comboEl) {
        comboEl = document.createElement('div');
        comboEl.id = 'combo-meter';
        elements.topBar.appendChild(comboEl); // attach to top-bar, will be positioned absolutely
    }
    comboEl.style.display = 'block';
    if (gameState.combo >= 2) {
        comboEl.textContent = `🔥 Combo x${gameState.comboMultiplier}`;
        comboEl.classList.add('combo-active');
    } else {
        comboEl.textContent = '';
        comboEl.classList.remove('combo-active');
    }
}

// ==================== POWER-UPS (continued) ====================
function clearHint() {
    if (gameState.hintedPath.length) {
        gameState.hintedPath.forEach(idx => {
            const tile = document.querySelector(`.tile[data-index="${idx}"]`);
            if (tile) tile.classList.remove('hint-persistent');
        });
    }
    gameState.hintedWord = null;
    gameState.hintedPath = [];
}

function useHint() {
    if (!gameState.isPlaying || gameState.powerups.hint === 0) return;
    if (!gameState.analysisComplete) {
        alert("Still analyzing board, try again in a moment.");
        return;
    }

    const unplayed = Array.from(gameState.allPossibleWords.keys())
        .filter(word => !gameState.wordsFound.has(word));
    if (unplayed.length === 0) {
        alert("No more words to hint!");
        return;
    }

    const word = unplayed[Math.floor(Math.random() * unplayed.length)];
    const path = gameState.allPossibleWords.get(word).path.map(t => t.index);

    // Clear previous hint
    clearHint();

    // Apply persistent hint
    gameState.hintedWord = word;
    gameState.hintedPath = path;
    path.forEach(idx => {
        const tileEl = document.querySelector(`.tile[data-index="${idx}"]`);
        if (tileEl) tileEl.classList.add('hint-persistent');
    });

    // Briefly show the word
    elements.currentWordElement.textContent = word;
    elements.currentWordElement.style.color = '#fbbf24';
    setTimeout(() => {
        elements.currentWordElement.textContent = gameState.currentWord;
        elements.currentWordElement.style.color = '';
    }, 2000);

    gameState.powerups.hint--;
    gameState.powerupsUsed.hint++;
    updatePowerupTiles();
    if (gameState.soundEnabled) soundManager.playNote(392, 0.3, 'sine');
}

function useShuffle() {
    if (!gameState.isPlaying || gameState.powerups.shuffle === 0) return;

    // Shuffle the board array
    for (let i = gameState.board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.board[i], gameState.board[j]] = [gameState.board[j], gameState.board[i]];
        if (gameState.tileMultipliers) {
            [gameState.tileMultipliers[i], gameState.tileMultipliers[j]] = [gameState.tileMultipliers[j], gameState.tileMultipliers[i]];
        }
    }

    // Animate shuffle (spin effect)
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach((tile, idx) => {
        tile.style.transition = 'transform 0.3s ease';
        tile.style.transform = 'rotate(360deg) scale(0.8)';
        setTimeout(() => {
            tile.style.transform = '';
            tile.querySelector('.tile-content').textContent = gameState.board[idx];
            
            // Update multiplier classes
            tile.classList.remove('multiplier-2', 'multiplier-3');
            if (gameState.powerupsEnabled && gameState.tileMultipliers[idx] > 1) {
                tile.classList.add(`multiplier-${gameState.tileMultipliers[idx]}`);
            }
            
            // Re-add multiplier badge if needed
            const badge = tile.querySelector('.tile-multiplier');
            if (gameState.powerupsEnabled && gameState.tileMultipliers[idx] > 1) {
                if (!badge) {
                    const newBadge = document.createElement('div');
                    newBadge.className = 'tile-multiplier';
                    newBadge.textContent = `${gameState.tileMultipliers[idx]}x`;
                    tile.appendChild(newBadge);
                } else {
                    badge.textContent = `${gameState.tileMultipliers[idx]}x`;
                }
            } else if (badge) {
                badge.remove();
            }
        }, 150);
    });

    gameState.powerups.shuffle--;
    gameState.powerupsUsed.shuffle++;
    updatePowerupTiles();
    if (gameState.soundEnabled) soundManager.playNote(330, 0.2, 'sawtooth');

    clearSelection();
    setTimeout(() => analyzeBoardAsync(), 500);
}

// ==================== BOARD ANALYSIS ASYNC ====================
function analyzeBoardAsync() {
    console.time('findAllPossibleWords');
    gameState.allPossibleWords = findAllPossibleWords();
    console.timeEnd('findAllPossibleWords');
    
    const { longestWord, longestPath } = findLongestWord(gameState.allPossibleWords);
    gameState.longestWord = longestWord;
    gameState.longestWordPath = longestPath;
    
    gameState.totalPossibleScore = 0;
    gameState.allPossibleWords.forEach(data => {
        gameState.totalPossibleScore += data.score;
    });
    
    gameState.analysisComplete = true;
    updateScore();
    console.log(`Analysis complete: ${gameState.allPossibleWords.size} possible words`);
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
    // Optionally pause background music when game ends (or keep playing – your choice)
    // pauseMusic(); // uncomment if you want music to stop when game ends
    
    // Clear any persistent hint
    clearHint();
    // Cancel any ongoing bomb drag
    cancelBombDrag();
    // Stop prism animation
    prismSystems = {};
    if (prismAnimationFrame) {
        cancelAnimationFrame(prismAnimationFrame);
        prismAnimationFrame = null;
        if (prismCtx) prismCtx.clearRect(0, 0, prismCtx.canvas.width, prismCtx.canvas.height);
    }
    
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
    gameState.wordsFound.forEach(score => totalFoundScore += score);

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

    // Show appropriate summary based on power-ups enabled
    if (gameState.powerupsEnabled) {
        // Hide classic summary elements
        document.querySelector('.summary-board-section').style.display = 'none';
        document.querySelector('.results-container').style.display = 'none';
        // Show power-up summary
        elements.powerupSummary.style.display = 'block';
        
        // Populate power-up stats
        elements.hintUsed.textContent = gameState.powerupsUsed.hint;
        elements.vowelUsed.textContent = gameState.powerupsUsed.vowelBomb;
        elements.consonantUsed.textContent = gameState.powerupsUsed.consonantBomb;
        elements.shuffleUsed.textContent = gameState.powerupsUsed.shuffle;
        elements.timeBonusTotal.textContent = gameState.totalTimeBonus;
        elements.longestWordFound.textContent = gameState.longestWordFound || '—';
        
        // List all found words, sorted longest to shortest
        const foundWordsArray = Array.from(gameState.wordsFound.keys()).sort((a, b) => b.length - a.length);
        elements.foundWordsList.innerHTML = foundWordsArray.map(word => 
            `<span class="word-pill found">${word}</span>`
        ).join('');
    } else {
        // Show classic summary
        document.querySelector('.summary-board-section').style.display = 'block';
        document.querySelector('.results-container').style.display = 'block';
        elements.powerupSummary.style.display = 'none';
        
        renderUnifiedResults();
        renderSummaryBoard();
    }
}

function renderSummaryBoard() {
    if (!elements.summaryBoard) return;
    
    elements.summaryBoard.innerHTML = '';
    elements.summaryBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    
    const longestPathIndices = new Set(gameState.longestWordPath.map(tile => tile.index));
    
    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        if (longestPathIndices.has(index)) tile.classList.add('highlight-longest');
        
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
    let maxLength = 0, minLength = 99;

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
        header.innerHTML = `<span>${len} Letters</span><span>${foundInGroup}/${words.length}</span>`;
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

// Helper to get top-bar element (used in updateComboDisplay)
Object.defineProperty(elements, 'topBar', {
    get: () => document.getElementById('top-bar')
});