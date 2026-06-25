# SportPilot 0.15.0-alpha.1 — fondations UX mobile

Branche obligatoire : `feature/ux-foundations`

Cette étape ajoute les fondations communes de la refonte UX :

- splash initial sans délai artificiel ;
- skeletons de page par type de contenu ;
- `ToastProvider`, `useToast` et viewport compatible safe areas ;
- déduplication et temporisation différenciée des notifications ;
- gestion centralisée du scroll avec restauration au retour ;
- titres de pages dynamiques dans l’en-tête ;
- `EmptyState`, `CollapsibleSection`, `ConfirmationDialog` et `SaveStatus` ;
- utilitaire de focus sur le premier champ invalide ;
- prise en charge de `prefers-reduced-motion` ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Les fonctionnalités métier de la version 0.14.0 restent inchangées.
