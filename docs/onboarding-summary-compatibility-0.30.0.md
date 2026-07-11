# SportPilot 0.30.0 — U6 Récapitulatif et compatibilité

## Objectif

U6 termine le nouvel onboarding en ajoutant une vérification finale avant la création du profil, la correction directe de chaque rubrique et la création sûre de la première pesée.

## Parcours final

Après l’objectif de pas, l’utilisateur arrive sur l’écran **Vérifiez votre configuration**. Le récapitulatif affiche :

- le mode local ou le compte connecté ;
- le pseudonyme social lorsque le compte en possède un ;
- le nom local ;
- le sexe utilisé pour les calculs ;
- la date de naissance ou l’âge ;
- la taille ;
- le poids ;
- l’objectif et la variation hebdomadaire ;
- l’activité professionnelle ;
- l’objectif de pas.

Chaque rubrique possède une action Modifier qui renvoie vers l’étape correspondante. Le bouton final est **Commencer avec SportPilot**.

## Première pesée

La validation finale vérifie l’historique de poids de l’espace actif :

- si aucune pesée n’existe, une pesée est créée à la date locale du jour avec le poids saisi ;
- si au moins une pesée existe, aucune entrée n’est créée ni remplacée ;
- la sauvegarde du profil n’est lancée qu’après la préparation réussie de cette pesée ;
- une nouvelle tentative reste idempotente grâce à l’historique déjà créé.

Cette règle protège les comptes restaurés et les espaces contenant déjà des données.

## Compatibilité

- Les profils existants continuent d’accéder directement à l’application.
- L’absence de marqueur de version n’invalide jamais un ancien profil.
- Les brouillons U5 restent lisibles et reprennent l’étape enregistrée.
- Un brouillon enregistré sur le récapitulatif reprend directement cet écran.
- Le marqueur de fin d’onboarding est stocké séparément pour chaque espace de données.
- Le mode local et les comptes restent strictement cloisonnés.
- L’identité sociale reste gérée par le garde U4 et n’est pas dupliquée dans le profil privé.

## Données et migrations

Aucune migration D1 ou Dexie n’est nécessaire. Le modèle `UserProfile` et les formules métier ne sont pas modifiés.

## Tests ajoutés

- rendu et actions du récapitulatif ;
- création d’une première pesée ;
- conservation d’un historique existant ;
- arrêt avant création du profil en cas d’échec de pesée ;
- stockage cloisonné de la version d’onboarding ;
- reprise directe du récapitulatif ;
- parcours complet de création du profil et contrôle de la pesée initiale ;
- parcours Playwright mis à jour pour le nouvel écran final.
