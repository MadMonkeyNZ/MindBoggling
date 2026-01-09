// audio.js - Enhanced Audio System
// UI Sounds: Web Audio API with dynamic pitch scaling
// Background Music: MP3 files

let currentMusic = null;
let musicVolume = 0.2;  // 20% default
let uiVolume = 0.7;
let isGamePlaying = false;

// Audio Context for UI sounds
let audioContext = null;

// Audio settings
const SOUND_SETTINGS = {
    // Base frequencies for different sound types
    good: { baseFreq: 800, type: 'sine' },
    bad: { baseFreq: 300, type: 'sawtooth' },
    warning: { baseFreq: 500, type: 'square' },
    better: { baseFreq: 700, type: 'sine' },
    repeat: { baseFreq: 400, type: 'triangle' },
    
    // Linking sound parameters
    link: {
        baseFreq: 400,           // Starting frequency for 3-letter words
        minFreq: 300,           // Minimum frequency
        maxFreq: 1200,          // Maximum frequency
        minLength: 3,           // Minimum word length to trigger linking sound
        maxLength: 12,          // Maximum word length for frequency scaling
        duration: 0.15,         // Duration of each linking beep
        type: 'sine'
    }
};

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("Audio Context initialized");
        } catch (e) {
            console.error("Failed to initialize Audio Context:", e);
        }
    }
}

// Set music volume (0.0 to 1.0)
function setMusicVolume(volume) {
    musicVolume = Math.max(0, Math.min(1, volume));
    console.log(`Setting music volume to: ${musicVolume} (${Math.round(musicVolume * 100)}%)`);
    
    if (currentMusic) {
        currentMusic.volume = musicVolume;
    }
    
    if (window.config) {
        window.config.musicVolume = musicVolume;
    }
}

// Set UI/sound effects volume (0.0 to 1.0)
function setUIVolume(volume) {
    const oldVolume = uiVolume;
    uiVolume = Math.max(0, Math.min(1, volume));
    console.log(`Setting UI volume to: ${uiVolume} (${Math.round(uiVolume * 100)}%)`);
    
    if (window.config) {
        window.config.uiVolume = uiVolume;
    }
}

// Calculate dynamic frequency for linking sounds
function calculateLinkFrequency(pathLength) {
    const { minFreq, maxFreq, baseFreq, minLength, maxLength } = SOUND_SETTINGS.link;
    
    // Ensure pathLength is within bounds
    const clampedLength = Math.max(minLength, Math.min(pathLength, maxLength));
    
    // Calculate frequency scaling
    if (clampedLength <= minLength) {
        return baseFreq;
    }
    
    // Exponential scaling for more musical progression
    const progress = (clampedLength - minLength) / (maxLength - minLength);
    
    // Use exponential scaling for more natural pitch progression
    // This gives us a more musical, pleasing increase in pitch
    const frequency = minFreq * Math.pow(2, progress * 2); // 2 octaves range
    
    // Clamp to max frequency
    return Math.min(frequency, maxFreq);
}

// Play linking sound with dynamic pitch
function playLinkSound(pathLength) {
    if (uiVolume <= 0 || pathLength < SOUND_SETTINGS.link.minLength) return;
    
    // Initialize audio context if needed
    if (!audioContext) {
        initAudioContext();
    }
    
    if (!audioContext) {
        console.error("Audio Context not available");
        return;
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Calculate dynamic frequency based on word length
        const frequency = calculateLinkFrequency(pathLength);
        
        oscillator.frequency.value = frequency;
        oscillator.type = SOUND_SETTINGS.link.type;
        
        // Create a more interesting envelope for linking sounds
        const now = audioContext.currentTime;
        const duration = SOUND_SETTINGS.link.duration;
        
        // Attack-decay envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(uiVolume * 0.4, now + 0.02); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Gentle decay
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        // Add a subtle harmonic for richer sound on longer words
        if (pathLength >= 6) {
            setTimeout(() => {
                try {
                    const harmonic = audioContext.createOscillator();
                    const harmonicGain = audioContext.createGain();
                    
                    harmonic.connect(harmonicGain);
                    harmonicGain.connect(audioContext.destination);
                    
                    harmonic.frequency.value = frequency * 1.5; // Perfect fifth above
                    harmonic.type = SOUND_SETTINGS.link.type;
                    
                    const harmonicNow = audioContext.currentTime;
                    harmonicGain.gain.setValueAtTime(0, harmonicNow);
                    harmonicGain.gain.linearRampToValueAtTime(uiVolume * 0.2, harmonicNow + 0.01);
                    harmonicGain.gain.exponentialRampToValueAtTime(0.01, harmonicNow + duration * 0.8);
                    
                    harmonic.start(harmonicNow);
                    harmonic.stop(harmonicNow + duration * 0.8);
                } catch (e) {
                    // Silent fail for harmonic
                }
            }, 10);
        }
        
    } catch (error) {
        console.error("Error playing link sound:", error);
    }
}

// Play music track (using MP3 files)
function playMusic(track) {
    console.log(`Playing music: ${track}`);
    
    // Don't restart if the same track is already playing
    if (currentMusic && 
        currentMusic.id === 'music-' + track && 
        !currentMusic.paused &&
        Math.abs(currentMusic.currentTime) > 0.1) {
        console.log(`Track ${track} is already playing, skipping restart.`);
        return;
    }
    
    // Stop current music if playing (and it's a different track)
    if (currentMusic && currentMusic.id !== 'music-' + track) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }
    
    const audioElement = document.getElementById('music-' + track);
    
    if (audioElement) {
        audioElement.volume = musicVolume;
        audioElement.loop = track !== 'summary';
        
        // Only play if not already playing or it's a different track
        if (audioElement.paused || currentMusic?.id !== 'music-' + track) {
            const playPromise = audioElement.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`Music playing: ${track} at ${Math.round(musicVolume * 100)}%`);
                    currentMusic = audioElement;
                }).catch(error => {
                    console.error(`Music failed: ${track}`, error);
                    if (track !== 'game1') {
                        playMusic('game1');
                    }
                });
            }
        } else {
            console.log(`Track ${track} is already playing, keeping it running.`);
            currentMusic = audioElement;
        }
    } else {
        console.error(`Music element not found: ${track}`);
        if (track !== 'game1') {
            playMusic('game1');
        }
    }
}

// Stop current music
function stopMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
        currentMusic = null;
    }
}

// Play UI sound effect
function playSound(type) {
    if (uiVolume <= 0) return;
    
    if (!audioContext) {
        initAudioContext();
    }
    
    if (!audioContext) {
        console.error("Audio Context not available");
        return;
    }
    
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
        console.error("Error playing sound:", error);
    }
}

// Set game track (game1 or game2)
function setGameTrack(track) {
    if (window.config) {
        window.config.musicTrack = track;
    }
  
    document.querySelectorAll('.music-type-btn').forEach(btn => {
        if (btn.dataset.track === track) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
  
    if (!isGamePlaying && typeof playMusic === 'function') {
        playMusic(track);
    }
}

// Update music volume for current track
function updateMusicVolume() {
    if (currentMusic) {
        currentMusic.volume = musicVolume;
    }
}

// Play a test sound to verify audio is working
function playTestSound() {
    console.log("Playing test sound...");
    
    // Play a rising scale to demonstrate the linking sound progression
    if (!audioContext) {
        initAudioContext();
    }
    
    if (audioContext) {
        // Play a sequence of linking sounds from 3 to 8 letters
        for (let i = 3; i <= 8; i++) {
            setTimeout(() => {
                playLinkSound(i);
            }, i * 200);
        }
    }
}

// Initialize audio system
function initAudio() {
    console.log("Initializing audio system...");
    
    document.addEventListener('click', function initOnClick() {
        initAudioContext();
        document.removeEventListener('click', initOnClick);
    }, { once: true });
    
    const savedConfig = localStorage.getItem('boggle_cfg');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            if (config.musicVolume !== undefined) {
                setMusicVolume(config.musicVolume);
            }
            if (config.uiVolume !== undefined) {
                setUIVolume(config.uiVolume);
            }
            if (config.musicTrack !== undefined) {
                setGameTrack(config.musicTrack);
            }
        } catch (e) {
            console.error("Error loading audio settings:", e);
        }
    } else {
        console.log("Using default audio settings");
    }
    
    console.log("Audio system initialized");
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded, initializing audio...");
    
    setTimeout(() => {
        initAudio();
        
        // Make functions globally available
        window.playMusic = playMusic;
        window.stopMusic = stopMusic;
        window.playSound = playSound;
        window.playLinkSound = playLinkSound;
        window.setMusicVolume = setMusicVolume;
        window.setUIVolume = setUIVolume;
        window.setGameTrack = setGameTrack;
        window.updateMusicVolume = updateMusicVolume;
        window.playTestSound = playTestSound;
        window.isGamePlaying = isGamePlaying;
        
        console.log("Audio system ready");
    }, 300);
});