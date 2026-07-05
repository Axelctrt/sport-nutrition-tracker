# Retour arrière — SportPilot 0.25.1

Le fix-forward est privilégié. La branche 0.26.0 introduit la base métier Dexie v9 et la sauvegarde JSON v8 pour les amis/confidentialité, sans activer de synchronisation sociale cloud. Le garde-fou social F3 bloque tout export détaillé, ce qui limite le rollback à la persistance locale et aux textes de confidentialité.

## En cas de problème IA Gemini

1. désactiver `VITE_PHOTO_NUTRITION_AI_ENDPOINT` dans l’environnement front ;
2. arrêter le proxy IA ou retirer `PHOTO_NUTRITION_AI_API_KEY` côté serveur ;
3. vérifier que le fallback local redevient le comportement par défaut ;
4. livrer un correctif si nécessaire.

## En cas de problème applicatif majeur

1. repasser temporairement au tag `v0.25.0` ;
2. conserver les données utilisateur, aucune migration inverse n’est requise ;
3. préparer un fix-forward depuis la branche de maintenance ;
4. publier une nouvelle version, sans réécrire le tag `v0.25.1`.

Ne jamais réécrire le tag `v0.25.1`. Conserver le tag publié et livrer chaque correctif avec une nouvelle version et un nouveau tag annoté.
