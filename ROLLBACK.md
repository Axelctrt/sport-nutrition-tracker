# Retour arrière — SportPilot 0.26.0

Le fix-forward est privilégié. SportPilot 0.26.0 introduit la base métier Dexie v9, la sauvegarde JSON v8 et les tables locales d’amis/confidentialité, sans synchronisation sociale cloud réelle et sans export détaillé d’activité.

## En cas de problème sur la page Amis

1. désactiver temporairement l’accès à la route `/friends` par fix-forward ;
2. conserver les tables Dexie v9 pour éviter toute perte de données locales ;
3. livrer un correctif sur la branche de maintenance ;
4. vérifier que les préférences de confidentialité restent restaurables depuis JSON v8.

## En cas de problème de sauvegarde/restauration sociale

1. conserver les exports JSON v8 générés par l’utilisateur ;
2. corriger le mapping `friendProfiles`, `friendRequests` et `friendsPrivacySettings` ;
3. relancer les tests `friendsPrivacyBackup` et `backupService` ;
4. livrer une nouvelle version de correction.

## En cas de problème IA Gemini

1. désactiver `VITE_PHOTO_NUTRITION_AI_ENDPOINT` dans l’environnement front ;
2. retirer temporairement `PHOTO_NUTRITION_AI_API_KEY` côté serveur ;
3. vérifier que le fallback local redevient le comportement par défaut ;
4. livrer un correctif si nécessaire.

## En cas de problème applicatif majeur

1. repasser temporairement au tag `v0.25.1` ;
2. ne pas réécrire le tag `v0.26.0` si celui-ci a déjà été publié ;
3. préparer un fix-forward depuis une branche dédiée ;
4. publier une nouvelle version et un nouveau tag annoté.

Ne jamais réécrire un tag publié. Conserver `v0.26.0` et livrer chaque correctif avec une nouvelle version.
