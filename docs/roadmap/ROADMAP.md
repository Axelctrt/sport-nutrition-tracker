# Roadmap SportPilot

Cette roadmap décrit l’état validé du produit et la séquence autorisée des
chantiers. Elle ne constitue jamais une autorisation implicite de fusion, de
release ou de déploiement.

## Sources de vérité

- dépôt : `Axelctrt/sport-nutrition-tracker` ;
- branche de développement inspectée : `develop` ;
- état consolidé de référence :
  `develop@c2948d87401d125f310bfeb275bc800733a4eff7` ;
- code publié en production 0.37.0 :
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- chantier transverse en cours : issue #50.

## État des chantiers

| Chantier | Statut | Référence | Condition suivante |
| --- | --- | --- | --- |
| Stabilisation UX, modèle opératoire et fondations partagées | **Publié en production 0.37.0** | Phases 0 à 3 | Maintenance contrôlée |
| Photos de progression locales | **Publié en production 0.37.0** | PR #18 | Images locales, privées et non analysées par IA |
| Publication stable 0.37.0 | **Terminée** | PR #21, tag `v0.37.0` | Aucune migration D1 exécutée |
| Profil, Amis et Confidentialité | **Intégré à `develop`, non publié** | PR #24 | Future release explicitement autorisée |
| Planning sportif | **Intégré à `develop`, non publié** | PR #45 | Maintenir la séparation Planning/Objectifs |
| Objectifs de progression | **Intégré à `develop`, non publié** | PR #47 | Métrique immuable et anti-double comptage conservés |
| Liaison Objectif → Action | **Intégré à `develop`, non publié** | PR #49 | Aucun contenu créé automatiquement |
| Primitive canonique `ActionMenu` | **Intégrée à `develop`, non publiée** | PR #51 | Utilisation par les domaines métier |
| Migration des menus Sport | **Intégrée à `develop`, non publiée** | PR #53 et #54, issue #52 clôturée | Aucun reliquat Sport identifié |
| Migration des menus Nutrition | **Intégrée à `develop`, non publiée** | PR #56 et #57, issue #55 clôturée | Aucun reliquat Nutrition identifié |
| Migration Progression et inventaire final | **Intégrée à `develop`, non publiée** | PR #59, issue #58 clôturée, merge `c2948d87401d125f310bfeb275bc800733a4eff7` | Maintenir les primitives canoniques |
| Saisie OTP fluide | **Prochain lot autorisé** | PR 5 de l’issue #50 | Cadrage vérifiable et branche distincte depuis le HEAD réel de `develop` |
| Renvoi OTP | **Optionnel, non autorisé techniquement à ce stade** | PR 6 de l’issue #50 | Validation préalable du contrat Dexie Cloud |

## État publié

SportPilot 0.37.0 reste la version publiée de référence :

- code de production : `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- tag annoté : `v0.37.0` ;
- release GitHub stable ;
- aucune migration D1 exécutée pour cette publication.

Les évolutions listées comme intégrées à `develop` ne sont pas présentes dans
la version 0.37.0 et ne doivent pas être présentées comme publiées.

## Architecture et décisions produit conservées

- Planning et Objectifs restent des domaines séparés.
- Progression et Bilan hebdomadaire servent de pont entre intention,
  réalisation et résultat.
- La métrique d’un objectif ne peut plus être modifiée après sa création.
- Les minutes de musculation détaillées ne doivent pas être comptées deux fois
  lorsqu’une activité générale liée existe.
- Aucun écran ne crée automatiquement une séance, un programme ou un objectif.
- Les menus d’actions utilisent une Bottom Sheet sous 640 px et un popover à
  partir de 640 px.

Les décisions détaillées figurent dans
[`PLANNING_GOALS_AUDIT_DECISIONS.md`](PLANNING_GOALS_AUDIT_DECISIONS.md).

## Prochain jalon

Le prochain lot fonctionnel autorisé est la **saisie OTP fluide** définie dans
l’issue #50.

Le lot Progression a satisfait ses conditions de sortie :

1. CI #642 verte sur le HEAD final de la PR #59 ;
2. recette Preview mobile et desktop validée par le propriétaire ;
3. fusion autorisée et effectuée dans `develop` ;
4. issue #58 clôturée.

Le lot OTP doit partir de
`develop@c2948d87401d125f310bfeb275bc800733a4eff7` ou d’un HEAD ultérieur
explicitement vérifié avant création de branche. Le renvoi OTP reste exclu.

## Garde-fous permanents

- mobile-first ;
- local-first et fonctionnement hors ligne conservés ;
- continuité et isolation des données ;
- aucune modification des formules caloriques sans validation ;
- aucune modification des thèmes validés sans validation ;
- aucune extension de l’IA sans validation ;
- aucune migration D1 dans les chantiers décrits ici ;
- une branche et une PR distinctes par lot ;
- aucune fusion, release ou production sans autorisation explicite.

Les détails fonctionnels figurent dans
[`PLANNED_FEATURES.md`](PLANNED_FEATURES.md). Les limites techniques qui ne
constituent pas une phase produit figurent dans
[`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md).
