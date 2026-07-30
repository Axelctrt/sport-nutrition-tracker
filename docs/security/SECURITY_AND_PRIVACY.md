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

## Social

- L’identité sociale est réconciliée côté serveur ; un identifiant fourni par
  le navigateur n’est pas à lui seul une preuve d’identité.
- Les permissions sont appliquées à la publication et à la lecture.
- Les détails privés ne sont jamais déduits d’un résumé.
- Suppression d’amitié et révocation de permission doivent empêcher les
  lectures futures et converger côté local/cloud.

## Photo nutrition et IA

- Consentement avant envoi.
- Proxy same-origin et clé serveur uniquement.
- Limites de taille, type, méthode, timeout et débit.
- Résultat présenté comme estimation à confirmer.
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
