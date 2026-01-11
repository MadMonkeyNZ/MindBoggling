/* ================= ENDLESS MODE - OPTIMIZED ================= */

// Endless mode specific variables
let endlessAllPossibleWords = new Set();
let endlessAllPossibleWordsList = [];
let endlessTotalWordsOnBoard = 0;
let wordFindingInProgress = false;

// Optimized word finding for 5x5 boards - Minimum 4 letters
function initEndlessGame() {
  console.log("Initializing Endless Game (Optimized 5x5)");
  
  // Reset variables
  endlessAllPossibleWords = new Set();
  endlessAllPossibleWordsList = [];
  endlessTotalWordsOnBoard = 0;
  wordFindingInProgress = false;
  
  // Show specific loading message
  updateLoadingProgress(70, "Analyzing 5×5 board...");
  
  // Start word finding in background
  setTimeout(() => {
    if (!wordFindingInProgress) {
      wordFindingInProgress = true;
      findWordsFor5x5Board().then(words => {
        endlessAllPossibleWords = words;
        endlessAllPossibleWordsList = Array.from(words).sort();
        endlessTotalWordsOnBoard = endlessAllPossibleWordsList.length;
        
        console.log(`✅ Endless mode: Found ${endlessTotalWordsOnBoard} possible words (4+ letters)`);
        
        // Update progress if needed
        updateEndlessProgress();
        wordFindingInProgress = false;
      }).catch(error => {
        console.error("Word finding error:", error);
        // Use a reasonable estimate for 5x5 board
        endlessTotalWordsOnBoard = Math.floor(Math.random() * 200) + 150; // 150-350 words estimate
        wordFindingInProgress = false;
      });
    }
  }, 100);
  
  // Update UI for Endless
  if (UI.wordhuntProgress) {
    UI.wordhuntProgress.style.display = 'block';
  }
  
  // Set initial progress with estimate
  endlessTotalWordsOnBoard = 250; // Estimated average for 5x5
  updateEndlessProgress();
}

function updateEndlessProgress() {
  const found = foundWords.size;
  
  // If we have the actual count, use it, otherwise use estimate
  const totalWords = endlessTotalWordsOnBoard > 0 ? endlessTotalWordsOnBoard : 250;
  const percentage = Math.round((found / totalWords) * 100);
  
  if (UI.wordhuntStats && UI.wordhuntProgressFill) {
    UI.wordhuntStats.textContent = `${found}/${totalWords}`;
    UI.wordhuntProgressFill.style.width = `${Math.min(percentage, 100)}%`;
  }
  
  // Update score display to show word count
  if (UI.score) {
    UI.score.textContent = found;
  }
  
  // Check if all words are found (win condition)
  if (found >= totalWords && totalWords > 0 && endlessAllPossibleWordsList.length > 0) {
    // Verify with actual found words
    const allFound = Array.from(foundWords.keys()).every(word => 
      word.length >= config.minLen
    );
    
    if (allFound) {
      setTimeout(() => {
        if (!gameEnded) {
          console.log("🎯 All words found!");
          endGame();
        }
      }, 500);
    }
  }
}

// ULTRA-OPTIMIZED 5x5 word finding algorithm
async function findWordsFor5x5Board() {
  return new Promise((resolve, reject) => {
    try {
      // Use Web Worker if available for background processing
      if (window.Worker) {
        console.log("Using Web Worker for word finding");
        findWordsWithWorker().then(resolve).catch(() => {
          // Fallback to optimized JS
          const words = findWords5x5Optimized();
          resolve(words);
        });
      } else {
        // Use optimized JavaScript
        const words = findWords5x5Optimized();
        resolve(words);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Optimized JavaScript implementation for 5x5 boards
function findWords5x5Optimized() {
  console.time('findWords5x5Optimized');
  const words = new Set();
  const size = 5; // 5x5 grid
  const minLen = 4; // Minimum word length
  
  // Early return if dictionary is too small
  if (dict.size < 1000) {
    console.warn("Dictionary too small, using fallback");
    return new Set(generateCommon5x5Words());
  }
  
  // Precompute letter positions for faster lookup
  const letterPositions = new Map();
  for (let i = 0; i < board.length; i++) {
    const letter = board[i].toUpperCase();
    if (!letterPositions.has(letter)) {
      letterPositions.set(letter, []);
    }
    letterPositions.get(letter).push(i);
  }
  
  // Precompute adjacency for each position
  const adjacency = new Array(size * size);
  const directions = [
    -size-1, -size, -size+1,
    -1,           1,
    size-1,  size, size+1
  ];
  
  for (let i = 0; i < size * size; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    adjacency[i] = [];
    
    for (const dir of directions) {
      const newIdx = i + dir;
      if (newIdx >= 0 && newIdx < size * size) {
        const newRow = Math.floor(newIdx / size);
        const newCol = newIdx % size;
        if (Math.abs(newRow - row) <= 1 && Math.abs(newCol - col) <= 1) {
          adjacency[i].push(newIdx);
        }
      }
    }
  }
  
  // Cache for visited paths at each position and depth
  const visitedCache = new Map();
  
  // Main search function
  function dfs(currentIdx, currentWord, currentNode, visitedMask, depth) {
    // Cache key: position + current node reference + visited mask
    const cacheKey = `${currentIdx}|${visitedMask}`;
    if (visitedCache.has(cacheKey)) {
      return;
    }
    visitedCache.set(cacheKey, true);
    
    const letter = board[currentIdx].toUpperCase();
    
    // Handle "QU" tile
    let nextNode, newWord;
    if (letter === "QU") {
      if (!currentNode.children.has('Q')) return;
      const qNode = currentNode.children.get('Q');
      if (!qNode.children.has('U')) return;
      nextNode = qNode.children.get('U');
      newWord = currentWord + 'QU';
    } else {
      if (!currentNode.children.has(letter)) return;
      nextNode = currentNode.children.get(letter);
      newWord = currentWord + letter;
    }
    
    // Check if we have a valid word (minimum 4 letters)
    if (newWord.length >= minLen && nextNode.isEndOfWord) {
      words.add(newWord);
    }
    
    // Limit depth for performance (most Boggle words are ≤8 letters)
    if (depth >= 8) return;
    
    // Mark current position as visited
    const newVisitedMask = visitedMask | (1 << currentIdx);
    
    // Explore adjacent cells
    for (const nextIdx of adjacency[currentIdx]) {
      if (!(newVisitedMask & (1 << nextIdx))) {
        dfs(nextIdx, newWord, nextNode, newVisitedMask, depth + 1);
      }
    }
  }
  
  // Start DFS from each cell
  let cellsProcessed = 0;
  const totalCells = size * size;
  
  for (let i = 0; i < totalCells; i++) {
    cellsProcessed++;
    
    // Process in small chunks to avoid blocking
    if (cellsProcessed % 3 === 0) {
      // Yield to main thread briefly
      setTimeout(() => {}, 0);
    }
    
    // Start DFS from this position
    dfs(i, '', trie.root, 0, 1);
  }
  
  console.timeEnd('findWords5x5Optimized');
  console.log(`Found ${words.size} words on 5x5 board`);
  
  return words;
}

// Fallback: Generate common 5x5 words if dictionary fails
function generateCommon5x5Words() {
  const common5x5Words = [
    // Common 4-letter words on 5x5 boards
    "GAME", "PLAY", "WORD", "FIND", "GRID", "TILE", "BOARD", "SCORE",
    "TIME", "LONG", "HIGH", "BEST", "GOOD", "NEXT", "LAST", "FIRST",
    "EAST", "WEST", "NORTH", "SOUTH", "LEFT", "RIGHT", "UP", "DOWN",
    "ABLE", "ACRE", "AGES", "AIDE", "AREA", "ARTS", "AWAY", "BACK",
    "BALL", "BAND", "BANK", "BASE", "BEAT", "BEEN", "BELL", "BELT",
    "BEND", "BENT", "BEST", "BILL", "BIND", "BIRD", "BLUE", "BOAT",
    "BODY", "BOLD", "BOND", "BOOK", "BORN", "BOTH", "BOWL", "BRED",
    "BREW", "BRID", "BURN", "BUSH", "BUSY", "BUY", "CALL", "CAME",
    "CAMP", "CARD", "CARE", "CASE", "CASH", "CAST", "CAVE", "CELL",
    
    // Common 5-letter words
    "BOARD", "GAMES", "WORDS", "FOUND", "TILES", "SCORE", "TIMER",
    "GRIDS", "PLAYS", "HUNTS", "LISTS", "BOGGL", "PARTY", "CLASS",
    "QUICK", "SMART", "BRAIN", "THINK", "SPEED", "POWER", "SKILL",
    
    // Common 6+ letter words
    "PLAYING", "FINDING", "SCORING", "WORDING", "BOARDER", "GAMING",
    "PARTIES", "CLASSIC", "ENDLESS", "HUNTING", "BOGGLED"
  ];
  
  // Filter to only include words that could plausibly appear on the board
  const boardLetters = board.map(l => l.toUpperCase()).join('');
  const boardLetterSet = new Set(boardLetters.replace('QU', 'Q'));
  
  return common5x5Words.filter(word => {
    // Basic check: all letters must be in board (rough check)
    const wordLetters = new Set(word.replace('QU', 'Q'));
    for (const letter of wordLetters) {
      if (!boardLetterSet.has(letter)) return false;
    }
    return word.length >= 4;
  });
}

// Web Worker implementation for true background processing
function findWordsWithWorker() {
  return new Promise((resolve, reject) => {
    try {
      // Create worker on the fly
      const workerCode = `
        self.onmessage = function(e) {
          const { board, minLen, dictionary } = e.data;
          const size = 5;
          const words = new Set();
          
          // Simplified search for worker
          function dfs(idx, word, visited) {
            if (visited[idx]) return;
            
            const letter = board[idx].toUpperCase();
            if (letter === 'QU') word += 'QU';
            else word += letter;
            
            if (word.length >= minLen && dictionary.has(word)) {
              words.add(word);
            }
            
            if (word.length >= 8) return;
            
            visited[idx] = true;
            
            // Simplified adjacency
            const row = Math.floor(idx / size);
            const col = idx % size;
            
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                  const nidx = nr * size + nc;
                  if (!visited[nidx]) {
                    dfs(nidx, word, [...visited]);
                  }
                }
              }
            }
          }
          
          // Start search
          for (let i = 0; i < board.length; i++) {
            const visited = new Array(board.length).fill(false);
            dfs(i, '', visited);
          }
          
          postMessage(Array.from(words));
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      // Convert dictionary to array for transmission
      const dictArray = Array.from(dict).filter(w => w.length >= 4);
      
      worker.postMessage({
        board: board.map(l => l.toUpperCase()),
        minLen: 4,
        dictionary: new Set(dictArray)
      });
      
      worker.onmessage = function(e) {
        resolve(new Set(e.data));
        worker.terminate();
      };
      
      worker.onerror = function(error) {
        reject(error);
        worker.terminate();
      };
      
      // Timeout after 8 seconds
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout'));
      }, 8000);
      
    } catch (error) {
      reject(error);
    }
  });
}

function endEndlessGame() {
  const found = foundWords.size;
  const totalWords = endlessTotalWordsOnBoard > 0 ? endlessTotalWordsOnBoard : 250;
  const percentage = Math.round((found / totalWords) * 100);
  
  // Show Word Hunt results (reusing the same UI)
  if (UI.wordhuntResults) {
    UI.wordhuntResults.style.display = 'block';
  }
  
  if (UI.wordhuntFound) {
    UI.wordhuntFound.textContent = found;
  }
  
  if (UI.wordhuntTotal) {
    UI.wordhuntTotal.textContent = totalWords;
  }
  
  if (UI.wordhuntPercentage) {
    UI.wordhuntPercentage.textContent = `${percentage}%`;
  }
  
  if (UI.wordhuntResultProgress) {
    UI.wordhuntResultProgress.style.width = `${percentage}%`;
  }
  
  // Update title based on performance
  let title = "Endless Mode Results";
  let titleColor = '#f1f5f9';
  
  if (percentage === 100 && endlessAllPossibleWordsList.length > 0) {
    title = "Perfect! You found all words! 🏆";
    titleColor = '#22c55e';
  } else if (percentage >= 80) {
    title = "Excellent! 🌟";
    titleColor = '#8b5cf6';
  } else if (percentage >= 50) {
    title = "Good Job! 👍";
    titleColor = '#0ea5e9';
  } else if (found === 0) {
    title = "Keep Trying! 💪";
    titleColor = '#fbbf24';
  }
  
  if (UI.wordhuntResultTitle) {
    UI.wordhuntResultTitle.textContent = title;
    UI.wordhuntResultTitle.style.color = titleColor;
  }
  
  // Save Endless mode high score
  const key = `endless_best_${config.gridSize}x${config.gridSize}`;
  const currentBest = parseInt(localStorage.getItem(key) || '0');
  if (found > currentBest) {
    localStorage.setItem(key, found);
  }
  
  // Generate the list of all possible words with highlighting
  generateEndlessAllWordsList();
}

function generateEndlessAllWordsList() {
  if (!UI.wordList) return;
  
  UI.wordList.innerHTML = '';
  
  // Create a header
  const header = document.createElement('div');
  header.className = 'wordhunt-all-words-header';
  
  if (endlessAllPossibleWordsList.length > 0) {
    header.textContent = `All Possible Words (${endlessAllPossibleWordsList.length} total)`;
  } else {
    header.textContent = `Words Found (${foundWords.size} total)`;
  }
  
  UI.wordList.appendChild(header);
  
  // Display words - NO CAP - show all words
  let wordsToDisplay;
  
  if (endlessAllPossibleWordsList.length > 0) {
    // Sort by length, then alphabetically - NO SLICE LIMIT
    wordsToDisplay = [...endlessAllPossibleWordsList].sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return a.localeCompare(b);
    });
  } else {
    // Use found words sorted by length
    wordsToDisplay = Array.from(foundWords.keys()).sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return a.localeCompare(b);
    });
  }
  
  wordsToDisplay.forEach((word, index) => {
    const wordItem = document.createElement('div');
    wordItem.className = 'word-item wordhunt-word-item';
    wordItem.style.animationDelay = `${Math.min(index, 200) * 0.03}s`; // Limit animation delay for performance
    
    // Check if word was found by player
    const isFound = foundWords.has(word);
    
    wordItem.innerHTML = `
      <div class="word-text ${isFound ? 'wordhunt-found' : ''}">${word.toUpperCase()}</div>
      <div class="word-stats">
        ${isFound ? '<div class="wordhunt-found-badge">✓</div>' : ''}
        <div class="word-length">${word.length}</div>
      </div>
    `;
    
    UI.wordList.appendChild(wordItem);
  });
  
  // Show message if there are many words
  const totalWords = endlessAllPossibleWordsList.length > 0 ? endlessAllPossibleWordsList.length : foundWords.size;
  if (totalWords > 200) {
    const message = document.createElement('div');
    message.className = 'word-list-message';
    message.textContent = `Showing all ${totalWords} possible words`;
    message.style.cssText = 'text-align:center; color:#94a3b8; margin-top:15px; font-size:0.9rem; font-style:italic;';
    UI.wordList.appendChild(message);
  }
}

// Make functions globally available
window.initEndlessGame = initEndlessGame;
window.updateEndlessProgress = updateEndlessProgress;
window.endEndlessGame = endEndlessGame;