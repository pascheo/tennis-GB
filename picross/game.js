/**
 * GameState + rendu : orchestre la génération, l'affichage de la grille,
 * les interactions, le chronomètre, l'aide et la détection de victoire.
 */

const CELL_NEUTRAL = 0;
const CELL_FILLED = 1;
const CELL_CROSSED = 2;

const state = {
  size: 5,
  solution: null, // grille 0/1 (la réponse)
  clues: null, // { rows, cols }
  player: null, // grille d'états CELL_*
  startedAt: 0,
  elapsedMs: 0,
  timerHandle: null,
  won: false,
  helpVisible: false,
};

const els = {
  boardGrid: document.getElementById('board-grid'),
  timer: document.getElementById('timer'),
  newGameBtn: document.getElementById('btn-new-game'),
  resetBtn: document.getElementById('btn-reset'),
  helpBtn: document.getElementById('btn-help'),
  victoryModal: document.getElementById('victory-modal'),
  victoryTime: document.getElementById('victory-time'),
  victoryNewGameBtn: document.getElementById('btn-victory-new-game'),
  board: document.getElementById('board'),
};

function startNewGame() {
  const { size, grid } = generatePuzzle();
  state.size = size;
  state.solution = grid;
  state.clues = computeClues(grid);
  state.player = Array.from({ length: size }, () => new Array(size).fill(CELL_NEUTRAL));
  state.won = false;
  state.helpVisible = false;
  resetTimer();
  render();
}

function resetPlayerGrid() {
  if (!state.solution) return;
  state.player = Array.from({ length: state.size }, () => new Array(state.size).fill(CELL_NEUTRAL));
  state.won = false;
  state.helpVisible = false;
  resetTimer();
  render();
}

function resetTimer() {
  clearInterval(state.timerHandle);
  state.startedAt = Date.now();
  state.elapsedMs = 0;
  updateTimerDisplay();
  state.timerHandle = setInterval(() => {
    state.elapsedMs = Date.now() - state.startedAt;
    updateTimerDisplay();
  }, 250);
}

function stopTimer() {
  clearInterval(state.timerHandle);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  els.timer.textContent = formatTime(state.elapsedMs);
}

function setCellState(r, c, newState) {
  if (state.won) return;
  const current = state.player[r][c];
  state.player[r][c] = current === newState ? CELL_NEUTRAL : newState;
  render();
  checkVictory();
}

function checkVictory() {
  const { size, solution, player } = state;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const shouldBeFilled = solution[r][c] === 1;
      const isFilled = player[r][c] === CELL_FILLED;
      if (shouldBeFilled !== isFilled) return;
    }
  }
  state.won = true;
  stopTimer();
  showVictory();
}

function showVictory() {
  els.victoryTime.textContent = formatTime(state.elapsedMs);
  els.victoryModal.classList.add('visible');
}

function hideVictory() {
  els.victoryModal.classList.remove('visible');
}

function toggleHelp() {
  if (state.won) return;
  state.helpVisible = !state.helpVisible;
  render();
}

function lineIsComplete(clue, playerLine) {
  const playerClue = computePlayerLineClue(playerLine);
  if (playerClue.length !== clue.length) return false;
  return playerClue.every((v, i) => v === clue[i]);
}

/**
 * Le plateau est une unique grille CSS de (size+1) colonnes x (size+1)
 * lignes : coin vide, indices colonnes en haut, indices lignes à gauche,
 * cellules de jeu au centre. Une seule grille garantit l'alignement.
 */
function render() {
  const { size, clues, player, solution, helpVisible } = state;
  const board = els.boardGrid;

  board.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
  board.style.gridTemplateRows = `auto repeat(${size}, 1fr)`;
  board.innerHTML = '';

  board.appendChild(document.createElement('div')).className = 'corner';

  for (let c = 0; c < size; c++) {
    const col = player.map((row) => row[c]);
    const complete = lineIsComplete(clues.cols[c], col);
    const cell = document.createElement('div');
    cell.className = 'clue-cell col-clue' + (complete ? ' complete' : '');
    cell.innerHTML = clues.cols[c].map((n) => `<span>${n}</span>`).join('');
    board.appendChild(cell);
  }

  for (let r = 0; r < size; r++) {
    const complete = lineIsComplete(clues.rows[r], player[r]);
    const rowClue = document.createElement('div');
    rowClue.className = 'clue-cell row-clue' + (complete ? ' complete' : '');
    rowClue.innerHTML = clues.rows[r].map((n) => `<span>${n}</span>`).join('');
    board.appendChild(rowClue);

    for (let c = 0; c < size; c++) {
      const cellState = player[r][c];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('aria-label', `Cellule ligne ${r + 1}, colonne ${c + 1}`);

      if (cellState === CELL_FILLED) cell.classList.add('filled');
      if (cellState === CELL_CROSSED) cell.classList.add('crossed');
      if (helpVisible && solution[r][c] === 1) cell.classList.add('hint');

      cell.addEventListener('click', (e) => {
        if (e.altKey) {
          setCellState(r, c, CELL_CROSSED);
        } else {
          setCellState(r, c, CELL_FILLED);
        }
      });
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        setCellState(r, c, CELL_CROSSED);
      });

      board.appendChild(cell);
    }
  }
}

els.newGameBtn.addEventListener('click', startNewGame);
els.resetBtn.addEventListener('click', resetPlayerGrid);
els.helpBtn.addEventListener('click', toggleHelp);
els.victoryNewGameBtn.addEventListener('click', () => {
  hideVictory();
  startNewGame();
});

startNewGame();
