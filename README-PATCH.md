# SportPilot 0.35.1 - reprise de session mobile

Branche corrective : `fix/mobile-session-recovery-0.35.1`

SportPilot 0.35.1 restaure les sessions renouvelables au réveil de la PWA et
conserve l'espace local du compte pendant les indisponibilités réseau ou cloud.

## Périmètre

- version applicative : `0.35.1` ;
- commit stable de départ : `a413b8d92cdecb6e03eac7caca901e667e8c9801` ;
- migrations D1 ajoutées : aucune ;
- migrations Dexie ajoutées : aucune ;
- contrat social, moteur calorique et formats de sauvegarde inchangés ;
- aucune fusion, aucun tag et aucun déploiement dans ce chantier.

## Contrôles obligatoires

```text
npm run lint
npx tsc -b --pretty false
npm run test
npm run test:stability
npm run build
npm run check
npm run test:e2e
npm run test:e2e:pwa
npm audit
```

La branche peut être poussée et proposée dans une pull request brouillon après
validation complète. Toute fusion ou publication nécessite un accord séparé.
