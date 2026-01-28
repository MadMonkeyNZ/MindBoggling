// screens.js - Simplified with only essential functions

let audioSettingsInitialized = false;

window.loadAudioSettings = function() {
    if (audioSettingsInitialized) return;
    
    console.log("🔊 Loading audio settings...");
    
    // Setup volume sliders
    const uiVolumeSlider = document.getElementById('ui-volume-slider');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    
    if (uiVolumeSlider) {
        const savedUIVolume = window.config?.uiVolume || 0.7;
        uiVolumeSlider.value = savedUIVolume * 100;
        const uiVolumeValue = document.getElementById('ui-volume-value');
        if (uiVolumeValue) {
            uiVolumeValue.textContent = Math.round(savedUIVolume * 100) + '%';
        }
            
        uiVolumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            const valueDisplay = document.getElementById('ui-volume-value');
            if (valueDisplay) {
                valueDisplay.textContent = this.value + '%';
            }
            
            if (typeof window.setUIVolume === 'function') {
                window.setUIVolume(volume);
            }
            
            if (window.config) {
                window.config.uiVolume = volume;
                saveSettings();
            }
            
            // Test sound with improved feedback
            if (volume > 0 && typeof window.playSound === 'function') {
                setTimeout(() => window.playSound('good'), 100);
            }
        });
    }
    
    if (musicVolumeSlider) {
        const savedMusicVolume = window.config?.musicVolume || 0.5;
        musicVolumeSlider.value = savedMusicVolume * 100;
        const musicVolumeValue = document.getElementById('music-volume-value');
        if (musicVolumeValue) {
            musicVolumeValue.textContent = Math.round(savedMusicVolume * 100) + '%';
        }
            
        musicVolumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            const valueDisplay = document.getElementById('music-volume-value');
            if (valueDisplay) {
                valueDisplay.textContent = this.value + '%';
            }
            
            if (typeof window.setMusicVolume === 'function') {
                window.setMusicVolume(volume);
            }
            
            if (window.config) {
                window.config.musicVolume = volume;
                saveSettings();
            }
        });
    }
    
    audioSettingsInitialized = true;
    console.log("✅ Audio settings loaded");
};

// Add these functions to screens.js to fix reference errors
window.toggleMusic = function() {
    if (typeof window.toggleMusicPlayback === 'function') {
        window.toggleMusicPlayback();
    }
};

// Ensure functions are available globally
window.ensureAudioFunctions = function() {
    if (!window.playNextTrack) {
        window.playNextTrack = function() {
            console.log("playNextTrack not yet initialized");
        };
    }
    if (!window.setGameMode) {
        window.setGameMode = function(mode) {
            console.log("setGameMode not yet initialized");
            if (window.config) {
                window.config.musicTrack = mode;
                saveSettings();
            }
        };
    }
};

// Call this when screens.js loads
window.ensureAudioFunctions();

// Force refresh music UI
window.refreshMusicUI = function() {
    if (typeof window.updateMusicUI === 'function') {
        console.log("🔄 Forcing music UI refresh");
        window.updateMusicUI();
    }
    
    // Also update audio settings sliders
    if (window.config) {
        const uiVolumeSlider = document.getElementById('ui-volume-slider');
        const musicVolumeSlider = document.getElementById('music-volume-slider');
        
        if (uiVolumeSlider) {
            uiVolumeSlider.value = window.config.uiVolume * 100;
            const uiVolumeValue = document.getElementById('ui-volume-value');
            if (uiVolumeValue) {
                uiVolumeValue.textContent = Math.round(window.config.uiVolume * 100) + '%';
            }
        }
        
        if (musicVolumeSlider) {
            musicVolumeSlider.value = window.config.musicVolume * 100;
            const musicVolumeValue = document.getElementById('music-volume-value');
            if (musicVolumeValue) {
                musicVolumeValue.textContent = Math.round(window.config.musicVolume * 100) + '%';
            }
        }
    }
};

// Add function to update time display based on mode
window.updateTimeDisplay = function() {
    const timeEl = document.getElementById('time');
    if (!timeEl) return;
    
    if (window.config?.time === 0) {
        timeEl.textContent = "∞";
        timeEl.className = "hud-val time-display endless";
    } else {
        timeEl.textContent = window.timeLeft || window.config?.time || 30;
        timeEl.className = "hud-val time-display";
        
        if (window.timeLeft <= 10) {
            timeEl.style.color = '#ef4444';
        } else {
            timeEl.style.color = '';
        }
    }
};

// Update high scores display when settings change
window.updateHighScoresOnSettingsChange = function() {
    // Update the main menu high scores display
    if (typeof updateHighscoresDisplay === 'function') {
        updateHighscoresDisplay();
    }
    
    // Update high score labels
    if (typeof updateHighScoreLabels === 'function') {
        updateHighScoreLabels();
    }
    
    // Update the main menu high score labels
    const dailyHighscoreLabel = document.getElementById('daily-highscore-label');
    const allTimeHighscoreLabel = document.getElementById('alltime-highscore-label');
    
    if (window.config && window.config.time === 0) {
        // Endless mode
        if (dailyHighscoreLabel) dailyHighscoreLabel.textContent = 'Daily % Best';
        if (allTimeHighscoreLabel) allTimeHighscoreLabel.textContent = 'All-Time % Best';
    } else {
        // Timed mode
        if (dailyHighscoreLabel) dailyHighscoreLabel.textContent = 'Daily Score Best';
        if (allTimeHighscoreLabel) allTimeHighscoreLabel.textContent = 'All-Time Score Best';
    }
};

// Initialize settings on load
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.config) {
            window.updateHighScoresOnSettingsChange();
        }
    }, 500);
});