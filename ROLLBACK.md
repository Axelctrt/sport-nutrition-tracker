# Retour arrière — SportPilot 0.35.0

Le fix-forward reste la stratégie prioritaire. SportPilot 0.35.0 ne modifie ni les schémas Dexie, ni les migrations D1, ni les contrats sociaux, ni le moteur calorique.

## Avant rollback

- identifier le commit exact publié ;
- conserver le commit `313cec57071d569d2ed41dac1930de7cb908fce5` comme référence stable SportPilot 0.34.0 ;
- vérifier les logs Cloudflare Pages, le manifeste et le service worker ;
- exporter une sauvegarde lorsque l’application reste accessible ;
- ne supprimer aucune donnée locale ou synchronisée.

## Stratégie recommandée

1. créer une branche `fix/production-0.35.0-*` depuis le commit publié ;
2. corriger uniquement le défaut identifié ;
3. relancer lint, TypeScript, tests, E2E, build et audits concernés ;
4. publier le correctif uniquement après validation complète.

Un retour au commit stable 0.34.0 ne doit être utilisé qu’en cas de blocage critique, après sauvegarde de l’état courant. Les migrations existantes ne doivent pas être rejouées et les données locales ne doivent pas être réinitialisées.
