# Retour arrière — SportPilot 0.25.1

Le fix-forward est privilégié. SportPilot 0.25.1 ne modifie aucun schéma de données : base métier Dexie v8, sauvegarde JSON v7, registre des espaces v1 et runtime cloud v10.

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
