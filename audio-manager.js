// audio-manager.js - Simplified Audio Manager with missing file handling
class AudioManager {
    constructor() {
        this.currentMusic = null;
        this.musicVolume = 0.5;
        this.uiVolume = 0.7;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTrackIndex = 0;
        this.playMode = 'sequential'; // sequential, loop, random
        this.enabledTracks = new Set();
        this.allTracks = [];
        this.filteredTracks = [];
        
        this.audioContext = null;
        
        this.init();
    }
    
    async init() {
        console.log("🎵 Audio Manager Initializing...");
        
        // Load saved settings
        this.loadSettings();
        
        // Discover tracks from audio folder
        await this.discoverTracks();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log("✅ Audio Manager Ready");
        
        // Update UI once tracks are loaded
        setTimeout(() => this.updateUI(), 500);
    }
    
    async discoverTracks() {
        console.log("🔍 Discovering audio files...");
        
        this.allTracks = [];
        this.enabledTracks.clear();
        
        // List of potential audio files (only include ones you actually have)
        const potentialTracks = [
            { id: 'game1', file: 'audio/game1.mp3', name: 'Game 1' },
            { id: 'game2', file: 'audio/game2.mp3', name: 'Game 2' },
            { id: 'game3', file: 'audio/game3.mp3', name: 'Game 3' },
            { id: 'game4', file: 'audio/game4.mp3', name: 'Game 4' },
             { id: 'game5', file: 'audio/game5.mp3', name: 'Game 5' },
             { id: 'game6', file: 'audio/game6.mp3', name: 'Game 6' },
             { id: 'game7', file: 'audio/game7.mp3', name: 'Game 7' },
             { id: 'game8', file: 'audio/game8.mp3', name: 'Game 8' },
             { id: 'game9', file: 'audio/game9.mp3', name: 'Game 9' },
             { id: 'summary', file: 'audio/summary-music.mp3', name: 'Summary Music' }
        ];
        
        console.log("Testing which audio files exist...");
        
        // Test each file to see if it exists
        for (const trackInfo of potentialTracks) {
            const exists = await this.testAudioFile(trackInfo.file);
            
            if (exists) {
                this.allTracks.push({
                    id: trackInfo.id,
                    name: trackInfo.name,
                    file: trackInfo.file,
                    enabled: true
                });
                this.enabledTracks.add(trackInfo.id);
                console.log(`✓ Found: ${trackInfo.name}`);
            } else {
                console.log(`✗ Missing: ${trackInfo.name} (${trackInfo.file})`);
            }
        }
        
        // If no tracks were found, add a fallback
        if (this.allTracks.length === 0) {
            console.log("⚠️ No audio files found, adding fallback tracks");
            this.allTracks.push({
                id: 'demo1',
                name: 'Demo Track 1',
                file: '',
                enabled: true
            });
            this.allTracks.push({
                id: 'demo2',
                name: 'Demo Track 2',
                file: '',
                enabled: true
            });
            this.enabledTracks.add('demo1');
            this.enabledTracks.add('demo2');
        }
        
        // Apply saved preferences
        this.applyTrackPreferences();
        
        // Update filtered tracks
        this.updateFilteredTracks();
        
        console.log(`Found ${this.allTracks.length} tracks, ${this.filteredTracks.length} enabled`);
        
        // Build track list UI if container exists
        setTimeout(() => this.buildTrackList(), 100);
    }
    
    async testAudioFile(url) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = url;
            
            // Try to load the audio
            audio.load();
            
            const timeout = setTimeout(() => {
                resolve(false);
            }, 1000);
            
            audio.addEventListener('canplaythrough', () => {
                clearTimeout(timeout);
                resolve(true);
            });
            
            audio.addEventListener('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('audio_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.musicVolume = settings.musicVolume || 0.5;
                this.uiVolume = settings.uiVolume || 0.7;
                this.playMode = settings.playMode || 'sequential';
                
                if (settings.enabledTracks) {
                    // Only add enabled tracks that actually exist
                    settings.enabledTracks.forEach(trackId => {
                        this.enabledTracks.add(trackId);
                    });
                }
            }
        } catch (e) {
            console.log("Error loading audio settings:", e);
        }
    }
    
    saveSettings() {
        const settings = {
            musicVolume: this.musicVolume,
            uiVolume: this.uiVolume,
            playMode: this.playMode,
            enabledTracks: Array.from(this.enabledTracks)
        };
        localStorage.setItem('audio_settings', JSON.stringify(settings));
    }
    
    applyTrackPreferences() {
        this.allTracks.forEach(track => {
            track.enabled = this.enabledTracks.has(track.id);
        });
    }
    
    updateFilteredTracks() {
        this.filteredTracks = this.allTracks.filter(track => track.enabled);
        
        // If current track is no longer enabled, stop it
        if (this.currentMusic && this.currentTrackIndex < this.filteredTracks.length) {
            const currentTrack = this.filteredTracks[this.currentTrackIndex];
            if (currentTrack && this.currentMusic.src && 
                !this.currentMusic.src.includes(currentTrack.file)) {
                this.stop();
            }
        }
        
        // If current track index is out of bounds, reset it
        if (this.currentTrackIndex >= this.filteredTracks.length) {
            this.currentTrackIndex = 0;
        }
    }
    
    buildTrackList() {
        const trackListContainer = document.getElementById('track-list');
        if (!trackListContainer) {
            console.log("Track list container not found");
            return;
        }
        
        trackListContainer.innerHTML = '';
        
        if (this.allTracks.length === 0) {
            trackListContainer.innerHTML = '<div class="no-tracks">No audio tracks found. Add MP3 files to the audio folder.</div>';
            return;
        }
        
        this.allTracks.forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `track-${track.id}`;
            checkbox.checked = track.enabled;
            checkbox.className = 'track-checkbox';
            
            const label = document.createElement('label');
            label.htmlFor = `track-${track.id}`;
            label.textContent = track.name;
            label.className = 'track-label';
            
            // Status indicator
            const status = document.createElement('span');
            status.className = 'track-status';
            
            if (track.file === '') {
                status.textContent = '⚠️';
                status.title = 'File missing';
                label.style.color = '#94a3b8';
            } else {
                status.textContent = '✓';
                status.title = 'File found';
            }
            
            // Now playing indicator
            const nowPlaying = document.createElement('span');
            nowPlaying.className = 'now-playing';
            nowPlaying.textContent = '▶️';
            nowPlaying.style.display = 'none';
            track.nowPlayingElement = nowPlaying;
            
            trackItem.appendChild(checkbox);
            trackItem.appendChild(label);
            trackItem.appendChild(status);
            trackItem.appendChild(nowPlaying);
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.enabledTracks.add(track.id);
                } else {
                    this.enabledTracks.delete(track.id);
                }
                this.applyTrackPreferences();
                this.updateFilteredTracks();
                this.saveSettings();
                
                // If we're playing and this was the current track, stop it
                if (this.isPlaying && this.currentTrackIndex === index) {
                    this.stop();
                }
                
                // If this is the only track and it was disabled, stop playback
                if (this.filteredTracks.length === 0) {
                    this.stop();
                }
                
                this.updateUI();
            });
            
            trackListContainer.appendChild(trackItem);
        });
    }
    
    setupEventListeners() {
        // Play/Pause buttons
        const playPauseBtn = document.getElementById('audio-play-pause');
        const gamePlayPauseBtn = document.getElementById('game-audio-play-pause');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayback());
        }
        
        if (gamePlayPauseBtn) {
            gamePlayPauseBtn.addEventListener('click', () => this.togglePlayback());
        }
        
        // Next track buttons
        const nextBtns = document.querySelectorAll('.audio-next');
        nextBtns.forEach(btn => {
            btn.addEventListener('click', () => this.nextTrack());
        });
        
        // Previous track buttons
        const prevBtns = document.querySelectorAll('.audio-prev');
        prevBtns.forEach(btn => {
            btn.addEventListener('click', () => this.previousTrack());
        });
        
        // Mode selection
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode || e.target.closest('.mode-btn').dataset.mode;
                if (mode) {
                    this.setPlayMode(mode);
                }
            });
        });
        
        // Volume sliders
        const musicVolumeSlider = document.getElementById('music-volume-slider');
        const uiVolumeSlider = document.getElementById('ui-volume-slider');
        
        if (musicVolumeSlider) {
            musicVolumeSlider.value = this.musicVolume * 100;
            musicVolumeSlider.addEventListener('input', (e) => {
                this.setMusicVolume(e.target.value / 100);
            });
            
            // Update display
            const valueDisplay = document.getElementById('music-volume-value');
            if (valueDisplay) {
                valueDisplay.textContent = `${Math.round(this.musicVolume * 100)}%`;
            }
        }
        
        if (uiVolumeSlider) {
            uiVolumeSlider.value = this.uiVolume * 100;
            uiVolumeSlider.addEventListener('input', (e) => {
                this.setUIVolume(e.target.value / 100);
            });
            
            // Update display
            const valueDisplay = document.getElementById('ui-volume-value');
            if (valueDisplay) {
                valueDisplay.textContent = `${Math.round(this.uiVolume * 100)}%`;
            }
        }
    }
    
    async play() {
        if (this.filteredTracks.length === 0) {
            console.log("No enabled tracks to play");
            this.updateUI();
            return;
        }
        
        // If paused, resume
        if (this.isPaused && this.currentMusic) {
            try {
                await this.currentMusic.play();
                this.isPlaying = true;
                this.isPaused = false;
                this.updateUI();
                return;
            } catch (e) {
                console.log("Failed to resume audio:", e);
                // If resume fails, stop and try playing fresh
                this.stop();
            }
        }
        
        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic = null;
        }
        
        // Get next track based on mode
        let track;
        if (this.playMode === 'random') {
            const randomIndex = Math.floor(Math.random() * this.filteredTracks.length);
            this.currentTrackIndex = randomIndex;
            track = this.filteredTracks[randomIndex];
        } else {
            // sequential or loop
            if (this.currentTrackIndex >= this.filteredTracks.length) {
                this.currentTrackIndex = 0;
            }
            track = this.filteredTracks[this.currentTrackIndex];
        }
        
        if (!track) {
            console.log("No track selected");
            return;
        }
        
        // Check if track has a valid file
        if (!track.file) {
            console.log(`Track ${track.name} has no file, skipping`);
            this.nextTrack();
            return;
        }
        
        console.log(`🎵 Playing: ${track.name}`);
        
        try {
            // Create audio element
            const audio = new Audio(track.file);
            audio.volume = this.musicVolume;
            
            // Set loop based on mode
            audio.loop = (this.playMode === 'loop');
            
            // Load the audio first
            audio.load();
            
            // Wait for audio to be ready
            await new Promise((resolve, reject) => {
                const onCanPlay = () => {
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    clearTimeout(timeout);
                    resolve();
                };
                
                const onError = (e) => {
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load ${track.name}`));
                };
                
                const timeout = setTimeout(() => {
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    reject(new Error('Timeout loading audio'));
                }, 3000);
                
                audio.addEventListener('canplaythrough', onCanPlay);
                audio.addEventListener('error', onError);
            });
            
            // Play the audio
            await audio.play();
            
            this.currentMusic = audio;
            this.isPlaying = true;
            this.isPaused = false;
            
            // Set up end event
            audio.addEventListener('ended', () => {
                if (this.playMode === 'sequential' && !audio.loop) {
                    this.nextTrack();
                } else if (this.playMode === 'random' && !audio.loop) {
                    // Wait a moment then play another random track
                    setTimeout(() => {
                        if (this.isPlaying) {
                            this.nextTrack();
                        }
                    }, 1000);
                }
                // For loop mode, the audio will loop automatically
            });
            
            audio.addEventListener('error', (e) => {
                console.error(`Audio error for ${track.name}:`, e);
                // Try next track if current fails
                if (this.playMode !== 'loop') {
                    setTimeout(() => this.nextTrack(), 1000);
                }
            });
            
            this.updateUI();
            
        } catch (error) {
            console.error(`Failed to play ${track.name}:`, error);
            // Try next track
            setTimeout(() => this.nextTrack(), 1000);
        }
    }
    
    stop() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
        this.isPlaying = false;
        this.isPaused = false;
        this.updateUI();
    }
    
    pause() {
        if (this.currentMusic && this.isPlaying) {
            this.currentMusic.pause();
            this.isPlaying = false;
            this.isPaused = true;
            this.updateUI();
        }
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    nextTrack() {
        if (this.filteredTracks.length === 0) return;
        
        if (this.playMode === 'random') {
            const randomIndex = Math.floor(Math.random() * this.filteredTracks.length);
            this.currentTrackIndex = randomIndex;
        } else {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.filteredTracks.length;
        }
        
        if (this.isPlaying || this.isPaused) {
            this.stop();
            setTimeout(() => this.play(), 100);
        } else {
            this.updateUI();
        }
    }
    
    previousTrack() {
        if (this.filteredTracks.length === 0) return;
        
        if (this.playMode === 'random') {
            const randomIndex = Math.floor(Math.random() * this.filteredTracks.length);
            this.currentTrackIndex = randomIndex;
        } else {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.filteredTracks.length) % this.filteredTracks.length;
        }
        
        if (this.isPlaying || this.isPaused) {
            this.stop();
            setTimeout(() => this.play(), 100);
        } else {
            this.updateUI();
        }
    }
    
    setPlayMode(mode) {
        this.playMode = mode;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update audio loop if playing
        if (this.currentMusic) {
            this.currentMusic.loop = (mode === 'loop');
        }
        
        this.saveSettings();
        this.updateUI();
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
        this.saveSettings();
        
        // Update volume display
        const volumeValue = document.getElementById('music-volume-value');
        if (volumeValue) {
            volumeValue.textContent = `${Math.round(this.musicVolume * 100)}%`;
        }
    }
    
    setUIVolume(volume) {
        this.uiVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
        
        // Update volume display
        const volumeValue = document.getElementById('ui-volume-value');
        if (volumeValue) {
            volumeValue.textContent = `${Math.round(this.uiVolume * 100)}%`;
        }
    }
    
    updateUI() {
        // Update play/pause buttons
        const playIcon = this.isPlaying ? '⏸️' : '▶️';
        const playTitle = this.isPlaying ? 'Pause' : 'Play';
        
        document.querySelectorAll('.audio-play-icon').forEach(el => {
            el.textContent = playIcon;
        });
        
        document.querySelectorAll('.audio-play-btn').forEach(el => {
            el.title = playTitle;
        });
        
        // Update mode display
        const modeDisplay = document.getElementById('play-mode-display');
        if (modeDisplay) {
            const modeNames = {
                'sequential': 'Sequential',
                'loop': 'Loop',
                'random': 'Random'
            };
            modeDisplay.textContent = modeNames[this.playMode] || 'Sequential';
        }
        
        // Update now playing indicators
        if (this.currentTrackIndex < this.filteredTracks.length && this.allTracks.length > 0) {
            const currentTrack = this.filteredTracks[this.currentTrackIndex];
            if (currentTrack) {
                this.allTracks.forEach(track => {
                    if (track.nowPlayingElement) {
                        track.nowPlayingElement.style.display = 
                            (track.id === currentTrack.id && this.isPlaying) ? 'inline-block' : 'none';
                    }
                });
                
                // Update current track info
                const currentTrackEl = document.getElementById('current-track');
                if (currentTrackEl) {
                    currentTrackEl.textContent = this.isPlaying ? 
                        `Now Playing: ${currentTrack.name}` : 
                        `Ready: ${this.filteredTracks.length} tracks enabled`;
                }
            }
        } else {
            // No track selected or playing
            const currentTrackEl = document.getElementById('current-track');
            if (currentTrackEl) {
                currentTrackEl.textContent = `Ready: ${this.filteredTracks.length} tracks enabled`;
            }
        }
    }
    
    // Simple sound effects
    playSound(type) {
        if (this.uiVolume <= 0) return;
        
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const frequencies = {
                good: 800,
                bad: 300,
                warning: 500,
                better: 700,
                repeat: 400
            };
            
            oscillator.frequency.value = frequencies[type] || 600;
            oscillator.type = 'sine';
            
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(this.uiVolume * 0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } catch (e) {
            // Silent fail for audio context errors
        }
    }
}

// Create global instance after DOM loads
window.addEventListener('DOMContentLoaded', () => {
    window.audioManager = new AudioManager();
});