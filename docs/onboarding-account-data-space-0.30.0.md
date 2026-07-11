# SportPilot 0.30.0 — U3 : choix local, compte et espace de données

## Objectif

U3 ajoute le choix initial entre un espace local invité et un compte connecté avant la création du profil. L’authentification email/OTP réutilise le client Dexie Cloud existant et délègue la résolution des données à `DataSpaceAccountGate`.

## Parcours local

1. L’utilisateur choisit explicitement le mode local.
2. Si un compte était ouvert, il est déconnecté avant le retour à l’espace invité.
3. Le profil est créé dans la base locale invitée.
4. L’interface rappelle que les données peuvent être perdues si le stockage du navigateur est effacé.
5. Un compte peut être ajouté plus tard depuis `Paramètres → Compte et appareils`.

## Parcours compte

1. L’utilisateur saisit son adresse email.
2. Dexie Cloud envoie un code à usage unique.
3. Le code est soumis via l’interaction OTP existante.
4. `DataSpaceAccountGate` masque les données tant que l’espace n’est pas résolu.
5. Selon la situation, l’utilisateur choisit explicitement :
   - un espace déjà connu ;
   - une restauration cloud ;
   - l’association des données invitées après aperçu ;
   - un espace de compte vide.
6. Le profil est créé uniquement après ouverture de l’espace retenu.

## Protection des données

- Aucun import, écrasement ou effacement silencieux.
- Les données d’un autre compte restent masquées pendant la résolution.
- Les codes OTP et secrets ne sont jamais écrits dans le brouillon.
- Les brouillons de profil sont cloisonnés par identifiant d’espace de données.
- La clé historique `sportpilot:onboarding:draft:v1` reste réservée à l’espace invité pour préserver la reprise locale existante.
- Les espaces de compte utilisent une clé dédiée dérivée de leur `DataSpaceId`.

## Compatibilité

- Aucune migration Dexie ou D1.
- Aucun changement de schéma cloud.
- Les mécanismes existants d’import invité, de restauration cloud et d’isolation des comptes restent la source de vérité.
- L’identifiant social obligatoire sera ajouté séparément en U4.
- La décomposition du profil en une question par écran sera réalisée en U5.
