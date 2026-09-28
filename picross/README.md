# Picross

Générateur de picross (nonogramme) aléatoire, jouable directement dans le
navigateur.

Aucune dépendance, aucun build : HTML + CSS + JavaScript vanilla purs.

## Lancer le jeu

Ouvrez `picross/index.html` dans un navigateur (double-clic suffit, aucun
serveur requis).

## Règles

- Grille aléatoire à chaque partie (4×4 à 7×7), toujours résoluble par pure
  déduction logique (sans avoir à deviner).
- Clic gauche : noircir une cellule.
- Clic droit ou Alt+clic : marquer une cellule d'une croix (case vide).
- Recliquer sur une cellule déjà marquée (même type d'action) la remet à
  l'état neutre.
- Un indice de ligne/colonne devient vert une fois sa séquence complétée.
- Chronomètre démarré automatiquement, affiché à la victoire.
- Boutons : **Nouveau jeu** (nouvelle grille aléatoire), **Réinitialiser**
  (vide la grille en cours) et **Aide** (affiche la solution en grisé,
  sans la valider).

## Architecture

| Fichier                  | Rôle                                                        |
|---------------------------|--------------------------------------------------------------|
| `constraint-solver.js`   | Vérifie qu'une grille est résoluble par déduction ligne/colonne |
| `grid-generator.js`      | Génère des grilles aléatoires variées (bruit, diagonales, cadre, croix, blocs) et les filtre par solvabilité |
| `index-calculator.js`    | Calcule les indices nonogramme (lignes/colonnes) d'une grille |
| `game.js`                | État du jeu, rendu de la grille, interactions, chronomètre, victoire |
