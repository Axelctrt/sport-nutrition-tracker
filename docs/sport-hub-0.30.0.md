# SportPilot 0.30.0 — U13 Hub Sport

## Objectif

La phase U13 transforme la route historique `/activities` en hub Sport mobile-first. L’écran répond immédiatement à deux questions :

- que vais-je faire ?
- qu’ai-je déjà fait ?

Les routes et services existants restent la source de vérité. Aucun calcul calorique, aucune donnée métier et aucune synchronisation ne sont réécrits.

## Contenu du hub

Le haut de page affiche :

- une action principale pour démarrer ou ajouter une activité ;
- la séance de musculation en cours, lorsqu’elle existe ;
- les prochaines séances planifiées ;
- le dernier entraînement enregistré ;
- un résumé de la semaine ;
- les activités fréquentes, triées selon l’historique ;
- les accès directs au carnet, aux modèles, au planning et aux exercices de musculation.

Le journal par date reste disponible sous le hub avec ses fonctions existantes : modification, duplication, suppression, mise en évidence et retour vers la journée d’origine.

## Démarrage d’une activité

Un panneau inférieur propose :

- course ;
- musculation ;
- marche ;
- vélo ;
- natation ;
- autre cardio.

L’ordre s’adapte à la fréquence observée dans l’historique. Les formulaires existants sont réutilisés avec la date et le contexte de retour du journal.

## Planning et continuité

- une séance de musculation en cours ouvre directement son écran de suivi ;
- une séance de musculation planifiée ouvre son entrée dans le planning ;
- une activité d’endurance planifiée ouvre le formulaire correspondant avec sa référence de planification ;
- le dernier entraînement ouvre la bonne journée du journal.

## Résumé hebdomadaire

La semaine suit la convention lundi-dimanche et affiche :

- nombre de séances ;
- durée totale ;
- calories d’activité ;
- distance course et vélo ;
- distance de natation séparée lorsque présente.

## Compatibilité

- `/activities` reste la route principale Sport ;
- les routes historiques d’ajout, de planning, de musculation et d’endurance restent valides ;
- aucune migration D1 ou Dexie ;
- aucune modification des formules ;
- aucune suppression de fonctionnalité du journal.

## Tests

Les tests couvrent :

- sélection du dernier entraînement ;
- séance active et planning ;
- résumé hebdomadaire ;
- classement des types fréquents ;
- routes de création et références planifiées ;
- panneau inférieur accessible ;
- chargement et actualisation silencieuse du hub ;
- états vide et renseigné ;
- navigation mobile et métadonnées de route.
