# SportPilot 0.18.0

## Espaces de données isolés

- conservation de la base historique comme espace local invité ;
- création d’une base IndexedDB distincte pour chaque compte ;
- noms de bases dérivés d’empreintes opaques ;
- registre local robuste sans email, jeton ni secret ;
- barrière de confidentialité montée avant tous les providers métier.

## Parcours de compte

- choix explicite entre rattachement des données invitées et espace vide ;
- copie non destructive des données invitées ;
- ouverture et réassociation d’un espace existant ;
- retour automatique à l’espace invité après déconnexion ;
- page **Compte et appareils** ;
- distinction entre déconnexion, désassociation locale et suppression locale.

## Durcissement

- refus de toute copie compte-vers-compte ;
- refus de recréer comme vide un espace déjà enregistré ;
- test d’intégration couvrant profil, pesée, activité, nutrition, musculation et objectif entre compte A, compte B et invité ;
- audit de release `audit:account-isolation` intégré à `check` et `ci`.

## Compatibilité

- schéma Dexie principal inchangé en v8 ;
- sauvegarde JSON inchangée en v7 ;
- registre local des espaces en v1 ;
- synchronisation cloud toujours limitée aux pesées.
