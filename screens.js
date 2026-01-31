// screens.js - Simplified device detection with CSS media queries

(function() {
  'use strict';
  console.log("📱 Device detection loading...");
  
  const isMobile = {
    Android: function() { return navigator.userAgent.match(/Android/i); },
    BlackBerry: function() { return navigator.userAgent.match(/BlackBerry/i); },
    iOS: function() { return navigator.userAgent.match(/iPhone|iPad|iPod/i); },
    Opera: function() { return navigator.userAgent.match(/Opera Mini/i); },
    Windows: function() { return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i); },
    any: function() { return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows()); }
  };

  if (isMobile.any()) {
    console.log("📱 Mobile device detected");
    applyMobileOptimizations();
  } else {
    console.log("🖥️ Desktop device detected");
    // Desktop uses CSS media queries, no JavaScript needed
  }
  
  function applyMobileOptimizations() {
    // Set app height for mobile
    function setAppHeight() {
      const doc = document.documentElement;
      const appHeight = window.innerHeight;
      doc.style.setProperty('--app-height', `${appHeight}px`);
      
      const boardWrap = document.getElementById('board-wrap');
      if (boardWrap) {
        const size = Math.min(appHeight * 0.65, 400);
        boardWrap.style.height = `${size}px`;
        boardWrap.style.width = `${size}px`;
      }
    }

    // Set initial height
    setAppHeight();
    
    // Update on resize
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

    // Add iOS specific fixes
    if (isMobile.iOS()) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    }
  }

  console.log("✅ Device detection complete");
})();