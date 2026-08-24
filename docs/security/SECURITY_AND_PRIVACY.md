# Sécurité et confidentialité

Statut : **décisions validées**.

## Frontière client/serveur

- Toute variable `VITE_*` est publique dans le bundle.
- Les clés Dexie Cloud, IA et autres secrets restent dans le gestionnaire de
  secrets ou l’environnement serveur.
- Les Pages Functions valident méthode, corps, identité, autorisation et taille
  avant tout accès D1 ou fournisseur externe.
- Les messages utilisateur n’exposent pas de secret, requête SQL ou détail
  d’infrastructure.

## Données locales et comptes

- L’espace invité, le profil local et chaque compte sont isolés.
- Un changement de compte masque l’ancien espace avant toute restauration.
- Les exports peuvent contenir des données sensibles : consentement,
  destination et conservation doivent être explicites.
- Une restauration valide intégrité et version avant écriture et crée une
  sauvegarde de sécurité lorsque le parcours le prévoit.
- Le journal immuable Goals porte l’identifiant du compte dans chaque mutation.
  Le resolver exige à la fois la propriété Dexie Cloud et cet identifiant exact
  avant de rendre une mutation autoritative. Le head causal est déterministe,
  non privé et isolé dans le realm ; aucun timestamp ni champ d’authentification
  ne participe au choix du gagnant.
- La purge distante filtre `realGoalMutations`, `realGoalMutationHeads`, le
  clock v17 legacy et les baselines par compte ; elle vérifie ensuite qu’aucune
  ligne du compte supprimé ne subsiste sans effacer les lignes ou baselines
  d’un autre compte.

## Photos de progression

- Les images sont privées, locales et rattachées à la base Dexie de l’espace
  actuellement ouvert.
- Elles sont redimensionnées et compressées dans le navigateur ; l’original
  importé n’est pas téléversé vers un serveur.
- Les métadonnées, l’original compressé et la miniature sont écrits et supprimés
  transactionnellement.
- Aucun adaptateur Dexie Cloud, domaine de synchronisation, endpoint D1 ou
  fournisseur IA ne reçoit ces images.
- L’import invité générique et la sauvegarde JSON générale les excluent. Un
  transfert exige l’archive photo dédiée et une action explicite.
- Les archives photo sont sensibles : l’utilisateur choisit leur destination,
  leur conservation et leur suppression.
- Une personne ayant accès à l’appareil et au profil du navigateur peut
  potentiellement consulter les images ; IndexedDB n’est pas un coffre chiffré.
- La suppression individuelle ou complète retire aussi les miniatures. Un
  nettoyage local répare les assets orphelins.

## Social

- L’identité sociale est réconciliée côté serveur ; un identifiant fourni par
  le navigateur n’est pas à lui seul une preuve d’identité.
- Les permissions sont appliquées à la publication et à la lecture.
- Les détails privés ne sont jamais déduits d’un résumé.
- Les photos de progression ne sont jamais proposées comme contenu social.
- Suppression d’amitié et révocation de permission doivent empêcher les
  lectures futures et converger côté local/cloud.

## Photo nutrition et IA

- Consentement avant envoi.
- Proxy same-origin et clé serveur uniquement.
- Limites de taille, type, méthode, timeout et débit.
- Résultat présenté comme estimation à confirmer.
- Le parcours de photo nutritionnelle reste distinct des photos de progression
  persistantes et locales.
- Aucun élargissement de données, fournisseur ou finalité sans revue dédiée.

## Dépendances et en-têtes

`public/_headers` est la source des en-têtes servis et repris en Preview Vite.
Les changements CSP, dépendances ou permissions navigateur exigent une revue de
surface d’attaque. `npm audit` est informatif : ne pas appliquer
`npm audit fix --force` sans analyse des changements majeurs.

## Signalement

Ne pas ouvrir une issue publique contenant des données utilisateur, secrets ou
traces complètes. Préserver les preuves minimales, révoquer les secrets exposés
et suivre la procédure
[`../operations/INCIDENT_AND_RECOVERY.md`](../operations/INCIDENT_AND_RECOVERY.md).
