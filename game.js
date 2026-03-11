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

    DICE_6x6: [
        "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU",
        "DEILRX", "DELRVY", "DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
        "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ", "AAAFRS", "AAEEEE",
        "AAFIRS", "ADENNN", "AEEGMU", "AEGMNN", "AFIRSY", "CCNSTW",
        "CEIILT", "CEILPT", "CEIPST", "DDLNOR", "DHHNOT", "DHLNOR",
        "EIIITT", "EMOTTT", "ENSSSU", "FIPRSY", "GORRVW", "NOOTUW"
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
    learnerMode: false,       // unlimited hints, no high score
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
    bombPlacementMode: null,   // legacy (kept for ESC handler)
    bombHighlightCells: [],    // indices of current highlight
    bombDragStartX: 0,
    bombDragStartY: 0,
    bombDragAxis: null,        // 'row' or 'col', locked after 12px drag
    bombDropAxis: null,        // axis confirmed on drop
    bombDropAxisIndex: -1,     // row/col index to detonate
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

// ==================== WORD TRAIL CANVAS ====================
let trailCtx       = null;
let trailAnimActive = false;
let trailPhase      = 0;
let trailBurstParticles = [];
let trailBurstFrame = null;

function initTrailCanvas() {
    const canvas = document.getElementById('trail-canvas');
    if (!canvas) return;
    const boardWrap = document.getElementById('board-wrap');
    canvas.width  = boardWrap.clientWidth;
    canvas.height = boardWrap.clientHeight;
    trailCtx = canvas.getContext('2d');
}

function clearTrail() {
    trailAnimActive = false;
    if (trailCtx) trailCtx.clearRect(0, 0, trailCtx.canvas.width, trailCtx.canvas.height);
    if (trailBurstFrame) { cancelAnimationFrame(trailBurstFrame); trailBurstFrame = null; }
    trailBurstParticles = [];
}

function getTileCenter(index) {
    const boardWrap = document.getElementById('board-wrap');
    if (!boardWrap) return null;
    const boardRect = boardWrap.getBoundingClientRect();
    const tile = document.querySelector(`.tile[data-index="${index}"]`);
    if (!tile) return null;
    const r = tile.getBoundingClientRect();
    return { x: r.left + r.width / 2 - boardRect.left, y: r.top + r.height / 2 - boardRect.top };
}

function startTrailAnimation() {
    if (trailAnimActive) return;
    trailAnimActive = true;
    const loop = () => {
        if (!trailAnimActive) return;
        trailPhase = (trailPhase + 4) % 360;
        drawWordTrailPath();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

function drawWordTrailPath() {
    if (!trailCtx || !gameState.selectedTiles.length) return;
    const canvas = trailCtx.canvas;
    trailCtx.clearRect(0, 0, canvas.width, canvas.height);

    const points = gameState.selectedTiles.map(i => getTileCenter(i)).filter(Boolean);
    if (!points.length) return;

    // Color by word length
    const len = gameState.currentWord.length;
    let hue, sat, lit;
    if      (len >= 7) { hue = 142; sat = 72; lit = 55; }   // deep green
    else if (len >= 5) { hue = 160; sat = 78; lit = 55; }   // teal-green
    else if (len >= 3) { hue = 195; sat = 90; lit = 55; }   // cyan
    else               { hue = 215; sat = 55; lit = 68; }   // pale blue

    const pulse = 0.82 + 0.18 * Math.sin(trailPhase * Math.PI / 180);

    if (points.length === 1) {
        const g = trailCtx.createRadialGradient(points[0].x, points[0].y, 0, points[0].x, points[0].y, 24);
        g.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,${0.55 * pulse})`);
        g.addColorStop(1, `hsla(${hue},${sat}%,${lit}%,0)`);
        trailCtx.fillStyle = g;
        trailCtx.beginPath();
        trailCtx.arc(points[0].x, points[0].y, 24, 0, Math.PI * 2);
        trailCtx.fill();
        return;
    }

    // Build smooth quadratic-bezier path
    const buildPath = (ctx, pts) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i+1].x) / 2;
            const my = (pts[i].y + pts[i+1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    };

    trailCtx.lineCap  = 'round';
    trailCtx.lineJoin = 'round';

    // Layered glow: outer → mid → core
    const layers = [
        { w: 28, a: 0.06 },
        { w: 16, a: 0.14 },
        { w: 7,  a: 0.45 },
        { w: 2.5,a: 0.92 },
    ];
    layers.forEach(({ w, a }) => {
        buildPath(trailCtx, points);
        trailCtx.lineWidth   = w;
        trailCtx.strokeStyle = `hsla(${hue},${sat}%,${lit + 12}%,${a * pulse})`;
        trailCtx.stroke();
    });

    // Nodes at each tile
    points.forEach((pt, i) => {
        const isLast  = i === points.length - 1;
        const outer   = isLast ? 10 + 3 * pulse : 5;
        const inner   = isLast ? 5  + 1.5 * pulse : 3;

        trailCtx.beginPath();
        trailCtx.arc(pt.x, pt.y, outer + 5, 0, Math.PI * 2);
        trailCtx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${0.12 * pulse})`;
        trailCtx.fill();

        trailCtx.beginPath();
        trailCtx.arc(pt.x, pt.y, outer, 0, Math.PI * 2);
        trailCtx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${0.25 * pulse})`;
        trailCtx.fill();

        trailCtx.beginPath();
        trailCtx.arc(pt.x, pt.y, inner, 0, Math.PI * 2);
        trailCtx.fillStyle = `hsla(${hue},${sat}%,${lit + 22}%,${0.95 * pulse})`;
        trailCtx.fill();
    });

    // Length badge near last tile
    if (len >= 3) {
        const last = points[points.length - 1];
        trailCtx.save();
        trailCtx.font        = 'bold 10px system-ui, sans-serif';
        trailCtx.textAlign   = 'center';
        trailCtx.textBaseline = 'middle';
        const badgeX = last.x;
        const badgeY = last.y - 22;
        // pill background
        trailCtx.beginPath();
        trailCtx.roundRect(badgeX - 11, badgeY - 8, 22, 16, 8);
        trailCtx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${0.4 * pulse})`;
        trailCtx.fill();
        trailCtx.fillStyle = `hsla(${hue},${sat}%,${lit + 25}%,0.9)`;
        trailCtx.fillText(len, badgeX, badgeY);
        trailCtx.restore();
    }
}

// Burst particles from each selected tile on word submit
function burstTrail(valid) {
    if (!trailCtx) { clearTrail(); return; }
    trailAnimActive = false;

    const hue = valid ? 142 : 0;
    const points = gameState.selectedTiles.map(i => getTileCenter(i)).filter(Boolean);

    trailBurstParticles = [];
    points.forEach(pt => {
        const count = valid ? 14 : 9;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i / count) + Math.random() * 0.6;
            const speed = valid ? (2.5 + Math.random() * 4.5) : (1.5 + Math.random() * 3);
            trailBurstParticles.push({
                x: pt.x, y: pt.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                alpha: 1,
                hue: hue + (Math.random() - 0.5) * 40,
                spin: (Math.random() - 0.5) * 0.3,
            });
        }
    });

    if (trailBurstFrame) cancelAnimationFrame(trailBurstFrame);
    animateBurst();
}

function animateBurst() {
    if (!trailCtx) return;
    const canvas = trailCtx.canvas;
    trailCtx.clearRect(0, 0, canvas.width, canvas.height);

    trailBurstParticles = trailBurstParticles.filter(p => p.alpha > 0.04);

    trailBurstParticles.forEach(p => {
        p.x     += p.vx;
        p.y     += p.vy;
        p.vy    += 0.18;          // gravity
        p.vx    *= 0.97;          // air resistance
        p.alpha *= 0.87;
        p.size  *= 0.95;

        trailCtx.save();
        trailCtx.translate(p.x, p.y);
        trailCtx.rotate(p.spin);
        trailCtx.beginPath();
        // star shape for valid, circle for invalid
        if (p.hue > 60) { // valid = greenish, draw small star
            for (let s = 0; s < 5; s++) {
                const a = (s * 4 * Math.PI / 5) - Math.PI / 2;
                const r = p.size;
                const ri = p.size * 0.4;
                s === 0 ? trailCtx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                        : trailCtx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                const ai = a + 2 * Math.PI / 10;
                trailCtx.lineTo(Math.cos(ai) * ri, Math.sin(ai) * ri);
            }
            trailCtx.closePath();
        } else {
            trailCtx.arc(0, 0, p.size, 0, Math.PI * 2);
        }
        trailCtx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.alpha})`;
        trailCtx.fill();
        trailCtx.restore();
    });

    if (trailBurstParticles.length > 0) {
        trailBurstFrame = requestAnimationFrame(animateBurst);
    } else {
        clearTrail();
    }
}

// ==================== TILE RECT CACHE (mobile perf) ====================
// Cached bounding rects so getTileAtPosition doesn't thrash layout on every touchmove
let tileRectCache = []; // Array indexed by tile index
let tileRectCacheValid = false;

function buildTileRectCache() {
    tileRectCache = [];
    const tiles = document.querySelectorAll('#board .tile');
    tiles.forEach(tile => {
        const idx = parseInt(tile.dataset.index);
        tileRectCache[idx] = { el: tile, rect: tile.getBoundingClientRect() };
    });
    tileRectCacheValid = true;
}

function invalidateTileRectCache() {
    tileRectCacheValid = false;
}

window.addEventListener('resize', invalidateTileRectCache);
window.addEventListener('orientationchange', () => {
    invalidateTileRectCache();
    setTimeout(buildTileRectCache, 300); // rebuild after reflow
});

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
    if (gameState.isPlaying) {
        initPrismCanvas();
        initTrailCanvas();
        // Redraw hint path at new size if one is active
        if (gameState.hintedPath.length) {
            requestAnimationFrame(() => {
                const canvas = document.getElementById('hint-overlay-canvas');
                const board  = document.getElementById('board');
                if (canvas && board) {
                    canvas._pathColour = { h: 42, s: 95, l: 58 };
                    drawPathOnCanvas(gameState.hintedPath, board, canvas);
                }
            });
        }
    }
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
    // Expand QU back to Q+U for scoring so Qu tile counts as two letters
    const expanded = word.replace(/QU/g, 'QU'); // already expanded
    let i = 0;
    while (i < expanded.length) {
        if (expanded[i] === 'Q' && expanded[i+1] === 'U') {
            score += (CONFIG.LETTER_VALUES['Q'] || 10) + (CONFIG.LETTER_VALUES['U'] || 1);
            i += 2;
        } else {
            score += CONFIG.LETTER_VALUES[expanded[i]] || 1;
            i++;
        }
    }
    if (word.length >= 5) score += word.length * 2;
    if (word.length >= 8) score += word.length * 3;
    return score;
}

// ==================== BOARD ANALYSIS ====================
// Async chunked DFS — yields to browser after each row so UI never freezes,
// even on a 6x6 board. minWordLength used for early pruning.
async function findAllPossibleWords() {
    if (!gameState.dictionaryLoaded) return new Map();

    const words    = new Map();
    const gridSize = gameState.gridSize;
    const board    = gameState.board;
    const minLen   = gameState.minWordLength;
    const maxDepth = gameState.maxWordLength;

    const grid = [];
    for (let i = 0; i < gridSize; i++) {
        grid.push(board.slice(i * gridSize, (i + 1) * gridSize));
    }

    const directions = [
        [-1,-1], [-1,0], [-1,1],
        [0,-1],          [0,1],
        [1,-1],  [1,0],  [1,1]
    ];

    function dfs(row, col, visited, currentWord, path) {
        visited[row][col] = true;
        const letter = grid[row][col];
        currentWord += letter;
        path.push({ row, col, index: row * gridSize + col });

        if (currentWord.length <= maxDepth && isValidPrefix(currentWord)) {
            if (currentWord.length >= minLen && isValidWord(currentWord)) {
                const score = calculateWordScore(currentWord);
                if (!words.has(currentWord) || score > words.get(currentWord).score) {
                    words.set(currentWord, { score, path: [...path] });
                }
            }
            for (const [dr, dc] of directions) {
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !visited[nr][nc]) {
                    dfs(nr, nc, visited, currentWord, path);
                }
            }
        }

        visited[row][col] = false;
        path.pop();
    }

    // Yield to browser between rows so the UI stays responsive on large grids
    for (let row = 0; row < gridSize; row++) {
        await new Promise(resolve => setTimeout(resolve, 0));
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
    highscore6x6: document.getElementById('highscore-6x6'),
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
    // Powerup mode longest-possible board
    powerupLongestWordLabel: document.getElementById('powerup-longest-word-label'),
    powerupSummaryBoard: document.getElementById('powerup-summary-board'),
    // Power-up bar inside top-bar
    powerupBar: document.getElementById('powerup-bar'),
    wordsProgress: document.getElementById('words-progress')
};

// ==================== SESSION STATE (crash recovery) ====================
let _sessionSaveInterval = null;

function saveSessionState() {
    if (!gameState.isPlaying) return;
    try {
        const snap = {
            board:          gameState.board,
            score:          gameState.score,
            timeLeft:       gameState.timeLeft,
            gridSize:       gameState.gridSize,
            timeLimit:      gameState.timeLimit,
            minWordLength:  gameState.minWordLength,
            isEndlessMode:  gameState.isEndlessMode,
            powerupsEnabled: gameState.powerupsEnabled,
            wordsFound:     Array.from(gameState.wordsFound.entries()),
            tileMultipliers: gameState.tileMultipliers,
            powerups:       gameState.powerups,
            powerupsUsed:   gameState.powerupsUsed,
            totalTimeBonus: gameState.totalTimeBonus,
            longestWordFound: gameState.longestWordFound,
            combo:          gameState.combo,
            comboMultiplier: gameState.comboMultiplier,
            wordsFoundCount: gameState.wordsFoundCount,
            nextScoreBonus: gameState.nextScoreBonus,
            ts:             Date.now(),
        };
        sessionStorage.setItem('boggle_session', JSON.stringify(snap));
    } catch(e) { /* quota exceeded or private mode */ }
}

function clearSessionState() {
    try { sessionStorage.removeItem('boggle_session'); } catch(e) {}
}

function startSessionSave() {
    if (_sessionSaveInterval) clearInterval(_sessionSaveInterval);
    _sessionSaveInterval = setInterval(saveSessionState, 10000); // every 10s
}

function stopSessionSave() {
    if (_sessionSaveInterval) { clearInterval(_sessionSaveInterval); _sessionSaveInterval = null; }
    clearSessionState();
}

function checkSessionRestore() {
    try {
        const raw = sessionStorage.getItem('boggle_session');
        if (!raw) return false;
        const snap = JSON.parse(raw);
        // Ignore stale sessions (> 2 hours)
        if (!snap || !snap.ts || Date.now() - snap.ts > 7200000) {
            clearSessionState();
            return false;
        }
        return snap;
    } catch(e) { return false; }
}

async function restoreSession(snap) {
    gameState.gridSize      = snap.gridSize;
    gameState.timeLimit     = snap.timeLimit;
    gameState.minWordLength = snap.minWordLength;
    gameState.isEndlessMode = snap.isEndlessMode;
    gameState.powerupsEnabled = snap.powerupsEnabled;
    gameState.board         = snap.board;
    gameState.score         = snap.score;
    gameState.timeLeft      = Math.max(0, snap.timeLeft);
    gameState.tileMultipliers = snap.tileMultipliers || snap.board.map(() => 1);
    gameState.wordsFound    = new Map(snap.wordsFound || []);
    gameState.powerups      = snap.powerups || { hint:0, vowelBomb:0, consonantBomb:0, shuffle:0 };
    gameState.powerupsUsed  = snap.powerupsUsed || { hint:0, vowelBomb:0, consonantBomb:0, shuffle:0 };
    gameState.totalTimeBonus = snap.totalTimeBonus || 0;
    gameState.longestWordFound = snap.longestWordFound || "";
    gameState.combo         = snap.combo || 0;
    gameState.comboMultiplier = snap.comboMultiplier || 1;
    gameState.wordsFoundCount = snap.wordsFoundCount || 0;
    gameState.nextScoreBonus = snap.nextScoreBonus || 100;
    gameState.isPlaying     = true;
    gameState.analysisComplete = false;
    gameState.selectedTiles = [];
    gameState.currentWord   = "";
    gameState.isDragging    = false;

    if (gameState.soundEnabled) {
        try { await soundManager.resume(); } catch(e) {}
    }
    if (musicEnabled) playMusic();

    renderBoard();
    initPrismCanvas();
    initTrailCanvas();
    switchScreen('game-ui');
    updateScore();
    updateComboDisplay();

    if (gameState.powerupsEnabled) {
        if (elements.wordsProgress) elements.wordsProgress.style.display = 'none';
        createPowerupTiles();
        updatePowerupTiles();
        elements.powerupBar.style.display = 'flex';
    } else {
        if (elements.wordsProgress) elements.wordsProgress.style.display = 'block';
        if (elements.powerupBar) elements.powerupBar.style.display = 'none';
    }

    if (!gameState.isEndlessMode) {
        elements.timerElement.style.color = '#10b981';
        elements.timerElement.classList.remove('blink', 'endless');
        updateTimerDisplay();
        // Short delay for board render then start timer
        setTimeout(() => startTimer(), 800);
    } else {
        elements.timerElement.innerHTML = '∞<br><div class="endless-percentage">0%</div>';
        elements.timerElement.style.color = '#8b5cf6';
        elements.timerElement.classList.add('endless');
    }

    startSessionSave();
    startStreakTimer();
    setTimeout(() => analyzeBoardAsync(), 100);

    clearSessionState(); // consumed — fresh save will start from current state
    console.log('Session restored successfully');
}

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

    // Load learner mode preference
    const learnerPref = localStorage.getItem('boggle_learner_mode');
    if (learnerPref !== null) {
        gameState.learnerMode = JSON.parse(learnerPref);
    }
    updateLearnerToggle();
    
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
    
    // Check for an interrupted session to restore
    const savedSession = checkSessionRestore();
    if (savedSession) {
        setTimeout(async () => {
            await restoreSession(savedSession);
        }, 500);
    } else {
        setTimeout(() => {
            switchScreen('main-menu');
            console.log(`Game initialized with ${gameState.dictionarySize.toLocaleString()} words in dictionary`);
        }, 500);
    }
}

function updateLoadingProgress(percent, status) {
    if (elements.loadingBar) elements.loadingBar.style.width = `${percent}%`;
    if (elements.loadingPercentage) elements.loadingPercentage.textContent = `${percent}%`;
    if (elements.loadingStatus) elements.loadingStatus.textContent = status;
}

function loadHighScores() {
    const score4x4 = localStorage.getItem('boggle_highscore_4x4') || '0';
    const score5x5 = localStorage.getItem('boggle_highscore_5x5') || '0';
    const score6x6 = localStorage.getItem('boggle_highscore_6x6') || '0';
    const endless4 = localStorage.getItem('boggle_endless_4x4') || '0%';
    const endless5 = localStorage.getItem('boggle_endless_5x5') || '0%';
    const endless6 = localStorage.getItem('boggle_endless_6x6') || '0%';
    if (elements.highscore4x4) elements.highscore4x4.innerHTML = `${score4x4}<span class="hs-endless">${endless4}</span>`;
    if (elements.highscore5x5) elements.highscore5x5.innerHTML = `${score5x5}<span class="hs-endless">${endless5}</span>`;
    if (elements.highscore6x6) elements.highscore6x6.innerHTML = `${score6x6}<span class="hs-endless">${endless6}</span>`;
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

function updateLearnerToggle() {
    const toggleGroup = document.querySelector('.toggle-group.learner-group');
    if (toggleGroup) {
        toggleGroup.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = gameState.learnerMode ?
            toggleGroup.querySelector('.toggle-btn[data-learner="on"]') :
            toggleGroup.querySelector('.toggle-btn[data-learner="off"]');
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

            if (group.classList.contains('learner-group')) {
                group.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                gameState.learnerMode = this.dataset.learner === 'on';
                localStorage.setItem('boggle_learner_mode', JSON.stringify(gameState.learnerMode));
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
    // Remove active from all screens — CSS transitions handle the fade
    // Do NOT set inline styles; they override the CSS class and can get stranded
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.opacity = '';
        s.style.transform = '';
    });

    // Small rAF delay so the removal is painted before the add, ensuring transition fires
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const newScreen = document.getElementById(screenId);
            if (newScreen) newScreen.classList.add('active');
        });
    });
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
            <div class="icon">🎲</div>
            <div class="label">Row</div>
            <div class="count">0</div>
        </div>
        <div class="powerup-tile consonantBomb" data-powerup="consonantBomb">
            <div class="icon">🎲</div>
            <div class="label">Col</div>
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

// ==================== BOMB: DRAG-AND-DROP ROW / COLUMN ====================
// Drag a bomb from the power-up bar onto the board.
// Dragging more horizontally highlights the full ROW under the cursor (→ ROW).
// Dragging more vertically highlights the full COLUMN under the cursor (↓ COL).
// Drop to detonate. New letters drop in Tetris-style.

function startBombDrag(e) {
    e.preventDefault();
    if (!gameState.isPlaying) return;
    const tile = e.currentTarget;
    const powerup = tile.dataset.powerup; // 'vowelBomb' or 'consonantBomb'
    if (gameState.powerups[powerup] === 0) return;

    cancelBombDrag();

    gameState.bombDragActive = true;
    gameState.bombDragType = powerup === 'vowelBomb' ? 'row' : 'col';

    // Record start position (kept for legacy; axis is now determined by bomb type)
    const pt = e.type === 'touchstart' ? e.touches[0] : e;
    gameState.bombDragStartX = pt.clientX;
    gameState.bombDragStartY = pt.clientY;
    gameState.bombDragAxis = null;
    gameState.bombDropAxis = null;
    gameState.bombDropAxisIndex = -1;

    // Create ghost element — label shows what the bomb targets
    const ghost = document.createElement('div');
    ghost.className = 'bomb-drag-ghost';
    const icon      = powerup === 'vowelBomb' ? '🎲' : '🎲';
    const typeLabel = powerup === 'vowelBomb' ? 'ROW DICE' : 'COL DICE';
    ghost.innerHTML = `<span class="ghost-icon">${icon}</span><span class="ghost-axis-label">${typeLabel}</span>`;
    document.body.appendChild(ghost);
    gameState.bombGhost = ghost;

    updateGhostPosition(e);
}

function updateGhostPosition(e) {
    if (!gameState.bombDragActive || !gameState.bombGhost) return;
    const pt = (e.type === 'touchmove' || e.type === 'touchstart') ? e.touches[0] : e;
    gameState.bombGhost.style.left = pt.clientX + 'px';
    gameState.bombGhost.style.top  = pt.clientY + 'px';
}

function onDragMove(e) {
    if (!gameState.bombDragActive) return;
    e.preventDefault();
    updateGhostPosition(e);

    const pt = e.type === 'touchmove' ? e.touches[0] : e;
    const clientX = pt.clientX;
    const clientY = pt.clientY;

    // The axis is determined by the bomb TYPE, not by drag direction:
    //   vowelBomb   = ↔️ Row bomb  → always selects a full horizontal row
    //   consonantBomb = ↕️ Col bomb → always selects a full vertical column
    const axis = gameState.bombDragType === 'row' ? 'row' : 'col';

    // Update ghost label
    const axisLabel = gameState.bombGhost && gameState.bombGhost.querySelector('.ghost-axis-label');
    if (axisLabel) axisLabel.textContent = axis === 'row' ? '↔ DROP ON ROW' : '↕ DROP ON COL';

    // Highlight the row or column under the cursor
    const boardRect = elements.board.getBoundingClientRect();
    clearBombHighlight();
    gameState.bombDropAxis = null;
    gameState.bombDropAxisIndex = -1;

    if (clientX >= boardRect.left && clientX <= boardRect.right &&
        clientY >= boardRect.top  && clientY <= boardRect.bottom) {

        const size = gameState.gridSize;
        const relX = clientX - boardRect.left;
        const relY = clientY - boardRect.top;
        const col = Math.max(0, Math.min(size - 1, Math.floor((relX / boardRect.width)  * size)));
        const row = Math.max(0, Math.min(size - 1, Math.floor((relY / boardRect.height) * size)));

        let indices = [];
        if (axis === 'row') {
            for (let c = 0; c < size; c++) indices.push(row * size + c);
            gameState.bombDropAxisIndex = row;
        } else {
            for (let r = 0; r < size; r++) indices.push(r * size + col);
            gameState.bombDropAxisIndex = col;
        }
        gameState.bombDropAxis = axis;

        indices.forEach(idx => {
            const t = document.querySelector(`.tile[data-index="${idx}"]`);
            if (t) t.classList.add('bomb-target');
        });
        gameState.bombHighlightCells = indices;

        // Pulse ghost green when over a valid target
        if (gameState.bombGhost) gameState.bombGhost.classList.add('ghost-valid');
    } else {
        if (gameState.bombGhost) gameState.bombGhost.classList.remove('ghost-valid');
    }
}

function onDragEnd(e) {
    if (!gameState.bombDragActive) return;
    // Don't call preventDefault here — we need touchend to fire naturally

    if (gameState.bombHighlightCells.length > 0 && gameState.bombDropAxis !== null) {
        const type = gameState.bombDragType;
        const axis = gameState.bombDropAxis;
        const axisIdx = gameState.bombDropAxisIndex;
        // Remove ghost before explosion so it doesn't linger
        if (gameState.bombGhost) { gameState.bombGhost.remove(); gameState.bombGhost = null; }
        gameState.bombDragActive = false;
        applyBombExplosion(axis, axisIdx, type);
    } else {
        cancelBombDrag();
    }
}

function applyBombExplosion(axis, axisIdx, type) {
    const size = gameState.gridSize;
    let indices = [];
    if (axis === 'row') {
        for (let c = 0; c < size; c++) indices.push(axisIdx * size + c);
    } else {
        for (let r = 0; r < size; r++) indices.push(r * size + axisIdx);
    }

    // Close drag overlay
    cancelBombDrag();

    if (gameState.soundEnabled) soundManager.playBombDrop();

    // PHASE 1 — Blast targeted tiles OUT of the board with scatter physics
    let blastsDone = 0;
    const blastTotal = indices.length;

    // Explosion flash overlay
    const flashOverlay = document.createElement('div');
    flashOverlay.style.cssText = `
        position:absolute; inset:0; border-radius:12px; pointer-events:none; z-index:20;
        background: radial-gradient(circle at 50% 50%, rgba(255,200,60,0.55) 0%, rgba(255,100,20,0.3) 40%, transparent 72%);
        animation: bombFlash 0.38s ease-out forwards;
    `;
    document.getElementById('board-wrap').appendChild(flashOverlay);
    setTimeout(() => flashOverlay.remove(), 420);

    indices.forEach(idx => {
        const tileEl = document.querySelector(`.tile[data-index="${idx}"]`);
        if (!tileEl) { blastsDone++; return; }

        animateTileBlastOut(tileEl, idx, size, axis, axisIdx, () => {
            blastsDone++;
            if (blastsDone === blastTotal) {
                if (axis === 'row') {
                    for (let c = 0; c < size; c++) {
                        applyGravityToColumn(c, axisIdx);
                    }
                } else {
                    applyGravityToColStrip(axisIdx);
                }

                // Decrement power-up
                gameState.powerups[type === 'row' ? 'vowelBomb' : 'consonantBomb']--;
                gameState.powerupsUsed[type === 'row' ? 'vowelBomb' : 'consonantBomb']++;
                updatePowerupTiles();
                clearSelection();
                invalidateTileRectCache();
                // Wait for all fall/slide animations to fully settle before rebuilding
                // the rect cache. Row bomb: size * 38ms stagger + ~500ms max fall.
                // Col bomb: (size-1)*48ms stagger + ~700ms fall + tiles-falling removal.
                const settlePad = gameState.gridSize * 55 + 820;
                setTimeout(() => {
                    // Ensure tiles-falling clip class is gone before measuring
                    elements.board.classList.remove('tiles-falling');
                    invalidateTileRectCache();
                    buildTileRectCache();
                    analyzeBoardAsync();
                }, settlePad);
            }
        });
    });
}

// Generate a single random boggle letter from the dice pool
function getRandomDiceLetter() {
    let diceSet;
    if (gameState.gridSize === 4) diceSet = CONFIG.DICE_4x4;
    else if (gameState.gridSize === 5) diceSet = CONFIG.DICE_5x5;
    else diceSet = CONFIG.DICE_6x6;
    const die = diceSet[Math.floor(Math.random() * diceSet.length)];
    const flipped = Math.random() < 0.5 ? die.split('').reverse().join('') : die;
    const face = flipped[Math.floor(Math.random() * flipped.length)];
    return face === 'Q' ? 'QU' : face;
}

// Row bomb: one row is blasted. Tiles above shift down by one slot,
// and a brand-new random boggle letter falls from above the board into the top slot.
function applyGravityToColumn(col, blownRow) {
    const size = gameState.gridSize;

    // Build the new column state
    let colLetters = [];
    for (let r = 0; r < size; r++) colLetters.push(gameState.board[r * size + col]);

    colLetters.splice(blownRow, 1);       // remove blown slot
    colLetters.unshift(getRandomDiceLetter()); // new tile drops into top slot

    // Write back to board state
    for (let r = 0; r < size; r++) gameState.board[r * size + col] = colLetters[r];

    const boardRect = elements.board.getBoundingClientRect();

    for (let r = 0; r < size; r++) {
        const tileEl = document.querySelector(`.tile[data-index="${r * size + col}"]`);
        if (!tileEl) continue;

        // Update letter content first
        tileEl.querySelector('.tile-content').textContent = colLetters[r];

        // Also update QU class
        if (colLetters[r] === 'QU') tileEl.classList.add('tile-qu');
        else tileEl.classList.remove('tile-qu');

        const tileRect = tileEl.getBoundingClientRect();
        const delay    = r * 38;

        if (r === 0) {
            // Brand-new tile falls from above
            const distFromTop = tileRect.top - boardRect.top + tileRect.height;
            tileEl.style.opacity = '0';
            animateTileFall(tileEl, -(distFromTop + 24), delay, () => {
                tileEl.style.cssText = '';
            });
        } else if (r <= blownRow) {
            // Survivor shifts down one row
            const shiftDown = tileRect.height + 4;
            animateTileSlideDown(tileEl, shiftDown, delay, () => {
                tileEl.style.cssText = '';
            });
        } else {
            // Unaffected tile below blast — just ensure clean inline state
            // Use a short fade-in via animateTileFall with 0 start offset
            tileEl.style.opacity = '0';
            animateTileFall(tileEl, 0, delay, () => {
                tileEl.style.cssText = '';
            });
        }
    }
}

// Column bomb: entire column replaced with random boggle dice, all falling from above.
function applyGravityToColStrip(axisCol) {
    const size = gameState.gridSize;

    // Generate and store new random boggle letters
    for (let r = 0; r < size; r++) {
        gameState.board[r * size + axisCol] = getRandomDiceLetter();
    }

    // Add overflow clip while tiles are mid-air
    elements.board.classList.add('tiles-falling');

    const boardRect = elements.board.getBoundingClientRect();

    for (let r = 0; r < size; r++) {
        const tileEl = document.querySelector(`.tile[data-index="${r * size + axisCol}"]`);
        if (!tileEl) continue;

        // Update letter and hide so animateTileFall can reveal it
        tileEl.querySelector('.tile-content').textContent = gameState.board[r * size + axisCol];
        tileEl.style.opacity = '0';

        const tileRect    = tileEl.getBoundingClientRect();
        const distToBoard = tileRect.top - boardRect.top + tileRect.height;
        const startY      = -(distToBoard + 20);
        const delay       = r * 48;  // cascade top→bottom

        animateTileFall(tileEl, startY, delay);
    }

    // Remove clip class once the last tile has landed
    const lastDelay    = (size - 1) * 48;
    const lastDist     = Math.abs(-(elements.board.getBoundingClientRect().height + 20));
    const lastDuration = Math.min(700, 340 + lastDist * 0.52);
    setTimeout(() => elements.board.classList.remove('tiles-falling'), lastDelay + lastDuration + 40);
}

function cancelBombDrag() {
    // Remove ghost
    if (gameState.bombGhost) {
        gameState.bombGhost.remove();
        gameState.bombGhost = null;
    }
    // Remove dim from all tiles
    document.querySelectorAll('#board .tile.bomb-dim').forEach(t => t.classList.remove('bomb-dim'));
    gameState.bombDragActive = false;
    gameState.bombDragType = null;
    gameState.bombDragAxis = null;
    gameState.bombDropAxis = null;
    gameState.bombDropAxisIndex = -1;
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
    gameState.bombDragAxis = null;
    gameState.bombDropAxis = null;
    gameState.bombDropAxisIndex = -1;
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

    // Learner mode: show a dedicated hint bar regardless of powerups setting
    let learnerBar = document.getElementById('learner-hint-bar');
    if (gameState.learnerMode) {
        if (!learnerBar) {
            learnerBar = document.createElement('div');
            learnerBar.id = 'learner-hint-bar';
            learnerBar.className = 'learner-hint-bar';
            learnerBar.innerHTML = `
                <span class="learner-bar-label"><i class="fas fa-graduation-cap"></i> Learner Mode</span>
                <button id="learner-hint-btn" class="learner-hint-btn">
                    <i class="fas fa-lightbulb"></i> Hint
                </button>
            `;
            // Insert after top-bar
            const topBar = document.getElementById('top-bar');
            topBar.parentNode.insertBefore(learnerBar, topBar.nextSibling);
        }
        learnerBar.style.display = 'flex';
        const lhBtn = document.getElementById('learner-hint-btn');
        if (lhBtn) {
            lhBtn.onclick = null;
            lhBtn.addEventListener('click', () => useHint());
        }
    } else {
        if (learnerBar) learnerBar.style.display = 'none';
    }
    
    gameState.board = generateBoard();
    
    renderBoard();
    initPrismCanvas();
    initTrailCanvas();
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
        // Timer starts once the tile drop-in animation finishes.
        // Stagger: col × 60ms + row × 40ms (same as renderBoard).
        // Longest fall: bottom-right tile of the grid.
        const size           = gameState.gridSize;
        const lastTileDelay  = (size - 1) * 60 + (size - 1) * 40;   // matches renderBoard stagger
        const lastFallDist   = 420;                                    // approx longest startOffsetY magnitude
        const lastFallDur    = Math.min(700, 340 + lastFallDist * 0.52);
        const dropInFinishMs = lastTileDelay + lastFallDur + 80;      // +80ms buffer
        setTimeout(() => startTimer(), dropInFinishMs);
    }
    
    setTimeout(() => analyzeBoardAsync(), 50);
    startSessionSave();
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
    let diceSet;
    if (gameState.gridSize === 4) diceSet = CONFIG.DICE_4x4;
    else if (gameState.gridSize === 5) diceSet = CONFIG.DICE_5x5;
    else diceSet = CONFIG.DICE_6x6;

    const shuffledDice = [...diceSet].sort(() => Math.random() - 0.5);
    const board = shuffledDice.map(die => {
        // Random face, random orientation (die can be read forwards or backwards)
        const flipped = Math.random() < 0.5 ? die.split('').reverse().join('') : die;
        const face = flipped[Math.floor(Math.random() * flipped.length)];
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

// ==================== TILE PHYSICS ====================
// Path-based tile drop animation — 5 hand-crafted paths give each tile a
// distinct personality while guaranteeing a clean landing at t=1.
//
// Path types:
//   0 – Gentle wobble (subtle side sway)
//   1 – Left-wall arc (curves toward left, corrects on approach)
//   2 – Right-wall arc (mirror)
//   3 – S-drift (fluid double-curve)
//   4 – Fast slam (aggressive straight fall, heavy squish)

const _eIn3  = t => t * t * t;
const _eOut3 = t => 1 - (1 - t) ** 3;

/**
 * Drop a tile from startOffsetY (negative px, above its natural slot) down
 * to its natural grid position using a pre-baked path.
 * @param {HTMLElement} tileEl
 * @param {number}      startOffsetY  — starting Y offset (negative = above board)
 * @param {number}      delay         — ms to wait before animating
 * @param {Function}    [onSettle]    — called once tile is fully settled
 */
function animateTileFall(tileEl, startOffsetY, delay, onSettle) {
    // Special case: startOffsetY=0 means just fade-in in place (unaffected tile restore)
    if (startOffsetY === 0) {
        tileEl.style.cssText = 'opacity:0; transition:none;';
        setTimeout(() => {
            tileEl.style.transition = 'opacity 180ms ease';
            requestAnimationFrame(() => { tileEl.style.opacity = '1'; });
            setTimeout(() => {
                tileEl.style.cssText = '';
                if (onSettle) onSettle();
            }, 220);
        }, delay);
        return;
    }

    const pathType  = Math.floor(Math.random() * 5);
    const startRot  = (Math.random() - 0.5) * 0.30;   // small initial rotation (radians)
    const dist      = Math.abs(startOffsetY);
    // Duration scales with fall distance, capped so long falls don't feel sluggish
    const duration  = Math.min(700, 340 + dist * 0.52);

    // Teleport tile to start position (invisible)
    tileEl.style.cssText = `opacity:0; transform:translateY(${startOffsetY}px); transition:none; will-change:transform,opacity;`;

    setTimeout(() => {
        let t0 = null;

        function frame(ts) {
            if (!t0) t0 = ts;
            const elapsed = ts - t0;
            const t = Math.min(1, elapsed / duration);

            // ── Vertical: gravity curve with micro spring-bounce near landing ──
            let vf;
            if (t < 0.87) {
                // Accelerating fall (easeInCubic scaled to 87% of time)
                vf = _eIn3(t / 0.87);
            } else {
                // Tiny spring overshoot: dip below 1, then snap back to exactly 1
                const u = (t - 0.87) / 0.13;
                vf = 1 - 0.038 * Math.sin(u * Math.PI);
            }
            const curY = startOffsetY * (1 - vf);  // startOffsetY→0 as vf→1

            // ── Horizontal path offset (returns to 0 by t=1 via envelope) ──
            const env = 1 - t * t;   // amplitude envelope: 1 at t=0, 0 at t=1
            let hx = 0;
            switch (pathType) {
                case 0: // Gentle wobble
                    hx = Math.sin(t * Math.PI * 2.4) * 5 * env;
                    break;
                case 1: // Arc left
                    hx = -17 * Math.sin(t * Math.PI) * (1 - t * 0.32);
                    break;
                case 2: // Arc right
                    hx = +17 * Math.sin(t * Math.PI) * (1 - t * 0.32);
                    break;
                case 3: // S-drift
                    hx = Math.sin(t * Math.PI * 1.85) * 13 * env;
                    break;
                case 4: // Fast slam — barely any horizontal drift
                    hx = Math.sin(t * Math.PI * 1.3) * 6 * env;
                    break;
            }

            // ── Rotation eases smoothly to 0 ──
            const rot = startRot * (1 - _eOut3(t));

            // ── Landing squish (brief scaleX/scaleY deformation) ──
            let sx = 1, sy = 1;
            if (t > 0.81 && t < 1) {
                const lt = (t - 0.81) / 0.19;
                // Squish amount larger for the slam path
                const sqAmt = pathType === 4 ? 0.16 : 0.10;
                const sq = Math.sin(lt * Math.PI) * sqAmt;
                sx = 1 + sq * 0.55;
                sy = 1 - sq;
            }

            tileEl.style.opacity   = Math.min(1, elapsed / 80).toFixed(3);
            tileEl.style.transform = `translateX(${hx.toFixed(2)}px) translateY(${curY.toFixed(2)}px) rotate(${rot.toFixed(4)}rad) scaleX(${sx.toFixed(4)}) scaleY(${sy.toFixed(4)})`;

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                tileEl.style.cssText = '';   // remove all inline styles — CSS classes take over
                if (onSettle) onSettle();
            }
        }

        requestAnimationFrame(frame);
    }, delay);
}

/**
 * Blast a tile OUT of the board — it flies away and fades to nothing.
 * Used as the first phase of a bomb explosion before new tiles drop in.
 * @param {HTMLElement} tileEl
 * @param {number}      index   — tile index in the grid
 * @param {number}      size    — grid size (4 or 5)
 * @param {string}      axis    — 'row' or 'col'
 * @param {number}      axisIdx — which row/col is being bombed
 * @param {Function}    [onDone]
 */
function animateTileBlastOut(tileEl, index, size, axis, axisIdx, onDone) {
    const row = Math.floor(index / size);
    const col = index % size;
    const cx  = (size - 1) / 2;   // centre of the grid

    // Determine blast velocity based on position relative to the explosion axis
    let vx, vy, rotEnd;
    if (axis === 'row') {
        // Row bomb: tiles scatter upward; columns near edges fly further sideways
        const xSpread = (col - cx) / cx;   // –1 … +1
        vx     = xSpread * 60 + (Math.random() - 0.5) * 22;
        vy     = -(65 + Math.random() * 55);
        rotEnd = (Math.random() - 0.5) * 1.6;
    } else {
        // Col bomb: tiles scatter sideways; rows near edges fly further up/down
        const ySpread = (row - cx) / cx;
        const dir     = axisIdx <= cx ? -1 : 1;   // fly away from board centre
        vx     = dir * (72 + Math.random() * 48);
        vy     = ySpread * 55 + (Math.random() - 0.5) * 22;
        rotEnd = (Math.random() - 0.5) * 1.6;
    }

    const duration = 270 + Math.random() * 70;
    let t0 = null;

    tileEl.style.willChange = 'transform, opacity';

    function frame(ts) {
        if (!t0) t0 = ts;
        const t    = Math.min(1, (ts - t0) / duration);
        // ease-in-out for a satisfying arc, then slow at the end as it fades
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

        tileEl.style.transform = `translate(${(vx * ease).toFixed(1)}px, ${(vy * ease).toFixed(1)}px) rotate(${(rotEnd * ease).toFixed(3)}rad) scale(${(1 - ease * 0.28).toFixed(3)})`;
        tileEl.style.opacity   = (1 - ease * ease).toFixed(3);   // quadratic fade

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            // Hide completely — the caller will reuse this element with animateTileFall
            tileEl.style.opacity    = '0';
            tileEl.style.transform  = '';
            tileEl.style.willChange = '';
            if (onDone) onDone();
        }
    }
    requestAnimationFrame(frame);
}

/**
 * Smoothly slide a tile DOWN by shiftPx pixels (used for row-bomb survivors
 * that need to shift one slot lower after the row above them is removed).
 * @param {HTMLElement} tileEl
 * @param {number}      shiftPx  — positive px to shift downward
 * @param {number}      delay
 * @param {Function}    [onSettle]
 */
function animateTileSlideDown(tileEl, shiftPx, delay, onSettle) {
    const duration = Math.min(480, 260 + shiftPx * 0.30);

    // Start at –shiftPx (i.e. original position) and settle at 0 (new position)
    tileEl.style.cssText = `transform:translateY(${-shiftPx}px); transition:none; will-change:transform;`;

    setTimeout(() => {
        let t0 = null;
        function frame(ts) {
            if (!t0) t0 = ts;
            const t = Math.min(1, (ts - t0) / duration);
            // spring-like settle
            let vf;
            if (t < 0.88) {
                vf = _eIn3(t / 0.88);
            } else {
                const u = (t - 0.88) / 0.12;
                vf = 1 - 0.025 * Math.sin(u * Math.PI);
            }
            const curY = -shiftPx * (1 - vf);

            // tiny landing squish for survivors too
            let sx = 1, sy = 1;
            if (t > 0.84 && t < 1) {
                const lt = (t - 0.84) / 0.16;
                const sq = Math.sin(lt * Math.PI) * 0.07;
                sx = 1 + sq * 0.5;
                sy = 1 - sq;
            }
            tileEl.style.transform = `translateY(${curY.toFixed(2)}px) scaleX(${sx.toFixed(4)}) scaleY(${sy.toFixed(4)})`;
            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                tileEl.style.cssText = '';
                if (onSettle) onSettle();
            }
        }
        requestAnimationFrame(frame);
    }, delay);
}

function renderBoard() {
    elements.board.innerHTML = '';
    elements.board.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    // Clip overflow so tiles appear to fall from above the board edge
    elements.board.classList.add('tiles-falling');

    const size = gameState.gridSize;

    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        if (letter === 'QU') tile.classList.add('tile-qu');
        tile.dataset.index = index;
        tile.dataset.multiplier = gameState.tileMultipliers[index];

        if (gameState.powerupsEnabled && gameState.tileMultipliers[index] > 1) {
            tile.classList.add(`multiplier-${gameState.tileMultipliers[index]}`);
        }

        const content = document.createElement('div');
        content.className = 'tile-content';
        content.textContent = letter;
        tile.appendChild(content);

        if (gameState.powerupsEnabled && gameState.tileMultipliers[index] > 1) {
            const badge = document.createElement('div');
            badge.className = 'tile-multiplier';
            badge.textContent = `${gameState.tileMultipliers[index]}x`;
            tile.appendChild(badge);
        }

        const hitbox = document.createElement('div');
        hitbox.className = 'tile-hitbox';
        tile.appendChild(hitbox);

        tile.addEventListener('mousedown',  (e) => handleTileStart(index, e));
        tile.addEventListener('touchstart', (e) => handleTileStart(index, e), { passive: false });
        tile.addEventListener('mouseenter', () => {
            if (gameState.isDragging && !gameState.selectedTiles.includes(index)) {
                tile.classList.add('hover');
            }
        });
        tile.addEventListener('mouseleave', () => tile.classList.remove('hover'));

        // Hide tile immediately — animateTileFall will handle it
        tile.style.cssText = 'opacity:0; transform:translateY(-400px); transition:none;';
        elements.board.appendChild(tile);
    });

    // Measure the board so we can calculate realistic fall distances
    requestAnimationFrame(() => {
        const boardRect = elements.board.getBoundingClientRect();
        const tileEls   = elements.board.querySelectorAll('.tile');

        let lastSettleTime = 0;

        tileEls.forEach((tile, i) => {
            const row = Math.floor(i / size);
            const col = i % size;

            // Tiles start above the board. The higher the row, the shorter the fall
            // (row 0 tiles are near the top so start just barely above; row N are far below)
            // We want: top row enters first, bottom row last → stagger by row too
            const tileRect    = tile.getBoundingClientRect();
            const distToBoard = tileRect.top - boardRect.top + tileRect.height; // px from top of board to tile bottom
            const startY      = -(distToBoard + 20); // 20px extra clearance above board top

            // Column-first cascade: col × 60ms, then row × 40ms within column
            const delay = col * 60 + row * 40;

            const settleAt = delay + Math.min(620, 320 + Math.abs(startY) * 0.55) + 30;
            if (settleAt > lastSettleTime) lastSettleTime = settleAt;

            animateTileFall(tile, startY, delay, null);
        });

        // Once the last tile has settled: remove clipping, build rect cache, enable interaction
        setTimeout(() => {
            elements.board.classList.remove('tiles-falling');
            buildTileRectCache();
        }, lastSettleTime + 30);
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
        elements.scoreElement.style.transform = 'scale(1.25)';
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

function createWordScorePopup(word, score, kind) {
    const now = Date.now();
    if (now - gameState.lastScoreTime < 80) return;
    gameState.lastScoreTime = now;

    const palette = {
        valid:     { word: '#4ade80', score: '#22c55e', glow: 'rgba(34,197,94,0.65)'  },
        duplicate: { word: '#c4b5fd', score: '#8b5cf6', glow: 'rgba(139,92,246,0.65)' },
        higher:    { word: '#fde68a', score: '#f59e0b', glow: 'rgba(245,158,11,0.65)' },
    };
    const c = palette[kind] || palette.valid;

    // Position near board center
    const boardEl = elements.board;
    const br      = boardEl ? boardEl.getBoundingClientRect() : null;
    const cx      = br ? br.left + br.width  / 2 : window.innerWidth  / 2;
    const cy      = br ? br.top  + br.height / 2 : window.innerHeight / 2;

    const popup = document.createElement('div');
    popup.className = 'score-popup-v2';
    popup.style.cssText = `
        position: fixed; z-index: 10000; pointer-events: none;
        left: ${cx}px; top: ${cy}px;
        transform: translate(-50%, -50%);
        animation: scorePopupV2 0.95s cubic-bezier(0.34,1.56,0.64,1) forwards;
    `;
    const dispScore = gameState.isEndlessMode ? `+${score}%` : `+${score}`;
    popup.innerHTML = `
        <div class="sp-word"  style="color:${c.word};  text-shadow:0 0 18px ${c.glow}">${word}</div>
        <div class="sp-score" style="color:${c.score}; text-shadow:0 0 30px ${c.glow}">${dispScore}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 950);
}

// Score comparison popup: shown when a duplicate word is re-found at a HIGHER score
function createScoreComparePopup(word, oldScore, newScore, diff) {
    const boardEl = elements.board;
    const br = boardEl ? boardEl.getBoundingClientRect() : null;
    const cx = br ? br.left + br.width / 2 : window.innerWidth / 2;
    const cy = br ? br.top + br.height / 2 - 30 : window.innerHeight / 2;

    const popup = document.createElement('div');
    popup.className = 'score-popup-v2';
    popup.style.cssText = `
        position:fixed; z-index:10000; pointer-events:none;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        animation: scorePopupV2 1.1s cubic-bezier(0.34,1.56,0.64,1) forwards;
        text-align:center;
    `;
    popup.innerHTML = `
        <div class="sp-word"  style="color:#fde68a; text-shadow:0 0 18px rgba(245,158,11,0.7)">${word}</div>
        <div class="sp-score" style="color:#f59e0b; text-shadow:0 0 30px rgba(245,158,11,0.8)">+${diff}</div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px">${oldScore} → ${newScore}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1100);
}

// Duplicate reminder: shown when a word is re-found at same or lower score
function createDuplicateReminderPopup(word, bankedScore, attemptedScore) {
    const boardEl = elements.board;
    const br = boardEl ? boardEl.getBoundingClientRect() : null;
    const cx = br ? br.left + br.width / 2 : window.innerWidth / 2;
    const cy = br ? br.top + br.height / 2 - 30 : window.innerHeight / 2;

    const popup = document.createElement('div');
    popup.className = 'score-popup-v2';
    popup.style.cssText = `
        position:fixed; z-index:10000; pointer-events:none;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        animation: scorePopupV2 0.85s cubic-bezier(0.34,1.56,0.64,1) forwards;
        text-align:center;
    `;
    // In powerup mode show the score comparison; classic mode just shows "already found"
    const detail = (attemptedScore !== null && attemptedScore !== bankedScore)
        ? `<div style="font-size:0.72rem; color:#94a3b8; margin-top:2px">banked ${bankedScore} · tried ${attemptedScore}</div>`
        : `<div style="font-size:0.72rem; color:#94a3b8; margin-top:2px">already banked ${bankedScore}</div>`;
    popup.innerHTML = `
        <div class="sp-word"  style="color:#c4b5fd; text-shadow:0 0 18px rgba(139,92,246,0.6)">${word}</div>
        <div class="sp-score" style="color:#8b5cf6; font-size:1rem">already found</div>
        ${detail}
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 900);
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
    if (!tileRectCacheValid) buildTileRectCache();
    for (let i = 0; i < tileRectCache.length; i++) {
        const entry = tileRectCache[i];
        if (!entry) continue;
        const r = entry.rect;
        const hw = r.width * 0.35;
        const hh = r.height * 0.35;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (x >= cx - hw && x <= cx + hw && y >= cy - hh && y <= cy + hh) {
            return entry.el;
        }
    }
    return null;
}

function handleTileStart(index, event) {
    if (!gameState.isPlaying) return;
    if (event.type === 'touchstart') event.preventDefault();

    // Safety: always clear any lingering inline styles on the tile being started,
    // and invalidate the rect cache so stale rects never block a tile permanently.
    const tileCheck = document.querySelector(`.tile[data-index="${index}"]`);
    if (tileCheck && tileCheck.style.length > 0) {
        tileCheck.style.cssText = '';
        invalidateTileRectCache();
    }
    
    if (gameState.selectedTiles.length > 0 && !gameState.selectedTiles.includes(index)) {
        clearSelection();
    }
    
    gameState.selectedTiles.push(index);
    const tile = document.querySelector(`.tile[data-index="${index}"]`);
    if (tile) {
        tile.style.cssText = ''; // clear any lingering drop-in inline styles
        tile.classList.add('selected');
    }
    
    const letter = gameState.board[index];
    gameState.currentWord += letter;
    elements.currentWordElement.textContent = gameState.currentWord;
    elements.currentWordElement.classList.remove('invalid');
    
    if (gameState.soundEnabled) soundManager.playTileSelect();
    
    gameState.isDragging = true;
    
    // Start word trail animation
    startTrailAnimation();
    
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

let _tileMoveRafPending = false;
let _tileMoveLastEvent = null;

function handleTileMove(event) {
    if (!gameState.isDragging) return;
    // Throttle via RAF for mobile performance
    _tileMoveLastEvent = event;
    if (_tileMoveRafPending) return;
    _tileMoveRafPending = true;
    requestAnimationFrame(() => {
        _tileMoveRafPending = false;
        const ev = _tileMoveLastEvent;
        if (!gameState.isDragging || !ev) return;
    
    const clientX = ev.type.includes('mouse') ? ev.clientX : ev.touches[0].clientX;
    const clientY = ev.type.includes('mouse') ? ev.clientY : ev.touches[0].clientY;

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
                tile.style.cssText = ''; // clear any lingering inline styles
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
    }); // end RAF
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
            tile.style.cssText = '';
            tile.classList.remove('selected');
        }
    });
    gameState.selectedTiles = [];
    gameState.currentWord = "";
    elements.currentWordElement.textContent = '';
    elements.currentWordElement.classList.remove('invalid');
    
    // Clear word trail
    clearTrail();
    
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

    // Remove tiles after this position with a brief "pop-off" pulse
    const toRemove = gameState.selectedTiles.slice(pos + 1);
    toRemove.forEach(idx => {
        const tile = document.querySelector(`.tile[data-index="${idx}"]`);
        if (tile) {
            tile.style.cssText = '';
            tile.classList.remove('selected');
            tile.classList.add('deselect-pulse');
            setTimeout(() => tile.classList.remove('deselect-pulse'), 280);
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
            
            // Show score improvement popup: "+Δ (was X → now Y)"
            const diff = finalScore - oldScore;
            createScoreComparePopup(word, oldScore, finalScore, diff);
            gameState.wordsFound.set(word, finalScore);
            gameState.score += diff;
            
            // Track longest word
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
            // Normal duplicate – flash purple with score reminder
            flashTiles('flash-duplicate');
            elements.currentWordElement.style.animation = 'shakeDuplicate 0.5s ease';
            elements.currentWordElement.style.color = '#8b5cf6';
            if (gameState.soundEnabled) soundManager.playWordDuplicate();
            // Show reminder of the score already banked
            createDuplicateReminderPopup(word, oldScore, gameState.powerupsEnabled ? finalScore : null);
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
        burstTrail(false);
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
    
    // Trail burst before clearing
    burstTrail(true);
    
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
    
    // Show word score popup
    createWordScorePopup(word, finalScore, 'valid');
    
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
        // Clear heat
        elements.board.classList.remove('combo-heat-2','combo-heat-3','combo-heat-5');
        return;
    }
    let comboEl = document.getElementById('combo-meter');
    if (!comboEl) {
        comboEl = document.createElement('div');
        comboEl.id = 'combo-meter';
        elements.topBar.appendChild(comboEl);
    }

    // Update board heat class
    const board = elements.board;
    board.classList.remove('combo-heat-2','combo-heat-3','combo-heat-5');

    if (gameState.combo >= 5) {
        board.classList.add('combo-heat-5');
        comboEl.innerHTML = `<span class="combo-fire">🔥🔥</span> <span class="combo-count">×${gameState.comboMultiplier.toFixed(1)}</span><span class="combo-streak">${gameState.combo} streak</span>`;
        comboEl.className = 'combo-active combo-inferno';
    } else if (gameState.combo >= 3) {
        board.classList.add('combo-heat-3');
        comboEl.innerHTML = `<span class="combo-fire">🔥</span> <span class="combo-count">×${gameState.comboMultiplier.toFixed(1)}</span><span class="combo-streak">${gameState.combo} streak</span>`;
        comboEl.className = 'combo-active combo-hot';
    } else if (gameState.combo >= 2) {
        board.classList.add('combo-heat-2');
        comboEl.innerHTML = `🔥 Combo <span class="combo-count">×${gameState.comboMultiplier.toFixed(1)}</span>`;
        comboEl.className = 'combo-active';
    } else {
        comboEl.textContent = '';
        comboEl.className   = '';
    }

    comboEl.style.display = gameState.combo >= 2 ? 'block' : 'none';
}

// ==================== POWER-UPS (continued) ====================

// ==================== PATH DRAWING UTILITY ====================
// Draws a numbered, arrowed connection path on a canvas overlay.
// orderedIndices: tile index array in traversal order
// boardEl: the board/summary-board div (used to locate tiles by data-index)
// canvasEl: the overlay <canvas> (must be sized/positioned over boardEl)
function drawPathOnCanvas(orderedIndices, boardEl, canvasEl) {
    if (!canvasEl || !boardEl || !orderedIndices.length) return;

    // Size canvas to match its CSS size
    const wrap = canvasEl.parentElement;
    const wr   = wrap.getBoundingClientRect();
    canvasEl.width  = Math.round(wr.width);
    canvasEl.height = Math.round(wr.height);

    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Collect tile data relative to the canvas wrapper
    const pts = orderedIndices.map(idx => {
        const tileEl = boardEl.querySelector(`.tile[data-index="${idx}"]`);
        if (!tileEl) return null;
        const tr = tileEl.getBoundingClientRect();
        const cx = tr.left - wr.left + tr.width  / 2;
        const cy = tr.top  - wr.top  + tr.height / 2;
        const hw = tr.width / 2;  // half-tile width
        return { x: cx, y: cy, hw };
    }).filter(Boolean);

    if (pts.length < 1) return;

    const col = canvasEl._pathColour || { h: 42, s: 95, l: 58 };
    const hue = col.h, sat = col.s, lig = col.l;

    // ── 1. Draw thick glow line along the full path (bezier through mid-points) ──
    if (pts.length > 1) {
        // Build a smooth path through tile centres
        const buildSmoothPath = (p) => {
            ctx.beginPath();
            ctx.moveTo(p[0].x, p[0].y);
            for (let i = 0; i < p.length - 1; i++) {
                const mx = (p[i].x + p[i+1].x) / 2;
                const my = (p[i].y + p[i+1].y) / 2;
                ctx.quadraticCurveTo(p[i].x, p[i].y, mx, my);
            }
            ctx.lineTo(p[p.length-1].x, p[p.length-1].y);
        };

        // Outer glow
        buildSmoothPath(pts);
        ctx.lineWidth   = 14;
        ctx.strokeStyle = `hsla(${hue},${sat}%,${lig}%,0.18)`;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.stroke();

        // Mid glow
        buildSmoothPath(pts);
        ctx.lineWidth   = 7;
        ctx.strokeStyle = `hsla(${hue},${sat}%,${lig+15}%,0.40)`;
        ctx.stroke();

        // Core line
        buildSmoothPath(pts);
        ctx.lineWidth   = 3;
        ctx.strokeStyle = `hsla(${hue},${sat}%,${lig+25}%,0.92)`;
        ctx.stroke();

        // ── 2. Draw arrowheads mid-segment (not at endpoint — badge covers it) ──
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i+1];
            // Arrow drawn at 60% of the way from a→b so it's clear of both badges
            const tx = a.x + (b.x - a.x) * 0.60;
            const ty = a.y + (b.y - a.y) * 0.60;
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            const ahLen = Math.max(10, pts[0].hw * 0.55);
            const spread = 0.40;

            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - ahLen * Math.cos(ang - spread),
                       ty - ahLen * Math.sin(ang - spread));
            ctx.lineTo(tx - ahLen * Math.cos(ang + spread),
                       ty - ahLen * Math.sin(ang + spread));
            ctx.closePath();
            ctx.fillStyle = `hsla(${hue},${sat}%,${lig+20}%,0.95)`;
            ctx.fill();
        }
    }

    // ── 3. Draw step-number badges at CORNER of each tile (top-left offset) ──
    // Badge sits in the top-left quadrant of the tile so the letter stays readable.
    const badgeR  = Math.max(11, Math.round(pts[0].hw * 0.40));  // radius scales with tile
    const offsetX = -pts[0].hw * 0.52;  // left of centre
    const offsetY = -pts[0].hw * 0.52;  // above centre

    pts.forEach((pt, i) => {
        const bx = pt.x + offsetX;
        const by = pt.y + offsetY;
        const isLast = i === pts.length - 1;

        // Backdrop shadow for legibility on any background
        ctx.beginPath();
        ctx.arc(bx, by, badgeR + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();

        // Badge fill — brighter for the last tile
        const lAdj = isLast ? lig + 18 : lig;
        const grad = ctx.createRadialGradient(bx, by - 1, 0, bx, by, badgeR);
        grad.addColorStop(0, `hsla(${hue},${sat}%,${lAdj + 22}%,1)`);
        grad.addColorStop(1, `hsla(${hue},${sat}%,${lAdj}%,1)`);
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Badge border — extra ring on the last tile
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.strokeStyle = isLast
            ? `hsla(${hue},${sat}%,${lig + 40}%,0.9)`
            : `hsla(${hue},${sat}%,${lig + 25}%,0.65)`;
        ctx.lineWidth = isLast ? 2.5 : 1.5;
        ctx.stroke();

        // Step number
        const fontSize = Math.max(9, Math.round(badgeR * 1.05));
        ctx.font         = `800 ${fontSize}px system-ui,sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#0c0f1a';
        ctx.fillText(String(i + 1), bx, by + 0.5);
    });
}

function clearPathCanvas(canvasEl) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}

function clearHint() {
    clearPathCanvas(document.getElementById('hint-overlay-canvas'));
    if (gameState.hintedPath.length) {
        gameState.hintedPath.forEach(idx => {
            const tile = document.querySelector(`.tile[data-index="${idx}"]`);
            if (tile) {
                tile.classList.remove('hint-persistent');
                delete tile.dataset.hintOrder;
            }
        });
    }
    gameState.hintedWord = null;
    gameState.hintedPath = [];
}

function useHint() {
    // In learner mode hints are always free and unlimited
    const free = gameState.learnerMode;
    if (!gameState.isPlaying || (!free && gameState.powerups.hint === 0)) return;
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
    path.forEach((idx, step) => {
        const tileEl = document.querySelector(`.tile[data-index="${idx}"]`);
        if (tileEl) {
            tileEl.classList.add('hint-persistent');
            tileEl.dataset.hintOrder = step + 1;
        }
    });
    // Draw numbered directional path on canvas overlay
    requestAnimationFrame(() => {
        const canvas = document.getElementById('hint-overlay-canvas');
        const board  = document.getElementById('board');
        if (canvas && board) {
            canvas._pathColour = { h: 42, s: 95, l: 58 };  // amber
            drawPathOnCanvas(path, board, canvas);
        }
    });

    // Briefly show the word
    elements.currentWordElement.textContent = word;
    elements.currentWordElement.style.color = '#fbbf24';
    setTimeout(() => {
        elements.currentWordElement.textContent = gameState.currentWord;
        elements.currentWordElement.style.color = '';
    }, 2000);

    if (!free) {
        gameState.powerups.hint--;
        gameState.powerupsUsed.hint++;
        updatePowerupTiles();
    }
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
async function analyzeBoardAsync() {
    console.time('findAllPossibleWords');
    gameState.allPossibleWords = await findAllPossibleWords();
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
    stopSessionSave();
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

    // Learner mode: never save a high score
    if (gameState.learnerMode) {
        elements.newRecordBadge.style.display = 'none';
        // Show a "Learner Mode" badge instead
        let lbadge = document.getElementById('learner-mode-badge');
        if (!lbadge) {
            lbadge = document.createElement('div');
            lbadge.id = 'learner-mode-badge';
            lbadge.className = 'learner-badge';
            lbadge.innerHTML = '<i class="fas fa-graduation-cap"></i> Learner Mode — score not saved';
            elements.finalScoreElement.parentNode.appendChild(lbadge);
        }
        lbadge.style.display = 'block';
        if (gameState.isEndlessMode) {
            elements.bestScoreElement.textContent = currentHighScore || '0%';
        } else {
            elements.bestScoreElement.textContent = parseInt(currentHighScore) || 0;
        }
    } else {
        const lbadge = document.getElementById('learner-mode-badge');
        if (lbadge) lbadge.style.display = 'none';

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
    }
    
    loadHighScores();

    // Show appropriate summary based on power-ups enabled or learner mode
    if (gameState.powerupsEnabled || gameState.learnerMode) {
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

        // Render longest-possible word on final board state
        renderPowerupSummaryBoard();

        // List ALL possible words — wait for board analysis if still running
        renderAllWordsWhenReady();
    } else {
        // Show classic summary
        document.querySelector('.summary-board-section').style.display = 'block';
        document.querySelector('.results-container').style.display = 'block';
        elements.powerupSummary.style.display = 'none';
        
        renderUnifiedResultsWhenReady();
        renderSummaryBoard();
    }
}

// Populate the all-possible-words list, retrying until analysis is complete
function renderAllWordsWhenReady() {
    if (gameState.analysisComplete) {
        _populateAllWordsList();
    } else {
        if (elements.foundWordsList) {
            elements.foundWordsList.innerHTML =
                '<span style="color:#94a3b8;font-size:0.85rem;padding:8px;">Analysing board…</span>';
        }
        const poll = setInterval(() => {
            if (gameState.analysisComplete) {
                clearInterval(poll);
                _populateAllWordsList();
                // Also refresh the longest-word board now analysis is done
                renderPowerupSummaryBoard();
            }
        }, 300);
    }
}

function _populateAllWordsList() {
    if (!elements.foundWordsList) return;
    const allPossible = Array.from(gameState.allPossibleWords.keys())
        .sort((a, b) => b.length - a.length || a.localeCompare(b));
    const foundSet = new Set(gameState.wordsFound.keys());
    if (!allPossible.length) {
        elements.foundWordsList.innerHTML =
            '<span style="color:#64748b;font-size:0.85rem;">No scoreable words found on this board.</span>';
        return;
    }
    elements.foundWordsList.innerHTML = allPossible.map(word => {
        const isFound = foundSet.has(word);
        return `<span class="word-pill ${isFound ? 'found' : 'missed'}"
                      title="${isFound ? 'Found ✓' : 'Not found'}">${word}</span>`;
    }).join('');
}

// Classic mode word list — also waits for analysis
function renderUnifiedResultsWhenReady() {
    if (gameState.analysisComplete) {
        renderUnifiedResults();
    } else {
        const container = document.getElementById('results-grid');
        if (container) {
            container.innerHTML =
                '<p style="color:#94a3b8;text-align:center;padding:20px;">Analysing board…</p>';
        }
        const poll = setInterval(() => {
            if (gameState.analysisComplete) {
                clearInterval(poll);
                renderUnifiedResults();
                renderSummaryBoard();
            }
        }, 300);
    }
}

function renderSummaryBoard() {
    if (!elements.summaryBoard) return;
    
    elements.summaryBoard.innerHTML = '';
    elements.summaryBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    
    const longestPathIndices = new Set(gameState.longestWordPath.map(tile => tile.index));
    const longestPathOrder = new Map(gameState.longestWordPath.map((t, i) => [t.index, i + 1]));
    
    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = index;
        if (longestPathIndices.has(index)) {
            tile.classList.add('highlight-longest');
            tile.dataset.hintOrder = longestPathOrder.get(index);
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

    // Draw numbered directional path over the highlighted tiles
    if (gameState.longestWordPath.length) {
        requestAnimationFrame(() => {
            const canvas = document.getElementById('summary-path-canvas');
            if (canvas) {
                canvas._pathColour = { h: 42, s: 90, l: 55 };
                drawPathOnCanvas(
                    gameState.longestWordPath.map(t => t.index),
                    elements.summaryBoard,
                    canvas
                );
            }
        });
    }
}

// Render the final board with the longest-possible word highlighted — for power-up mode summary
function renderPowerupSummaryBoard() {
    const boardEl = elements.powerupSummaryBoard;
    const labelEl = elements.powerupLongestWordLabel;
    if (!boardEl) return;

    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;

    const longestPathIndices = new Set(gameState.longestWordPath.map(t => t.index));
    const longestPathOrder = new Map(gameState.longestWordPath.map((t, i) => [t.index, i + 1]));

    gameState.board.forEach((letter, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = index;
        if (longestPathIndices.has(index)) {
            tile.classList.add('highlight-longest');
            tile.dataset.hintOrder = longestPathOrder.get(index);
        }

        const content = document.createElement('div');
        content.className = 'tile-content';
        content.textContent = letter;
        tile.appendChild(content);

        boardEl.appendChild(tile);
    });

    if (labelEl) labelEl.textContent = gameState.longestWord || '—';

    // If no longest word yet (analysis still running), show a placeholder and retry
    if (!gameState.longestWord) {
        if (labelEl) labelEl.textContent = 'Calculating…';
        const retry = setInterval(() => {
            if (gameState.longestWord) {
                clearInterval(retry);
                renderPowerupSummaryBoard();
            }
        }, 200);
    } else if (gameState.longestWordPath.length) {
        // Draw numbered directional path over the highlighted tiles
        requestAnimationFrame(() => {
            const canvas = document.getElementById('powerup-summary-path-canvas');
            if (canvas) {
                canvas._pathColour = { h: 42, s: 90, l: 55 };
                drawPathOnCanvas(
                    gameState.longestWordPath.map(t => t.index),
                    boardEl,
                    canvas
                );
            }
        });
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

// ==================== VISIBILITY CHANGE — PAUSE TIMER ====================
let _timerPaused = false;
let _tabHiddenAt = 0;

document.addEventListener('visibilitychange', () => {
    if (!gameState.isPlaying || gameState.isEndlessMode) return;

    if (document.hidden) {
        // Tab going to background — pause the countdown
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
            _timerPaused = true;
            _tabHiddenAt = Date.now();
            saveSessionState(); // snapshot before backgrounding
        }
    } else if (_timerPaused) {
        // Tab coming back — resume from where we left off
        _timerPaused = false;
        // Show a brief "PAUSED" flash to acknowledge the resume
        const flash = document.createElement('div');
        flash.textContent = '▶ Resumed';
        flash.style.cssText = `
            position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
            z-index:20000; background:rgba(15,23,42,0.9); color:#10b981;
            font-size:1.4rem; font-weight:800; padding:12px 28px;
            border-radius:12px; pointer-events:none;
            animation:fadeUp 1s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1000);

        // Restart the interval — timeLeft was already decremented before pause
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
});

// ==================== START THE GAME ====================
document.addEventListener('DOMContentLoaded', () => {
    switchScreen('loading-screen');
    setTimeout(initializeGame, 500);
});

// Helper to get top-bar element (used in updateComboDisplay)
Object.defineProperty(elements, 'topBar', {
    get: () => document.getElementById('top-bar')
});