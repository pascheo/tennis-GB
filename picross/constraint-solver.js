/**
 * ConstraintSolver : vérifie qu'une grille est résoluble par pure déduction
 * logique ligne/colonne (technique classique du "line solving"), sans avoir
 * besoin de deviner. Sert à filtrer les grilles générées aléatoirement pour
 * ne garder que celles qui sont jouables de façon logique.
 */

/**
 * Énumère tous les remplissages valides d'une ligne de longueur `length`
 * respectant l'indice `clue` (ex: [2,1]) et compatibles avec les contraintes
 * déjà connues `known` (tableau de 0/1/null, null = inconnu).
 */
function enumerateLineFillings(clue, length, known) {
  const results = [];
  const isEmptyClue = clue.length === 1 && clue[0] === 0;

  function matches(line) {
    for (let i = 0; i < length; i++) {
      if (known[i] !== null && known[i] !== line[i]) return false;
    }
    return true;
  }

  if (isEmptyClue) {
    const line = new Array(length).fill(0);
    if (matches(line)) results.push(line);
    return results;
  }

  const nBlocks = clue.length;

  function place(blockIndex, pos, arr) {
    if (blockIndex === nBlocks) {
      const line = arr.slice();
      for (let i = pos; i < length; i++) line[i] = 0;
      if (matches(line)) results.push(line);
      return;
    }
    const blockLen = clue[blockIndex];
    let remainingMin = 0;
    for (let i = blockIndex + 1; i < nBlocks; i++) remainingMin += clue[i] + 1;
    const maxStart = length - remainingMin - blockLen;

    for (let start = pos; start <= maxStart; start++) {
      const arr2 = arr.slice();
      for (let i = pos; i < start; i++) arr2[i] = 0;
      for (let i = start; i < start + blockLen; i++) arr2[i] = 1;
      const nextPos = blockIndex === nBlocks - 1 ? start + blockLen : start + blockLen + 1;
      place(blockIndex + 1, nextPos, arr2);
    }
  }

  place(0, 0, new Array(length).fill(0));
  return results;
}

/**
 * Détermine si `grid` (tableau 2D de 0/1) peut être entièrement déduite
 * par déduction ligne/colonne à partir de ses seuls indices, sans devoir
 * essayer plusieurs hypothèses. Retourne true/false.
 */
function isLogicallySolvable(grid) {
  const size = grid.length;
  const rowClues = grid.map(computeLineClue);
  const colClues = [];
  for (let c = 0; c < size; c++) {
    const col = grid.map((row) => row[c]);
    colClues.push(computeLineClue(col));
  }

  const known = Array.from({ length: size }, () => new Array(size).fill(null));

  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < size; r++) {
      const known_r = known[r];
      const possibilities = enumerateLineFillings(rowClues[r], size, known_r);
      if (possibilities.length === 0) return false;
      for (let c = 0; c < size; c++) {
        if (known_r[c] !== null) continue;
        const first = possibilities[0][c];
        if (possibilities.every((p) => p[c] === first)) {
          known_r[c] = first;
          changed = true;
        }
      }
    }

    for (let c = 0; c < size; c++) {
      const known_c = known.map((row) => row[c]);
      const possibilities = enumerateLineFillings(colClues[c], size, known_c);
      if (possibilities.length === 0) return false;
      for (let r = 0; r < size; r++) {
        if (known[r][c] !== null) continue;
        const first = possibilities[0][r];
        if (possibilities.every((p) => p[r] === first)) {
          known[r][c] = first;
          changed = true;
        }
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (known[r][c] === null) return false;
    }
  }
  return true;
}

/** Calcule l'indice (liste de longueurs de blocs) d'une ligne 0/1. */
function computeLineClue(line) {
  const clue = [];
  let run = 0;
  for (const cell of line) {
    if (cell === 1) {
      run++;
    } else if (run > 0) {
      clue.push(run);
      run = 0;
    }
  }
  if (run > 0) clue.push(run);
  return clue.length ? clue : [0];
}
