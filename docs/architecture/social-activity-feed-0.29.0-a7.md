# SportPilot 0.29.0 A7 — chargement réel du fil d’activité amis

## Statut et périmètre

A7 connecte l’interface « Amis et confidentialité » aux endpoints cloud préparés en A6.

Le flux de lecture devient :

```text
session Dexie Cloud active
→ GET /api/social-activity-feed
→ cartes paginées sans bloc detail
→ ouverture volontaire d’une carte
→ GET /api/social-activity-snapshots/detail
→ nouvelle vérification serveur des droits
→ affichage vertical du détail autorisé
```

A7 ne modifie ni le modèle métier des activités, ni la base Dexie principale, ni la migration D1 A6.

## Cartes du fil

Chaque carte peut afficher uniquement les données déjà présentes dans le snapshot filtré :

- nom affiché et handle social du propriétaire ;
- type et titre de l’activité ;
- date relative et date exacte accessible ;
- durée ;
- distance ;
- allure ou vitesse ;
- dénivelé ;
- calories ;
- fréquence cardiaque ;
- cadence ;
- nombre d’exercices ;
- volume de musculation.

Le serveur enrichit la carte avec le profil issu de `social_directory_handles`. Il retire toujours le bloc `detail` de la réponse du fil.

## Chargement du détail

Le détail n’est pas préchargé avec la page. Il est demandé uniquement après action explicite de l’utilisateur.

La route dédiée revérifie :

- la session du destinataire ;
- l’amitié active ;
- le niveau de permission actuel ;
- le consentement détaillé.

Une permission révoquée entre le chargement de la carte et l’ouverture du détail entraîne donc un refus serveur.

## Interface mobile-first

Le panneau utilise :

- une lecture verticale ;
- des cartes tactiles sans action au survol ;
- un bouton de détail pleine largeur sur petit écran ;
- une feuille modale ancrée en bas sur mobile ;
- une modale centrée et limitée en largeur sur ordinateur ;
- un défilement interne limité à `92dvh` ;
- une fermeture par bouton, clic sur le fond ou touche Échap ;
- des cibles tactiles conformes aux composants existants.

Le détail de musculation utilise une liste verticale d’exercices et de séries. Aucun grand tableau horizontal n’est introduit.

## Pagination et actualisation

La pagination consomme le curseur opaque fourni par A6. Les snapshots sont dédupliqués par `snapshotId` côté client.

Le fil peut être actualisé :

- manuellement ;
- au retour en ligne ;
- lors d’un changement de session Dexie Cloud.

Le détail reste chargé à la demande afin d’éviter un transfert initial inutile.

## États couverts

A7 distingue :

- chargement initial ;
- compte non connecté ;
- fil vide ;
- erreur réseau ;
- mode hors ligne ;
- chargement d’une page supplémentaire ;
- détail en cours de chargement ;
- détail refusé ou indisponible.

Les cartes déjà affichées restent visibles si une actualisation échoue ou si le navigateur passe hors ligne.

## Compatibilité avec le démonstrateur historique

Les tests historiques peuvent toujours injecter `initialActivitySnapshots`. Dans ce cas, le panneau local F5 reste utilisé afin de préserver la couverture de non-régression.

En production, sans injection de test, la page utilise le gateway cloud A7.

## Limites encore ouvertes

A7 ne finalise pas encore :

- le cache entrant persistant après fermeture complète de la PWA ;
- le graphique cardio interactif ;
- les composants visuels avancés du détail musculation ;
- les réglages globaux 0.29 complets ;
- la surcharge de confidentialité par activité ;
- les réactions, commentaires, notifications ou défis.
