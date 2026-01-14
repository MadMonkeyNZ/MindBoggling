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