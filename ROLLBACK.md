# Retour arrière — SportPilot 0.28.0

Le fix-forward est privilégié. SportPilot 0.28.0 finalise la préparation du backend social cloud réel : identités cloud, réservation de handles, recherche exacte, demandes d’amis cloud, amitiés cloud, permissions synchronisées et snapshots sociaux distants filtrés.

## En cas de problème sur la page Amis

1. désactiver temporairement les blocs cloud social par fix-forward ;
2. conserver l’AppDatabase Dexie v10 pour éviter toute perte de données sociales locales ;
3. conserver la sauvegarde JSON v9 ;
4. vérifier que les préférences, demandes, amis et permissions restent restaurables.

## En cas de problème de recherche ou demandes cloud

1. remettre `VITE_ENABLE_REAL_SOCIAL_CLOUD=false` ;
2. conserver la recherche exacte locale/fallback ;
3. vérifier que les messages `Identifiant inexistant` et `Service cloud indisponible` restent visibles ;
4. livrer un correctif sans ouvrir d’annuaire public ni de suggestions.

## En cas de problème d’amitiés ou permissions cloud

1. suspendre la création d’amitiés cloud via fix-forward ;
2. conserver les relations basées sur `userId` ;
3. conserver le résumé par défaut ;
4. ne jamais activer le détail sans consentement explicite.

## En cas de problème de snapshots sociaux cloud

1. suspendre la publication de snapshots distants ;
2. conserver uniquement les snapshots filtrés déjà validés ;
3. vérifier que `rawActivityShared` reste à `false` ;
4. ne jamais créer de table `socialRawActivities`.

## En cas de problème IA Gemini

1. désactiver `VITE_PHOTO_NUTRITION_AI_ENDPOINT` dans l’environnement front ;
2. retirer temporairement `PHOTO_NUTRITION_AI_API_KEY` côté serveur ;
3. vérifier que le fallback local redevient le comportement par défaut ;
4. livrer un correctif si nécessaire.

## En cas de problème applicatif majeur

1. repasser temporairement au tag `v0.27.0` ;
2. ne pas réécrire le tag `v0.28.0` si celui-ci a déjà été publié ;
3. préparer un fix-forward depuis une branche dédiée ;
4. publier une nouvelle version et un nouveau tag annoté.

Ne jamais réécrire un tag publié. Conserver `v0.28.0` et livrer chaque correctif avec une nouvelle version.
