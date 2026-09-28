/**
 * IndexCalculator : calcule les indices (clues) de lignes et colonnes
 * d'une grille solution, au format nonogramme standard.
 */

/** Indices de toutes les lignes et colonnes d'une grille 0/1. */
function computeClues(grid) {
  const size = grid.length;
  const rows = grid.map(computeLineClue);
  const cols = [];
  for (let c = 0; c < size; c++) {
    const col = grid.map((row) => row[c]);
    cols.push(computeLineClue(col));
  }
  return { rows, cols };
}

/** Indices (liste de longueurs de blocs) déduits de l'état actuel du joueur pour une ligne. */
function computePlayerLineClue(line) {
  return computeLineClue(line.map((state) => (state === CELL_FILLED ? 1 : 0)));
}
