# SportPilot 0.22.0 E3 — centre de synchronisation unifié

## Objectif

Le lot E3 ajoute un point de pilotage unique au-dessus des panneaux de synchronisation existants. Il ne remplace pas les services métier : il orchestre leurs méthodes d’analyse et de synchronisation afin de conserver les garanties déjà validées par domaine.

## Rubriques pilotées

- profil et réglages partageables ;
- récompenses, thèmes SportPilot et routines ;
- pesées ;
- activités ;
- objectifs ;
- musculation ;
- journal nutritionnel ;
- bibliothèque nutritionnelle ;
- suivi nutritionnel.

## Comportement global

- **Analyser tout** traite les rubriques actives l’une après l’autre sans modifier les données ;
- **Synchroniser tout** exige une confirmation explicite avant toute écriture ;
- une erreur sur une rubrique n’interrompt pas les rubriques suivantes ;
- les erreurs restent visibles dans la ligne concernée ;
- **Relancer uniquement les rubriques en échec** ne rejoue pas les domaines déjà terminés ;
- les panneaux historiques restent disponibles comme détail et comme solution de repli unitaire ;
- les boutons **Détail** font défiler la page par code, sans modifier le fragment d’URL utilisé par le `HashRouter` ;
- le journal précise qu’une pesée peut recalculer l’objectif quotidien et créer une différence sans modification d’aliment ;
- le retour hors ligne désactive les opérations cloud sans empêcher l’utilisation locale de l’application.

## Métadonnées locales

Le centre conserve uniquement, dans `localStorage`, les dates de dernière analyse et de dernière synchronisation. La clé est isolée par empreinte de compte et ne contient aucune adresse email ni donnée métier.

Ces métadonnées sont facultatives : une indisponibilité du stockage navigateur ne bloque aucune synchronisation.

## Sécurité et non-régression

- aucune donnée métier supplémentaire n’est créée ;
- aucun service de synchronisation existant n’est contourné ;
- aucune opération destructive silencieuse n’est ajoutée ;
- les comptes continuent d’être isolés par les contrôles des services existants ;
- le runtime Dexie Cloud reste en v10 ;
- la base métier reste en v8 ;
- la sauvegarde JSON reste en v7 ;
- la version applicative affichée reste 0.21.1 jusqu’au lot E4.

## Ajustement UX E3.2

- le raccourci **Synchronisation des données** ouvre l’accordéon puis positionne directement le centre unifié, et non le milieu de l’ensemble des panneaux ;
- l’écran de base n’instancie plus simultanément les neuf panneaux unitaires ;
- un clic sur **Détail** affiche uniquement la rubrique choisie sous le centre ;
- un second clic sur **Masquer**, ou la croix du panneau, referme le détail ;
- l’ouverture d’une autre rubrique remplace le détail précédent sans allonger inutilement la page ;
- revenir au centre depuis le sommaire masque le détail précédemment ouvert.


## Ajustement UX E3.3

- le raccourci **Synchronisation des données** repositionne désormais l’en-tête de la rubrique, et non le sous-bloc **État par rubrique** ;
- la fermeture d’un détail par la croix, ou par **Masquer**, ramène automatiquement au début de **Synchronisation des données** ;
- les liens parents **Paramètres** et **Sauvegarde** utilisent une correspondance exacte afin de ne pas rester sélectionnés sur **Rappels** ou **Corbeille** ;
- la barre latérale de bureau, l’en-tête mobile et le menu mobile appliquent la même règle : une seule destination visuelle est active à la fois.
