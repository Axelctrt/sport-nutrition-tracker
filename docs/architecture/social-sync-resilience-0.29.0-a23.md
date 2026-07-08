# SportPilot 0.29.0 — A23 Synchronisation et résilience sociale

## Objectif

Garantir que le module social conserve un état local valide pendant une panne
réseau ou D1, puis reprenne automatiquement sans doublon ni écrasement par une
réponse obsolète.

## Règles d'autorité

Une liste vide n'est autoritaire que lorsqu'elle provient d'une réponse serveur
valide. Une erreur réseau, un statut HTTP d'échec ou un JSON mal formé est
classé `unavailable` et ne doit jamais purger :

- les amis locaux ;
- les demandes locales ;
- les permissions locales par ami.

Les amitiés et permissions ne sont remplacées qu'après une synchronisation
confirmée. Les sources cloud indépendantes peuvent réussir ou échouer
séparément ; une panne partielle ne bloque pas le chargement du cache local.

## Concurrence des mutations

Les sauvegardes locales sont sérialisées afin de préserver l'ordre utilisateur.
Les mutations de permission utilisent une version par ami : une confirmation ou
un échec ancien ne peut plus rétablir un réglage remplacé entre-temps.

## Reprise de l'outbox sociale

Lorsqu'une publication de snapshot échoue, la prochaine échéance de retry est
persistée et remontée au runtime. Le runtime programme automatiquement une
nouvelle tentative, y compris après réouverture de la PWA lorsqu'aucun nouvel
événement n'est émis.

Les accusés de réception restent protégés par `mutationSequence`, ce qui empêche
une réponse ancienne d'écraser une modification ou une suppression plus récente.

## Expérience utilisateur

En cas d'indisponibilité sociale temporaire, la page reste utilisable et affiche
un retour non bloquant indiquant que les données locales ont été conservées.
Les mutations serveur non confirmées ne sont pas présentées comme acquises.

## Migrations

- D1 : aucune.
- Dexie : aucune.
