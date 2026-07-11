# Séries prévues lors du démarrage d'une séance modèle — 0.30.0

## Objectif

Aligner les séances démarrées depuis un modèle sur les séances libres : chaque exercice affiche immédiatement autant de lignes compactes que le nombre de séries prévu dans le modèle.

## Parcours couverts

- démarrage direct depuis la bibliothèque de séances modèles ;
- démarrage d'une séance modèle depuis le planning hebdomadaire ;
- reprise idempotente : une nouvelle initialisation ne duplique pas les séries déjà présentes.

## Valeurs initiales

Chaque ligne générée reprend les objectifs de l'exercice au moment du démarrage :

- répétitions minimales prévues ;
- charge cible ;
- durée ou distance cible selon le mode de suivi ;
- type `working` ;
- état non validé.

Les lignes restent entièrement modifiables, duplicables, supprimables et validables depuis l'interface compacte U16.

## Compatibilité

Aucune migration D1 ou Dexie. Le modèle de données, les historiques, la synchronisation, les records, le volume et les calculs énergétiques ne changent pas.
