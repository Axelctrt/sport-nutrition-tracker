# Retour arrière — SportPilot 0.34.0

Le fix-forward reste la stratégie prioritaire. SportPilot 0.34.0 ne modifie ni
les schémas Dexie, ni les migrations D1, ni les contrats sociaux, ni le moteur
calorique.

## Avant rollback

- identifier le commit exact publié ;
- conserver le commit `a82fd0834e53ae8ef85a2d4e7e5787c929e5d690`
  comme référence fonctionnelle 0.33.2 ;
- vérifier les logs Cloudflare Pages, le manifeste et le service worker ;
- ne supprimer aucune donnée locale ou synchronisée.

## Stratégie recommandée

1. créer une branche `fix/production-0.34.0-*` depuis le commit publié ;
2. corriger uniquement le défaut identifié ;
3. relancer lint, TypeScript, tests, E2E, build et audits concernés ;
4. publier le correctif uniquement après autorisation.

Un retour au commit 0.33.2 ne doit être utilisé qu’en cas de blocage critique,
après sauvegarde de l’état courant. Les migrations existantes ne doivent pas
être rejouées.
