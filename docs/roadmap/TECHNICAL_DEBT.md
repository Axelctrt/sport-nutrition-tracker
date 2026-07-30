# Dette technique vérifiée

Ce registre décrit des limites observées. Il n’autorise pas leur correction.

| Dette | Impact | Orientation |
| --- | --- | --- |
| Documentation canonique et nombreuses archives versionnées coexistent | Une recherche brute peut confondre état actuel et historique | Utiliser [`../INDEX.md`](../INDEX.md) et conserver les archives |
| Les scripts `check` et `ci` agrègent une longue liste d’audits dans `package.json` | Maintenance et lecture difficiles | Étudier une composition de scripts sans réduire les contrôles |
| Vitest utilise `isolate: false` et un seul worker | Les mocks ou états globaux peuvent rendre des tests sensibles à l’ordre | Renforcer les restaurations et tests de stabilité avant toute parallélisation |
| `BottomSheet.tsx` porte un avertissement lint préexistant sur les dépendances d’effet | Bruit dans le signal lint | Corriger dans un changement fonctionnel dédié et testé |
| Des artefacts, journaux et bundles historiques existent à la racine | Navigation et taille du dépôt moins lisibles | Définir une politique d’archivage avant toute suppression |
| La suite Playwright complète est sérielle et longue | Retour CI tardif | Mesurer avant de répartir ou paralléliser, sans perdre la couverture navigateurs |
| Les contrôles automatiques Cloudflare liés aux PR peuvent diverger de la politique « aucun déploiement sans autorisation » | Échec externe ambigu et risque d’action implicite | Auditer la configuration Cloudflare sans déclencher de déploiement |

## Règle de traitement

Chaque dette doit disposer d’un périmètre, d’un risque, de critères
d’acceptation et de tests avant modification. Les migrations, la continuité des
données et la politique de déploiement priment sur le nettoyage.
