/**
 * GridGenerator : produit des grilles aléatoires solvables et non triviales
 * (4x4 à 7x7, 30-70% de cellules remplies), avec des formes variées.
 */

const PICROSS_SIZES = [4, 5, 6, 7];
const MIN_FILL_RATIO = 0.3;
const MAX_FILL_RATIO = 0.7;
const MAX_ATTEMPTS_PER_SIZE = 400;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function emptyGrid(size) {
  return Array.from({ length: size }, () => new Array(size).fill(0));
}

function fillRatio(grid) {
  const size = grid.length;
  let filled = 0;
  for (const row of grid) for (const cell of row) filled += cell;
  return filled / (size * size);
}

/** Bruit aléatoire : chaque cellule remplie avec une probabilité donnée. */
function patternNoise(size, density) {
  const grid = emptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c] = Math.random() < density ? 1 : 0;
    }
  }
  return grid;
}

/** Diagonale(s) épaisses avec un peu de bruit autour. */
function patternDiagonal(size) {
  const grid = emptyGrid(size);
  const both = Math.random() < 0.5;
  for (let i = 0; i < size; i++) {
    grid[i][i] = 1;
    if (both) grid[i][size - 1 - i] = 1;
    if (Math.random() < 0.35 && i + 1 < size) grid[i][i + 1] = 1;
  }
  return grid;
}

/** Cadre (bordure) de la grille. */
function patternFrame(size) {
  const grid = emptyGrid(size);
  for (let i = 0; i < size; i++) {
    grid[0][i] = 1;
    grid[size - 1][i] = 1;
    grid[i][0] = 1;
    grid[i][size - 1] = 1;
  }
  return grid;
}

/** Croix (ligne + colonne centrales). */
function patternPlus(size) {
  const grid = emptyGrid(size);
  const mid = Math.floor(size / 2);
  for (let i = 0; i < size; i++) {
    grid[mid][i] = 1;
    grid[i][mid] = 1;
  }
  return grid;
}

/** Petits blocs/carrés disséminés. */
function patternBlobs(size) {
  const grid = emptyGrid(size);
  const blobCount = randInt(1, Math.max(1, Math.floor(size / 2)));
  for (let b = 0; b < blobCount; b++) {
    const r0 = randInt(0, size - 1);
    const c0 = randInt(0, size - 1);
    const w = randInt(1, Math.min(2, size));
    const h = randInt(1, Math.min(2, size));
    for (let r = r0; r < Math.min(size, r0 + h); r++) {
      for (let c = c0; c < Math.min(size, c0 + w); c++) {
        grid[r][c] = 1;
      }
    }
  }
  return grid;
}

const PATTERN_BUILDERS = [
  (size) => patternNoise(size, randInt(35, 60) / 100),
  patternDiagonal,
  patternFrame,
  patternPlus,
  patternBlobs,
];

/** Grilles de secours, garanties solvables, si la génération aléatoire échoue. */
const FALLBACK_PATTERNS = {
  4: [
    [
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [0, 1, 1, 0],
    ],
  ],
  5: [
    [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ],
  ],
  6: [
    [
      [1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1],
    ],
  ],
  7: [
    [
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 0, 1, 0, 1, 0],
      [1, 0, 0, 1, 0, 0, 1],
    ],
  ],
};

function isNonTrivial(grid) {
  const ratio = fillRatio(grid);
  return ratio >= MIN_FILL_RATIO && ratio <= MAX_FILL_RATIO;
}

/** Génère une grille aléatoire solvable pour une taille donnée. */
function generateSolvableGrid(size) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_SIZE; attempt++) {
    const builder = PATTERN_BUILDERS[randInt(0, PATTERN_BUILDERS.length - 1)];
    const grid = builder(size);
    if (!isNonTrivial(grid)) continue;
    if (isLogicallySolvable(grid)) return grid;
  }

  const fallbacks = FALLBACK_PATTERNS[size] || FALLBACK_PATTERNS[5];
  return fallbacks[randInt(0, fallbacks.length - 1)].map((row) => row.slice());
}

/** Point d'entrée : choisit une taille aléatoire et génère la grille solution. */
function generatePuzzle() {
  const size = PICROSS_SIZES[randInt(0, PICROSS_SIZES.length - 1)];
  const grid = generateSolvableGrid(size);
  return { size, grid };
}
