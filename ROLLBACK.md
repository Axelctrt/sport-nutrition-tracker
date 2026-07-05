# Retour arrière — SportPilot 0.27.0

Le fix-forward est privilégié. SportPilot 0.27.0 introduit l’activité sociale contrôlée : identité publique, demandes d’amis réelles préparées, permissions par ami, snapshots filtrés et feed minimal, avec Dexie v10 et sauvegarde JSON v9.

## En cas de problème sur la page Amis

1. désactiver temporairement les blocs feed/snapshots par fix-forward ;
2. conserver les tables Dexie v10 pour éviter toute perte de permissions sociales locales ;
3. livrer un correctif sur la branche de maintenance ;
4. vérifier que les préférences, demandes et permissions restent restaurables depuis JSON v9.

## En cas de problème de feed social

1. masquer temporairement le bloc “Fil d’activité amis” ;
2. conserver la génération de snapshots filtrés si les tests anti-fuite restent verts ;
3. vérifier que le feed ne lit jamais les activités brutes ;
4. relancer `socialActivityFeed` et `socialActivitySnapshots`.

## En cas de problème de sauvegarde/restauration sociale

1. conserver les exports JSON v9 générés par l’utilisateur ;
2. corriger le mapping `friendProfiles`, `friendRequests`, `friendsPrivacySettings` et `friendActivityPermissions` ;
3. relancer les tests `friendsPrivacyBackup`, `backupService` et readiness sociale ;
4. livrer une nouvelle version de correction.

## En cas de problème IA Gemini

1. désactiver `VITE_PHOTO_NUTRITION_AI_ENDPOINT` dans l’environnement front ;
2. retirer temporairement `PHOTO_NUTRITION_AI_API_KEY` côté serveur ;
3. vérifier que le fallback local redevient le comportement par défaut ;
4. livrer un correctif si nécessaire.

## En cas de problème applicatif majeur

1. repasser temporairement au tag `v0.26.0` ;
2. ne pas réécrire le tag `v0.27.0` si celui-ci a déjà été publié ;
3. préparer un fix-forward depuis une branche dédiée ;
4. publier une nouvelle version et un nouveau tag annoté.

Ne jamais réécrire un tag publié. Conserver `v0.27.0` et livrer chaque correctif avec une nouvelle version.
