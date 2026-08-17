# SportPilot 1.0.2 — continuité sûre Goals + Weights

Statut : candidate de maintenance préparée depuis
`develop@37cae57dc779d6410f35a177403706be0a3eb382` après fusion de la PR #173.

Branche : `release/1.0.2`.

## Objet

SportPilot 1.0.2 étend la continuité automatique sûre déjà publiée pour
Strength aux domaines Goals et Weights, sans élargir la whitelist automatique
à un quatrième domaine.

## Garanties de continuité

- whitelist automatique directionnelle strictement limitée à `strength`,
  `goals` et `weights` ;
- état `local-only` : upload directionnel ;
- état `cloud-only` : download directionnel ;
- états `both` et `unknown` : aucune écriture automatique ;
- revalidation de la provenance immédiatement avant les écritures ;
- Goals : objectifs, suppressions/tombstones, restauration, stamps/révisions,
  isolation du compte et idempotence préservés ;
- Weights : suppressions/tombstones, isolation du compte, CAS/revalidation,
  idempotence et absence de doublon préservés ;
- coexistence avec la synchronisation Weight historique sans double mutation.

## Invariants inchangés

- Dexie v12 ;
- sauvegarde JSON v10 ;
- runtime Dexie Cloud v16 ;
- aucune migration D1 ;
- aucune modification des formules calories/macros ;
- aucun changement de thème validé ;
- aucun élargissement IA.

## Qualification acquise avant préparation de version

Candidat fonctionnel qualifié :
`develop@37cae57dc779d6410f35a177403706be0a3eb382`.

Preview Cloudflare Pages Direct Upload immuable :
`https://3288522c.sportpilot-pages.pages.dev`.

Deployment ID :
`3288522c-6c7f-45ce-b1c3-5294736c2af1`.

Dexie Cloud : `https://zhnyk8met.dexie.cloud`.

- origine immuable ajoutée à la whitelist : PASS ;
- preflight CORS de l'origine immuable : PASS ;
- alias de branche non autorisé : PASS ;
- smoke physique Goals A→B création/suppression : PASS ;
- smoke physique Weights A→B création/mise à jour/suppression : PASS ;
- absence de doublon Weight : PASS ;
- non-régression Strength A→B : PASS ;
- isolation inter-compte : PASS ;
- aucune action manuelle « Synchroniser » nécessaire.

## Gate de publication

La préparation 1.0.2 ne doit modifier que les métadonnées/version, contrats de
readiness et documentation de release. Toute différence fonctionnelle par rapport
au candidat qualifié doit bloquer la publication.

La publication finale exige :

1. CI GitHub complète verte sur la préparation 1.0.2 ;
2. fusion de la préparation dans `develop` ;
3. contrôle du diff de préparation comme non fonctionnel ;
4. Preview Direct Upload du SHA final préparé et contrôle CORS ;
5. PR `develop → main` et CI verte ;
6. tag `v1.0.2` sur le commit publié ;
7. GitHub Release SportPilot 1.0.2 ;
8. déploiement Cloudflare Pages production du SHA publié et contrôles post-déploiement.
