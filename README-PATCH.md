# Correctif mobile — champs de date 0.13.0-alpha.4

Ce patch s'applique sur SportPilot 0.13.0-alpha.3.

Il corrige le débordement horizontal des contrôles natifs `date`, `time`, `datetime-local`, `month` et `week`, notamment sur Safari iOS.

Écrans explicitement ajustés :

- Journal alimentaire ;
- Journal des activités ;
- Poids ;
- Analyses.

Le correctif est purement visuel : aucune migration Dexie et aucune modification des sauvegardes.

Après copie du contenu à la racine du projet :

```powershell
npm install
npm run check
npm run dev -- --host
```
