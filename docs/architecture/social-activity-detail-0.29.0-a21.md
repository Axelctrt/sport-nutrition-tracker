# SportPilot 0.29.0 — A21 — Fiche d’activité sociale

## Objectif

Permettre d’ouvrir chaque activité du fil dans une fiche mobile compacte, y compris lorsqu’elle est partagée en résumé uniquement.

## Expérience

- Toute carte propose une seule action claire : **Ouvrir l’activité**.
- La fiche est une feuille basse sur mobile et une boîte de dialogue centrée sur ordinateur.
- Le résumé reste ouvrable et affiche explicitement **Résumé uniquement**.
- Le partage personnalisé présente uniquement les métriques et structures reçues : cardio, exercices, séries, répétitions, charges, repos et RPE selon les autorisations.
- Les états chargement, erreur, absence de métrique et absence de détail sont explicites sans surcharger l’écran.

## Sécurité

- La route dédiée relit D1 à chaque ouverture.
- L’amitié active et la permission courante sont revérifiées côté serveur.
- La sélection granulaire est réappliquée avant la réponse HTTP.
- Le client vérifie que le snapshot reçu correspond exactement à la carte sélectionnée.
- Une réponse tardive ne peut pas rouvrir une fiche déjà fermée.

## Accessibilité et mobile

- fermeture par bouton, touche Échap ou fond de la feuille ;
- retour du focus vers le bouton d’origine ;
- confinement du focus au clavier ;
- blocage du défilement de la page ;
- prise en charge de la zone sûre iPhone ;
- zones tactiles d’au moins 44 px.

## Données

Aucune migration D1 ou Dexie n’est requise. A21 réutilise le contrat `0.29.0-a3` et la route `/api/social-activity-snapshots/detail` existante.
