// audio.js - Enhanced Audio System with improved sound feedback
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
    // Base frequencies for different sound types
    good: { baseFreq: 800, type: 'sine' },
    bad: { baseFreq: 300, type: 'sawtooth' },
    warning: { baseFreq: 500, type: 'square' },
    better: { baseFreq: 700, type: 'sine' },
    repeat: { baseFreq: 400, type: 'triangle' },

    // IMPROVED linking sound parameters - more satisfying and musical
    link: {
        baseFreq: 350,
        minFreq: 350,
        maxFreq: 1400,
        minLength: 2,
        maxLength: 12,
        duration: 0.25, // Longer duration for better feel
        type: 'sine',
        // New: Harmonic ratios for richer sound
        harmonics: [
            { ratio: 1.0, gain: 1.0 }, // Fundamental
            { ratio: 1.5, gain: 0.6 }, // Perfect fifth
            { ratio: 2.0, gain: 0.4 }, // Octave
            { ratio: 2.5, gain: 0.3 }  // Major third + octave
        ]
    }
};

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("✅ Audio Context initialized successfully");

            // Resume audio context if suspended
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

        audio.addEventListener('canplaythrough', () => {
            resolve(true);
        });

        audio.addEventListener('error', () => {
            resolve(false);
        });

        setTimeout(() => {
            resolve(false);
        }, 1000);
    });
}

// Discover available music tracks from audio folder
async function discoverMusicTracks() {
    console.log("🔍 Discovering music tracks...");

    const trackPatterns = [
        'game1.mp3', 'game2.mp3', 'game3.mp3', 'game4.mp3', 'game5.mp3',
        'game6.mp3', 'game7.mp3', 'game8.mp3', 'game9.mp3', 'summary-music.mp3'
    ];

    musicTracks = [];
    let foundTracks = 0;

    console.log("Testing each track pattern...");

    for (const pattern of trackPatterns) {
        const filePath = `audio/${pattern}`;
        console.log(`  Testing: ${pattern}...`);

        const exists = await testAudioFile(filePath);

        if (exists) {
            const name = pattern.replace('.mp3', '')
                .replace(/(\d+)/, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace(/([A-Z])/g, ' $1')
                .replace(/\s+/g, ' ')
                .trim();

            const trackId = pattern.replace('.mp3', '');

            if (!musicTracks.some(track => track.id === trackId)) {
                musicTracks.push({
                    id: trackId,
                    name: name,
                    file: filePath,
                    type: trackId.includes('summary') ? 'summary' : 'game'
                });
                foundTracks++;
                console.log(`    ✓ Found: ${trackId} (${name})`);
            }
        }
    }

    console.log(`Found ${foundTracks} music tracks`);

    // Create playlist (excluding summary music for sequential play)
    musicPlaylist = musicTracks.filter(track => track.type === 'game');
    
    // Update global reference
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
    
    // Update play/pause buttons
    if (playBtn) {
        const icon = playBtn.querySelector('.btn-icon');
        if (icon) {
            icon.textContent = isMusicPaused || !isMusicPlaying ? '▶️' : '⏸️';
        }
    }
    if (gamePlayBtn) {
        const icon = gamePlayBtn.querySelector('.btn-icon');
        if (icon) {
            icon.textContent = isMusicPaused || !isMusicPlaying ? '▶️' : '⏸️';
        }
    }
    
    // Update track names
    const currentTrackId = getCurrentTrackId();
    if (currentTrackId && musicTracks) {
        const track = musicTracks.find(t => t.id === currentTrackId);
        if (track) {
            if (trackNameElement) {
                trackNameElement.textContent = track.name;
            }
            if (gameTrackNameElement) {
                gameTrackNameElement.textContent = track.name;
            }
        }
    }
    
    // Update mode display
    const modeElement = document.getElementById('track-mode');
    if (modeElement) {
        if (window.config && window.config.musicTrack === 'random') {
            modeElement.textContent = 'Random Play';
        } else if (window.config && window.config.musicTrack) {
            const track = musicTracks.find(t => t.id === window.config.musicTrack);
            modeElement.textContent = track ? track.name : 'Single Track';
        } else {
            modeElement.textContent = 'Sequential Play';
        }
    }
};

// Check if music should be playing (for game screens)
function shouldPlayGameMusic() {
    // Only play game music on game screens, not on summary screen
    const activeScreen = document.querySelector('.screen.active');
    return activeScreen && 
           (activeScreen.id === 'game-ui' || activeScreen.id === 'main-menu');
}

// Play music track with continuity
function playMusic(trackId, forceRestart = false) {
    console.log(`🎵 Requested to play music: ${trackId}, forceRestart: ${forceRestart}`);
    
    // If trying to play the same track that's already playing and not forced to restart
    if (currentMusic && 
        currentMusic.src && 
        currentMusic.src.includes(trackId) && 
        !forceRestart &&
        trackId !== 'summary') {
        
        console.log(`🎵 ${trackId} is already playing, continuing...`);
        
        // If it's paused, resume it
        if (isMusicPaused) {
            currentMusic.play().then(() => {
                isMusicPaused = false;
                isMusicPlaying = true;
                updateMusicUI();
                console.log("▶️ Resumed existing track");
            }).catch(error => {
                console.error("❌ Failed to resume music:", error);
            });
        }
        return;
    }

    // If it's a summary track and we're not on a summary screen, don't play it
    if (trackId === 'summary' && shouldPlayGameMusic()) {
        console.log("🎵 Not playing summary music on game screen");
        return;
    }

    // Save the state of current music before changing (only if not already saved)
    if (currentMusic && currentMusic.id !== 'summary-music-track' && !pausedMusicState.audioElement) {
        pausedMusicState = {
            trackId: getCurrentTrackId(),
            currentTime: currentMusic.currentTime,
            paused: isMusicPaused,
            audioElement: currentMusic
        };
        console.log(`💾 Saved music state: ${pausedMusicState.trackId} at ${pausedMusicState.currentTime}s`);
    }

    // Stop any currently playing music
    if (currentMusic) {
        stopMusic();
    }

    // Don't play if volume is 0
    if (musicVolume <= 0) {
        console.log("🔇 Music volume is 0, skipping playback");
        isMusicPlaying = false;
        isMusicPaused = false;
        updateMusicUI();
        return;
    }

    // If trackId is 'random', pick a random game track
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

    // Find the track
    let track = validTracks.find(t => t.id === actualTrackId);
    
    // If track not found, use first available
    if (!track) {
        track = validTracks[0];
        console.log(`Track not found, using: ${track.id}`);
    }
    
    // Update current track index for game tracks
    if (track.type === 'game') {
        currentTrackIndex = musicPlaylist.findIndex(t => t.id === track.id);
    }

    console.log(`🎵 Loading track: ${track.name} (${track.file})`);

    // Create new audio element
    const audioElement = new Audio();
    
    // Set IDs for easy identification
    if (track.type === 'summary') {
        audioElement.id = 'summary-music-track';
    } else {
        audioElement.id = 'game-music-track';
    }
    
    audioElement.src = track.file;
    audioElement.preload = 'auto';
    audioElement.volume = musicVolume;
    
    // Set loop based on track type and mode
    if (track.type === 'summary') {
        audioElement.loop = false; // Summary music should not loop
    } else {
        audioElement.loop = (window.config && window.config.musicTrack !== 'random');
    }

    // Add event listeners
    audioElement.addEventListener('play', () => {
        console.log(`▶️ Music started playing: ${track.name}`);
        isMusicPlaying = true;
        isMusicPaused = false;
        updateMusicUI();
    });

    audioElement.addEventListener('ended', () => {
        console.log(`⏹️ Music ended: ${track.name}`);
        
        if (track.type === 'summary') {
            // Summary music ended - resume game music if applicable
            console.log("🎵 Summary music ended");
            
            // If we're still on the summary screen, don't auto-resume
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen && activeScreen.id === 'game-over') {
                console.log("🎵 Still on summary screen, not resuming game music");
                return;
            }
            
            // Resume previous music
            resumePreviousMusic();
        } else if (window.config && window.config.musicTrack === 'random') {
            // If in random mode, play next random track
            setTimeout(() => {
                playNextTrack();
            }, 1000);
        } else if (audioElement.loop) {
            console.log(`🔁 Looping track: ${track.name}`);
        } else {
            // If sequential mode, play next track
            playNextTrack();
        }
    });

    audioElement.addEventListener('error', (e) => {
        console.error(`❌ Music playback error for ${track.id}:`, e.target.error);
        
        // Try to play another track if this one fails
        if (track.type !== 'summary') {
            playNextTrack();
        } else {
            // If summary music fails, resume previous music
            resumePreviousMusic();
        }
    });

    // Try to play the audio
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log(`🎵 Successfully playing: ${track.name} at ${Math.round(musicVolume * 100)}% volume`);
            currentMusic = audioElement;
            isMusicPlaying = true;
            isMusicPaused = false;
            updateMusicUI();
        }).catch(error => {
            console.error(`❌ Failed to play music: ${track.id}`, error);
            isMusicPlaying = false;
            updateMusicUI();
        });
    }

    // Store reference to audio element
    currentMusic = audioElement;
}

// Get current track ID from audio element
window.getCurrentTrackId = function() {
    if (!currentMusic || !currentMusic.src) return null;
    
    const src = currentMusic.src;
    const track = musicTracks.find(t => src.includes(t.file));
    return track ? track.id : null;
}

// Get current track name
window.getCurrentTrackName = function() {
    const trackId = getCurrentTrackId();
    if (!trackId) return 'No Track';
    
    const track = musicTracks.find(t => t.id === trackId);
    return track ? track.name : 'Unknown Track';
}

// Resume previously playing music
function resumePreviousMusic() {
    console.log("🎵 Attempting to resume previous music...");
    
    if (pausedMusicState.trackId && pausedMusicState.audioElement) {
        console.log(`🎵 Resuming ${pausedMusicState.trackId} from ${pausedMusicState.currentTime}s`);
        
        // Don't resume if we're on the summary screen
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id === 'game-over') {
            console.log("🎵 Still on summary screen, not resuming");
            return;
        }
        
        // Check if we should be playing game music
        if (!shouldPlayGameMusic()) {
            console.log("🎵 Not on a game screen, not resuming");
            return;
        }
        
        // Play the track from where it left off
        const trackToResume = pausedMusicState.trackId;
        const resumeTime = pausedMusicState.currentTime;
        
        playMusic(trackToResume, true);
        
        // Seek to the saved position after a short delay
        setTimeout(() => {
            if (currentMusic && currentMusic.readyState > 0) {
                currentMusic.currentTime = resumeTime;
                console.log(`🎵 Seeking to ${resumeTime}s`);
            }
        }, 100);
        
        // Clear the saved state
        pausedMusicState = {
            trackId: null,
            currentTime: 0,
            paused: false,
            audioElement: null
        };
    } else {
        console.log("🎵 No previous music state to resume");
        
        // Start default game music
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && shouldPlayGameMusic()) {
            const trackToPlay = window.config && window.config.musicTrack === 'random' ? 
                'random' : (window.config ? window.config.musicTrack : 'game1');
            playMusic(trackToPlay);
        }
    }
}

// Play next track
window.playNextTrack = function() {
    if (musicPlaylist.length === 0) {
        console.log("No tracks in playlist");
        return;
    }

    // If music is paused, resume it first
    if (isMusicPaused && currentMusic) {
        toggleMusicPlayback();
        return;
    }

    // Calculate next index
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= musicPlaylist.length) {
        nextIndex = 0; // Loop back to start
    }

    // Get next track
    const nextTrack = musicPlaylist[nextIndex];
    if (nextTrack) {
        console.log(`⏭️ Playing next track: ${nextTrack.id}`);
        playMusic(nextTrack.id);
    }
}

// Play previous track
window.playPreviousTrack = function() {
    if (musicPlaylist.length === 0) {
        console.log("No tracks in playlist");
        return;
    }

    // If music is paused, resume it first
    if (isMusicPaused && currentMusic) {
        toggleMusicPlayback();
        return;
    }

    // Calculate previous index
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
        prevIndex = musicPlaylist.length - 1; // Loop to end
    }

    // Get previous track
    const prevTrack = musicPlaylist[prevIndex];
    if (prevTrack) {
        console.log(`⏮️ Playing previous track: ${prevTrack.id}`);
        playMusic(prevTrack.id);
    }
}

// Toggle music play/pause
window.toggleMusicPlayback = function() {
    console.log("🎵 Toggling music playback");
    
    if (!currentMusic) {
        // If no music is playing, start with current track or random
        const trackToPlay = window.config && window.config.musicTrack === 'random' ? 
            'random' : (window.config ? window.config.musicTrack : 'game1');
        playMusic(trackToPlay);
        return;
    }

    if (isMusicPaused) {
        // Resume playback
        currentMusic.play().then(() => {
            isMusicPaused = false;
            isMusicPlaying = true;
            updateMusicUI();
            console.log("▶️ Music resumed");
        }).catch(error => {
            console.error("❌ Failed to resume music:", error);
        });
    } else {
        // Pause playback
        currentMusic.pause();
        isMusicPaused = true;
        isMusicPlaying = false;
        updateMusicUI();
        console.log("⏸️ Music paused");
    }
}

// Stop current music
function stopMusic() {
    if (currentMusic) {
        console.log("⏹️ Stopping current music");
        
        // Don't save state for summary music
        if (currentMusic.id !== 'summary-music-track') {
            pausedMusicState = {
                trackId: getCurrentTrackId(),
                currentTime: currentMusic.currentTime,
                paused: isMusicPaused,
                audioElement: currentMusic
            };
            console.log(`💾 Saved music state before stopping: ${pausedMusicState.trackId}`);
        }
        
        currentMusic.pause();
        currentMusic.currentTime = 0;
        
        // Remove event listeners
        currentMusic.onplay = null;
        currentMusic.onended = null;
        currentMusic.onerror = null;
        currentMusic.oncanplaythrough = null;
        
        currentMusic = null;
        isMusicPlaying = false;
        isMusicPaused = false;
        updateMusicUI();
    }
}

// Set music volume (0.0 to 1.0)
window.setMusicVolume = function(volume) {
    const newVolume = Math.max(0, Math.min(1, volume));
    console.log(`🔊 Setting music volume to: ${newVolume} (${Math.round(newVolume * 100)}%)`);
    
    musicVolume = newVolume;
    
    if (currentMusic) {
        currentMusic.volume = musicVolume;
    }
    
    if (window.config) {
        window.config.musicVolume = musicVolume;
        saveSettings();
    }
}

// Set UI/sound effects volume (0.0 to 1.0)
window.setUIVolume = function(volume) {
    const newVolume = Math.max(0, Math.min(1, volume));
    console.log(`🔊 Setting UI volume to: ${newVolume} (${Math.round(newVolume * 100)}%)`);
    
    uiVolume = newVolume;
    
    if (window.config) {
        window.config.uiVolume = uiVolume;
        saveSettings();
    }
}

// Play UI sound effect
window.playSound = function(type) {
    if (uiVolume <= 0) {
        console.log("🔇 UI volume is 0, skipping sound effect");
        return;
    }
    
    if (!audioContext) {
        initAudioContext();
    }
    
    if (!audioContext) {
        console.error("❌ Audio Context not available for sound effects");
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
        
        console.log(`🔊 Played ${type} sound effect`);
        
    } catch (error) {
        console.error("❌ Error playing sound effect:", error);
    }
}

// IMPROVED: Play linking sound with dynamic pitch and harmonics
window.playLinkSound = function(pathLength) {
    if (uiVolume <= 0 || pathLength < SOUND_SETTINGS.link.minLength) return;
    
    if (!audioContext) {
        initAudioContext();
    }
    
    if (!audioContext) {
        console.error("❌ Audio Context not available for link sound");
        return;
    }
    
    try {
        const now = audioContext.currentTime;
        const { minFreq, maxFreq, duration, harmonics } = SOUND_SETTINGS.link;
        
        // Calculate dynamic frequency based on word length
        const { minLength, maxLength } = SOUND_SETTINGS.link;
        const clampedLength = Math.max(minLength, Math.min(pathLength, maxLength));
        const progress = (clampedLength - minLength) / (maxLength - minLength);
        
        // More musical frequency progression (exponential)
        const baseFrequency = minFreq * Math.pow(2, progress * 1.5);
        const frequency = Math.min(baseFrequency, maxFreq);
        
        // Create richer sound with multiple harmonics
        harmonics.forEach((harmonic, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency * harmonic.ratio;
            oscillator.type = 'sine';
            
            // Stagger the start slightly for a more organic sound
            const startDelay = index * 0.01;
            const harmonicDuration = duration * (0.8 + Math.random() * 0.4);
            
            // More musical envelope with attack, sustain, release
            gainNode.gain.setValueAtTime(0, now + startDelay);
            
            // Quick attack
            gainNode.gain.linearRampToValueAtTime(
                uiVolume * 0.4 * harmonic.gain, 
                now + startDelay + 0.05
            );
            
            // Gentle sustain
            gainNode.gain.exponentialRampToValueAtTime(
                uiVolume * 0.2 * harmonic.gain,
                now + startDelay + harmonicDuration * 0.7
            );
            
            // Smooth release
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                now + startDelay + harmonicDuration
            );
            
            // Add slight vibrato for longer words
            if (pathLength >= 5) {
                const vibrato = audioContext.createOscillator();
                const vibratoGain = audioContext.createGain();
                
                vibrato.connect(vibratoGain);
                vibratoGain.connect(oscillator.frequency);
                
                vibrato.frequency.value = 5 + (pathLength * 0.5); // Vibrato speed
                vibratoGain.gain.value = frequency * 0.03; // Vibrato depth
                
                vibrato.start(now + startDelay);
                vibrato.stop(now + startDelay + harmonicDuration);
            }
            
            oscillator.start(now + startDelay);
            oscillator.stop(now + startDelay + harmonicDuration);
        });
        
        // Add a subtle low-frequency oscillator for warmth on longer words
        if (pathLength >= 4) {
            const lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();
            const lfoFilter = audioContext.createBiquadFilter();
            
            lfo.connect(lfoGain);
            lfoGain.connect(lfoFilter);
            lfoFilter.connect(audioContext.destination);
            
            lfo.frequency.value = frequency * 0.25;
            lfo.type = 'sine';
            lfoGain.gain.value = uiVolume * 0.15;
            lfoFilter.frequency.value = 400;
            
            const lfoDuration = duration * 1.2;
            
            lfoGain.gain.setValueAtTime(0, now);
            lfoGain.gain.linearRampToValueAtTime(uiVolume * 0.15, now + 0.1);
            lfoGain.gain.exponentialRampToValueAtTime(0.001, now + lfoDuration);
            
            lfo.start(now);
            lfo.stop(now + lfoDuration);
        }
        
        console.log(`🔊 Played enhanced link sound for path length ${pathLength} at ${Math.round(frequency)}Hz`);
        
    } catch (error) {
        console.error("❌ Error playing link sound:", error);
    }
}

// Play word complete sound - NEW FUNCTION
window.playWordCompleteSound = function(wordLength, score) {
    if (uiVolume <= 0) return;
    
    if (!audioContext) {
        initAudioContext();
    }
    
    if (!audioContext) {
        console.error("❌ Audio Context not available for word complete sound");
        return;
    }
    
    try {
        const now = audioContext.currentTime;
        const baseFreq = 600;
        const duration = 0.3 + (wordLength * 0.05);
        
        // Main oscillator
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Frequency sweep up for rewarding feel
        oscillator.frequency.setValueAtTime(baseFreq, now);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + duration * 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + duration);
        oscillator.type = 'sine';
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(uiVolume * 0.6, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Harmony oscillator for richer sound
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.setValueAtTime(baseFreq * 1.5, now);
        oscillator2.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + duration * 0.3);
        oscillator2.type = 'triangle';
        
        gainNode2.gain.setValueAtTime(0, now);
        gainNode2.gain.linearRampToValueAtTime(uiVolume * 0.3, now + 0.05);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Start both oscillators
        oscillator.start(now);
        oscillator2.start(now);
        oscillator.stop(now + duration);
        oscillator2.stop(now + duration);
        
        // Add a percussion-like click at the beginning for extra feedback
        if (score > 20) {
            const clickTime = now + 0.02;
            const clickGain = audioContext.createGain();
            const clickOsc = audioContext.createOscillator();
            
            clickOsc.connect(clickGain);
            clickGain.connect(audioContext.destination);
            
            clickOsc.frequency.value = 1200;
            clickOsc.type = 'square';
            
            clickGain.gain.setValueAtTime(uiVolume * 0.3, clickTime);
            clickGain.gain.exponentialRampToValueAtTime(0.01, clickTime + 0.1);
            
            clickOsc.start(clickTime);
            clickOsc.stop(clickTime + 0.1);
        }
        
    } catch (error) {
        console.error("❌ Error playing word complete sound:", error);
    }
}

// Set game track
window.setGameTrack = function(track) {
    console.log(`🎵 Setting game track to: ${track}`);
    
    if (window.config) {
        window.config.musicTrack = track;
        saveSettings();
    }
    
    // Update music player UI
    updateMusicUI();
    
    // Only play the track if music is not already playing
    if (musicVolume > 0 && !isMusicPlaying) {
        playMusic(track);
    }
}

// Set game mode (random or specific track)
window.setGameMode = function(mode) {
    console.log(`🎵 Setting game mode to: ${mode}`);
    
    if (mode === 'random') {
        setGameTrack('random');
    } else {
        // If it's a track ID, set that track
        const track = musicTracks.find(t => t.id === mode);
        if (track) {
            setGameTrack(track.id);
        }
    }
    
    updateMusicUI();
}

window.getRandomTrack = function() {
    if (musicPlaylist.length > 0) {
        return musicPlaylist[Math.floor(Math.random() * musicPlaylist.length)].id;
    }
    return 'game1';
}

// Initialize audio system
function initAudio() {
    console.log("🎵 Initializing audio system...");
    
    // Initialize audio context on first user interaction
    document.addEventListener('click', function initOnClick() {
        console.log("👆 User interaction detected, initializing audio context...");
        initAudioContext();
        document.removeEventListener('click', initOnClick);
    }, { once: true });
    
    // Discover music tracks
    discoverMusicTracks().then(() => {
        console.log("✅ Audio system initialized successfully");
        
        // Make functions globally available
        window.playMusic = playMusic;
        window.stopMusic = stopMusic;
        window.playSound = playSound;
        window.playLinkSound = playLinkSound;
        window.playWordCompleteSound = playWordCompleteSound;
        window.setMusicVolume = setMusicVolume;
        window.setUIVolume = setUIVolume;
        window.setGameTrack = setGameTrack;
        window.setGameMode = setGameMode;
        window.playNextTrack = playNextTrack;
        window.playPreviousTrack = playPreviousTrack;
        window.toggleMusicPlayback = toggleMusicPlayback;
        window.getRandomTrack = getRandomTrack;
        window.getCurrentTrackId = getCurrentTrackId;
        window.getCurrentTrackName = getCurrentTrackName;
        window.isMusicPlaying = isMusicPlaying;
        window.isMusicPaused = isMusicPaused;
        window.resumePreviousMusic = resumePreviousMusic;
        window.shouldPlayGameMusic = shouldPlayGameMusic;
        window.updateMusicUI = updateMusicUI;
        
        console.log("✅ Audio functions registered globally");
        
        // Start music on main menu if volume is not 0 and music is not already playing
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen && currentScreen.id === 'main-menu') {
            if (window.config && window.config.musicVolume > 0 && !isMusicPlaying) {
                setTimeout(() => {
                    if (config.musicTrack === 'random') {
                        playMusic('random');
                    } else {
                        playMusic(config.musicTrack);
                    }
                }, 500);
            }
        }
        
        // Initial UI update
        setTimeout(() => updateMusicUI(), 300);
        
    }).catch(error => {
        console.error("❌ Failed to initialize audio system:", error);
    });
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM Content Loaded");
    
    // Give DOM time to fully load
    setTimeout(() => {
        initAudio();
        console.log("✅ Audio initialization scheduled");
    }, 300);
});