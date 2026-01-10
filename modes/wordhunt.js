/* ================= WORD HUNT MODE ================= */

// Word Hunt specific variables
let totalWordsOnBoard = 0;

function startWordHuntGame() {
  console.log("Starting Word Hunt Game");
  
  // Set Word Hunt specific settings
  config.gameMode = "wordhunt";
  config.gridSize = 4;
  config.time = 120; // 2 minutes
  config.minLen = 4;
  config.scoring = "traditional"; // Word Hunt uses word count, not points
  
  // Start the game
  if (typeof startGame === 'function') {
    startGame();
  } else {
    console.error("startGame function not found!");
    alert("Error: Game functions not loaded properly. Please refresh the page.");
    return;
  }
  
  // Find all possible words on the board
  setTimeout(() => {
    if (typeof findAllWordsOnBoard === 'function') {
      totalWordsOnBoard = findAllWordsOnBoard().size;
      
      // Update UI for Word Hunt
      if (UI.scoreLabel) {
        UI.scoreLabel.textContent = "Words";
      }
      if (UI.wordhuntProgress) {
        UI.wordhuntProgress.style.display = 'block';
      }
      if (typeof updateWordHuntProgress === 'function') {
        updateWordHuntProgress();
      }
    }
  }, 100);
}

function updateWordHuntProgress() {
  const found = foundWords.size;
  const percentage = totalWordsOnBoard > 0 ? Math.round((found / totalWordsOnBoard) * 100) : 0;
  
  if (UI.wordhuntStats && UI.wordhuntProgressFill) {
    UI.wordhuntStats.textContent = `${found}/${totalWordsOnBoard}`;
    UI.wordhuntProgressFill.style.width = `${percentage}%`;
  }
  
  // Update score display to show word count
  if (UI.score) {
    UI.score.textContent = found;
  }
}

function endWordHuntGame() {
  const found = foundWords.size;
  const percentage = totalWordsOnBoard > 0 ? Math.round((found / totalWordsOnBoard) * 100) : 0;
  
  // Show Word Hunt results
  if (UI.wordhuntResults) {
    UI.wordhuntResults.style.display = 'block';
  }
  
  if (UI.wordhuntFound) {
    UI.wordhuntFound.textContent = found;
  }
  
  if (UI.wordhuntTotal) {
    UI.wordhuntTotal.textContent = totalWordsOnBoard;
  }
  
  if (UI.wordhuntPercentage) {
    UI.wordhuntPercentage.textContent = `${percentage}%`;
  }
  
  if (UI.wordhuntResultProgress) {
    UI.wordhuntResultProgress.style.width = `${percentage}%`;
  }
  
  // Update title based on performance
  let title = "Word Hunt Results";
  let titleColor = '#f1f5f9';
  
  if (percentage === 100) {
    title = "Perfect! 🎯";
    titleColor = '#22c55e';
  } else if (percentage >= 80) {
    title = "Excellent! 🌟";
    titleColor = '#8b5cf6';
  } else if (percentage >= 50) {
    title = "Good Job! 👍";
    titleColor = '#0ea5e9';
  }
  
  if (UI.wordhuntResultTitle) {
    UI.wordhuntResultTitle.textContent = title;
    UI.wordhuntResultTitle.style.color = titleColor;
  }
  
  // Save Word Hunt high score
  const key = `wordhunt_best_${config.gridSize}x${config.gridSize}`;
  const currentBest = parseInt(localStorage.getItem(key) || '0');
  if (found > currentBest) {
    localStorage.setItem(key, found);
  }
}

function findAllWordsOnBoard() {
  const words = new Set();
  const visited = new Array(board.length).fill(false);
  const size = config.gridSize;
  
  // Directions: 8 adjacent cells (including diagonals)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  function dfs(row, col, currentWord, visited) {
    const idx = row * size + col;
    const letter = board[idx].toUpperCase();
    
    // Special handling for "Qu" tile
    if (letter === "QU") {
      currentWord += 'QU';
    } else {
      currentWord += letter;
    }
    
    // If this forms a valid word of sufficient length, add it
    if (currentWord.length >= config.minLen && dict.has(currentWord)) {
      words.add(currentWord);
    }
    
    // Mark as visited and continue search
    visited[idx] = true;
    
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      
      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        const newIdx = newRow * size + newCol;
        if (!visited[newIdx]) {
          const newVisited = visited.slice();
          dfs(newRow, newCol, currentWord, newVisited);
        }
      }
    }
  }
  
  // Start DFS from each cell
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const newVisited = visited.slice();
      dfs(i, j, '', newVisited);
    }
  }
  
  return words;
}

// Make sure the functions are available globally
window.startWordHuntGame = startWordHuntGame;
window.updateWordHuntProgress = updateWordHuntProgress;
window.endWordHuntGame = endWordHuntGame;
window.findAllWordsOnBoard = findAllWordsOnBoard;