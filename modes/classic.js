/* ================= CLASSIC MODE ================= */

// Classic mode uses the default startGame function from game-core.js
// No additional functions needed for basic classic mode

// Override the startGame to ensure classic mode is set
window.startGame = function() {
  // Set Classic specific settings
  config.gameMode = "classic";
  
  // Call the original startGame from game-core.js
  // We need to get a reference to the original function
  if (typeof window.originalStartGame === 'function') {
    window.originalStartGame();
  }
};

// Make sure the original startGame is preserved
if (typeof startGame !== 'undefined') {
  window.originalStartGame = startGame;
}