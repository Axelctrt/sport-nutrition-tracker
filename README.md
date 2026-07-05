# SportPilot 0.26.0

SportPilot 0.26.0 ajoute le socle amis et confidentialité. La version prépare un réseau privé local : demandes envoyées et reçues, acceptation manuelle, préférences de visibilité, persistance Dexie, sauvegarde JSON et garde-fou explicite contre tout partage détaillé non consenti.

## Amis et confidentialité

- nouvelle route `/friends` accessible depuis la navigation ;
- page “Amis et confidentialité” dédiée aux invitations et réglages sociaux ;
- demandes entrantes et sortantes avec acceptation ou refus manuel ;
- préférences de visibilité du profil et d’autorisation des demandes ;
- persistance locale des amis, demandes et préférences ;
- export/restauration via sauvegarde JSON v8 ;
- aucun partage détaillé d’activité en 0.26.0.

## Garde-fou social

Le mode “Détaillé après accord” peut être choisi comme préférence, mais il reste bloqué par le garde-fou de 0.26.0. L’application limite l’exposition sociale au résumé tant que le consentement explicite par ami n’est pas livré. Les exports sociaux détaillés, consentements par ami et flux d’activité partagé sont réservés à 0.27.0.

## Stockage et sauvegarde

La base métier passe en Dexie v9 pour ajouter les tables locales `friendProfiles`, `friendRequests` et `friendsPrivacySettings`. Le format de sauvegarde reste en JSON v8 et inclut ces tables. Le registre local des espaces reste en v1 et le runtime Dexie Cloud reste en v10, sans synchronisation sociale réelle entre comptes.

## IA photo nutritionnelle

Le parcours IA Gemini livré en 0.25.1 reste disponible. La clé Gemini reste côté serveur, le consentement photo reste obligatoire avant envoi externe, et le fallback local reste actif si Gemini, le proxy ou les quotas échouent.

## Arbitrage bundle

Le budget JavaScript reste aligné sur le budget accepté pour l’UX photo, IA et confidentialité sociale. L’optimisation du bundle reste un chantier technique séparé.
