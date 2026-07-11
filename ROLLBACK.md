# Retour arrière — SportPilot 0.30.0

Le fix-forward reste la stratégie prioritaire. SportPilot 0.30.0 ne modifie pas les schémas Dexie, les migrations D1, les contrats sociaux ni le moteur calorique ; une régression UX doit donc être corrigée par patch applicatif plutôt que par restauration de données.

## Avant rollback

- identifier le commit exact publié sur `main` ;
- vérifier les logs Cloudflare Pages ;
- confirmer si la régression concerne l’UX, le build, la PWA ou les données ;
- ne pas rejouer de migration D1 existante ;
- ne pas supprimer de données sociales réelles.

## Stratégie recommandée

1. créer une branche `fix/production-0.30.0-*` depuis `main` ;
2. corriger uniquement le défaut identifié ;
3. relancer `npm run lint`, `npm run test`, `npm run build` et les audits concernés ;
4. fusionner manuellement dans `main` ;
5. redéployer Cloudflare Pages ;
6. resynchroniser `develop`.

## Rollback Git exceptionnel

Un retour au tag précédent ne doit être utilisé qu’en cas de blocage critique de production et après sauvegarde de l’état courant. Les migrations D1 `0001` et `0002` restent en place et ne doivent pas être rejouées.
