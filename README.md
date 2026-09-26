# GB Tennis — clone web du jeu Tennis Game Boy

Un clone jouable dans le navigateur du jeu **Tennis** sorti sur Game Boy en 1989 :
terrain en pseudo-3D, palette 4 tons de vert, score au tennis (0/15/30/40, égalité,
avantage), service avec règle de la boîte de service, coup lifté et lob, IA adverse
à 3 niveaux de difficulté, et habillage visuel façon console (D-pad, boutons A/B,
Start/Select).

Aucune dépendance, aucun build : HTML + CSS + JavaScript (Canvas 2D) purs.

## Lancer le jeu

Ouvrez simplement `index.html` dans un navigateur, ou servez le dossier avec un
petit serveur local (recommandé pour l'audio et éviter les restrictions `file://`) :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Contrôles

| Action                     | Clavier                        | Écran / tactile |
|-----------------------------|---------------------------------|------------------|
| Se déplacer                 | Flèches ou `WASD`               | Croix directionnelle |
| Frapper (coup normal)       | `Espace` ou `Z`                 | Bouton **A** |
| Lob                         | `Maj` ou `X`                    | Bouton **B** |
| Start (lancer / valider)    | `Entrée`                        | **START** |
| Select (changer mode/diff.) | `Tab`                           | **SELECT** |

En mode 2 joueurs, le second joueur utilise `I J K L` pour se déplacer,
`O` pour frapper et `P` pour lober.

## Règles implémentées

- Service dans la bonne boîte diagonale (côté avantage / côté égalité selon le score),
  avec faute simple puis double faute.
- Un rebond autorisé avant de devoir renvoyer la balle ; deux rebonds ou une sortie
  donnent le point à l'adversaire, tout comme une balle dans le filet.
- Score classique par jeu (0, 15, 30, 40, égalité, avantage) et par manche
  (premier à 6 jeux avec 2 jeux d'écart).
- Menu titre : `Select` pour choisir 1 ou 2 joueurs, flèches gauche/droite pour
  la difficulté du CPU (Facile / Normal / Difficile).
