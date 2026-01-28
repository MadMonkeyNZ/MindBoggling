// mobile.js - Mobile-specific optimizations and fixes

(function() {
  'use strict';
  
  console.log("📱 Mobile optimizations loading...");
  
  // Detect if we're on a mobile device
  const isMobile = {
    Android: function() {
      return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
      return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
      return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
      return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
      return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
      return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
  };
  
  // Apply mobile-specific fixes
  if (isMobile.any()) {
    console.log("📱 Mobile device detected, applying fixes");
    
    // Fix for iOS 100vh issue
    function setAppHeight() {
      const doc = document.documentElement;
      doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    }
    
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    setAppHeight(); // Set initial value
    
    // Prevent zoom on double-tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // Prevent pull-to-refresh on iOS
    document.body.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Fix for mobile keyboard not pushing content up
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        // iOS fix - scroll the input into view
        setTimeout(() => {
          this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });
    });
    
    // Add visual feedback for touch
    document.addEventListener('touchstart', function() {}, {passive: true});
    
    // Improve scroll performance
    const containers = document.querySelectorAll('.screen');
    containers.forEach(container => {
      container.style.webkitOverflowScrolling = 'touch';
      container.style.overflowScrolling = 'touch';
    });
    
    // Fix for Android Chrome address bar
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    window.addEventListener('resize', () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
  }
  
  // Fix for all devices - prevent context menu on long press
  document.addEventListener('contextmenu', function(e) {
    if (e.target.classList.contains('tile') || 
        e.target.closest('.tile') || 
        e.target.classList.contains('board')) {
      e.preventDefault();
    }
  });
  
  // Add CSS for mobile
  const style = document.createElement('style');
  style.textContent = `
    /* Use custom property for dynamic viewport height */
    .screen {
      height: calc(var(--app-height, 100vh) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    }
    
    /* Improve touch feedback */
    .tile:active {
      opacity: 0.8;
      transition: opacity 0.1s;
    }
    
    /* Prevent text selection */
    .tile, button {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    
    /* iOS specific fixes */
    @supports (-webkit-touch-callout: none) {
      .screen {
        height: -webkit-fill-available;
      }
    }
    
    /* Disable blue tap highlight on Android */
    * {
      -webkit-tap-highlight-color: rgba(0,0,0,0);
      -webkit-tap-highlight-color: transparent;
    }
  `;
  document.head.appendChild(style);
  
  console.log("✅ Mobile optimizations applied");
})();