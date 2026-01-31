// mobile.js - Mobile-specific optimizations and fixes

(function() {
  'use strict';
  console.log("📱 Mobile optimizations loading...");
  const isMobile = {
    Android: function() { return navigator.userAgent.match(/Android/i); },
    BlackBerry: function() { return navigator.userAgent.match(/BlackBerry/i); },
    iOS: function() { return navigator.userAgent.match(/iPhone|iPad|iPod/i); },
    Opera: function() { return navigator.userAgent.match(/Opera Mini/i); },
    Windows: function() { return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i); },
    any: function() { return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows()); }
  };

  if (isMobile.any()) {
    console.log("📱 Mobile device detected, applying fixes");

    function setAppHeight() {
      const doc = document.documentElement;
      const appHeight = window.innerHeight;
      doc.style.setProperty('--app-height', `${appHeight}px`);
      document.body.style.height = `${appHeight}px`;
      
      // Force resize of game elements
      const boardWrap = document.getElementById('board-wrap');
      if (boardWrap) {
        const size = Math.min(appHeight * 0.6, 380);
        boardWrap.style.height = `${size}px`;
        boardWrap.style.width = `${size}px`;
      }
    }

    // Set initial height
    setAppHeight();
    
    // Update on resize and orientation change
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', function() {
      setTimeout(setAppHeight, 100);
    });

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Prevent pinch zoom
    document.addEventListener('touchmove', function(e) {
      if (e.scale !== 1) e.preventDefault();
    }, { passive: false });

    // Prevent context menu on tiles
    document.addEventListener('contextmenu', function(e) {
      if (e.target.classList.contains('tile') || e.target.closest('.tile')) {
        e.preventDefault();
        return false;
      }
    }, false);

    // Add iOS specific fixes
    if (isMobile.iOS()) {
      // Fix for iOS elastic scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Prevent pull-to-refresh
      document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }, { passive: false });
    }
  }

  // Apply global mobile styles
  const style = document.createElement('style');
  style.textContent = `
    /* Mobile-specific fixes */
    body { 
      position: fixed;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
    
    #app {
      height: 100dvh;
      max-height: -webkit-fill-available;
    }
    
    .screen { 
      height: 100%;
      overflow: hidden !important;
    }
    
    .tile:active { 
      opacity: 0.8; 
      transition: opacity 0.1s; 
    }
    
    .tile, button { 
      -webkit-touch-callout: none; 
      -webkit-user-select: none; 
      user-select: none; 
    }
    
    /* iOS specific */
    @supports (-webkit-touch-callout: none) { 
      body { 
        height: -webkit-fill-available; 
      }
      
      #app {
        height: -webkit-fill-available;
      }
    }
    
    /* Prevent blue highlight on tap */
    * { 
      -webkit-tap-highlight-color: transparent; 
      -webkit-tap-highlight-color: rgba(0,0,0,0); 
    }
    
    /* Fix for game UI layout */
    #game-ui {
      overflow: hidden !important;
    }
    
    #board-wrap {
      touch-action: pan-x pan-y;
    }
    
    /* Prevent address bar issues */
    html {
      overflow: hidden;
      position: fixed;
    }
  `;
  document.head.appendChild(style);

  console.log("✅ Mobile optimizations applied");
})();