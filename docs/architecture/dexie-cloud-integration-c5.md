# C5 — Intégration contrôlée de la synchronisation des pesées

## Portée

C5 intègre la synchronisation des pesées dans les paramètres normaux de
SportPilot. Les autres domaines restent strictement locaux.

## Activation

- Le déploiement reste protégé par les flags de build C4.
- L’utilisateur doit activer explicitement la fonction sur chaque appareil.
- La préférence est stockée dans `deviceSettings` et vaut `false` par défaut.
- La désactivation ne supprime aucune donnée locale ou cloud.

## Déclencheurs automatiques

Une synchronisation bornée est planifiée :

1. après restauration de la session au démarrage ;
2. au retour du réseau ;
3. après ajout, modification ou suppression locale d’une pesée.

Les déclenchements sont temporisés, espacés d’au moins 15 secondes et protégés
par un verrou non réentrant. Un dépassement de 60 secondes produit une erreur
lisible, sans lancer une seconde opération tant que la première n’est pas
réellement terminée.

## États visibles

- indisponible ;
- désactivée ;
- compte non connecté ;
- prête ;
- synchronisation en cours ;
- à jour ;
- hors ligne ;
- erreur.

## Déploiement

1. Conserver les flags C4 actifs dans l’environnement ciblé.
2. Déployer d’abord sur la branche expérimentale.
3. Activer manuellement sur un appareil de test.
4. Vérifier ajout, modification, suppression, redémarrage et retour en ligne.
5. Étendre progressivement après validation.

## Rollback immédiat

- Désactiver depuis Paramètres > Synchronisation des pesées ; ou
- remettre `VITE_ENABLE_REAL_WEIGHT_SYNC=false` et redéployer.

Dans les deux cas, `sportpilot-local-database` et les sauvegardes JSON restent
intacts. Les tables cloud ne sont pas effacées automatiquement.

## Critères avant fusion dans develop

- activation et désactivation persistantes ;
- aucune synchronisation concurrente ;
- reprise au retour en ligne ;
- synchronisation après CRUD d’une pesée ;
- aucune perte lors d’une mise à jour PWA ;
- tests unitaires, stabilité et E2E réussis ;
- rollback testé.

## Correctif C5.1 — activation et navigation latérale

Le correctif C5.1 apporte deux garde-fous supplémentaires :

- la navigation latérale du bureau possède sa propre zone de défilement afin que les liens secondaires, notamment les paramètres, restent accessibles sur les écrans de faible hauteur ;
- les actions d’activation et de synchronisation restent indisponibles pendant la préparation initiale de Dexie Cloud.

Le contrôleur attend désormais explicitement la fin de son initialisation avant de persister une activation. La préférence appareil est relue après l’initialisation du client, ce qui élimine la course entre une activation utilisateur et une ancienne valeur chargée au démarrage.

Ce correctif ne modifie ni les tables Dexie, ni les données locales ou cloud, ni le format des sauvegardes.

## Correctif C5.2 — route stable et activation résiliente

Le sommaire des paramètres n'écrit plus une seconde ancre dans
`window.location.hash`. Le routeur HashRouter conserve donc `#/settings` et un
rechargement depuis la rubrique Synchronisation des pesées ne mène plus vers
la page introuvable.

L'activation appareil est maintenant persistée localement sans dépendre de la
fin d'un échange réseau Dexie Cloud. En cas d'erreur signalée après une écriture,
la préférence est relue : si la valeur demandée est bien enregistrée, l'action
est considérée comme réussie et aucun faux toast rouge n'est affiché.

Une synchronisation manuelle attend également la fin d'une phase Dexie Cloud
`initial`, `pushing` ou `pulling` déjà en cours avant de lancer l'échange des
pesées réelles. Après 60 secondes, une erreur explicite invite à réessayer sans
créer d'opération concurrente.

## Correctif C5.3 — activation locale indépendante de l'état cloud

L'activation sur un appareil est une préférence locale. Elle ne doit pas
échouer lorsque Dexie Cloud bascule brièvement entre les états connecté,
restauration de session, connexion WebSocket ou synchronisation initiale.

Le contrôleur C5.3 :

- ne valide plus l'état réseau du compte avant d'enregistrer la préférence ;
- relit systématiquement la valeur stockée après l'écriture ;
- considère l'activation réussie dès que la préférence locale est confirmée ;
- laisse la synchronisation automatique attendre séparément la disponibilité
  du compte ;
- conserve l'état `Compte non connecté` si la session n'est pas prête, sans
  annuler l'activation locale ni afficher un toast rouge trompeur.

## Correctif C5.4 — contexte des timers navigateur

Les fonctions natives `setTimeout` et `clearTimeout` sont liées explicitement à
`globalThis` avant leur stockage dans le contrôleur. Sans cette liaison, leur
appel via une propriété de classe pouvait utiliser le contrôleur comme
receveur et provoquer `TypeError: Illegal invocation` dans le navigateur au
moment de programmer la première synchronisation après activation.

Un test de régression emploie des timers stricts qui refusent tout receveur
autre que `globalThis`.


## Correctif C5.5 — reprise réseau et états transitoires

La coupure Internet n'est pas toujours reflétée immédiatement par
`navigator.onLine`, notamment lorsqu'un appareil reste associé au Wi-Fi sans
accès effectif au réseau. Le contrôleur tient désormais compte de l'état
`offline` de Dexie Cloud et des erreurs de transport explicites afin d'afficher
**Hors ligne** plutôt qu'un faux état **Erreur**.

Au retour de la connexion, la première relance contourne exceptionnellement
l'intervalle minimal de quinze secondes et conserve uniquement la temporisation
de 750 ms. Les notifications répétées de Dexie Cloud ne repoussent plus un
timer déjà planifié.

Le délai maximal d'une opération est porté à soixante secondes. Une reprise
réseau observée autour de trente secondes reste donc affichée comme
**Synchronisation en cours** et peut se terminer normalement, au lieu de créer
une fausse erreur au bout de vingt secondes. Une réussite efface explicitement
l'ancien message d'erreur.


## Correctif C5.6 — suppression du flash d’erreur transitoire

Dexie Cloud peut publier brièvement un état `error` entre la fin d’un échange
et la notification stable `in-sync`. L’interface affichait alors une notice
rouge pendant moins d’une seconde, malgré une synchronisation réellement
réussie.

Les erreurs provenant uniquement du flux d’état Dexie Cloud bénéficient
désormais d’une période de confirmation d’une seconde :

- si un état stable arrive pendant ce délai, la notice n’est jamais affichée ;
- si l’erreur persiste au-delà du délai, l’état **Erreur** et son message sont
  affichés normalement ;
- les erreurs directes d’une opération manuelle restent immédiates ;
- une réussite annule toute erreur différée encore en attente.

Ce lissage ne masque donc pas une panne durable ; il évite uniquement le
clignotement visuel produit par des transitions internes très courtes.

## Correctif C5.7 — stabilisation post-synchronisation

Une synchronisation des pesées peut être terminée côté application alors que
Dexie Cloud publie encore, pendant quelques secondes, une transition interne
`error` avant de revenir à `in-sync`. Cette séquence a été observée sous la
forme **À jour → Erreur pendant environ cinq secondes → À jour**.

Le contrôleur ouvre désormais une fenêtre de stabilisation de dix secondes
après chaque synchronisation réussie :

- les erreurs issues uniquement du flux d’état Dexie Cloud restent différées
  pendant cette fenêtre ;
- un retour à un état stable annule la notice avant qu’elle ne soit affichée ;
- une erreur qui persiste au-delà de la fenêtre est affichée normalement ;
- en dehors d’une réussite récente, le délai de confirmation standard reste
  limité à une seconde.

Cette règle cible uniquement les transitions post-succès et ne retarde donc
pas inutilement les erreurs persistantes survenant hors d’une synchronisation
réussie.


## Durcissement C6 — consentement, compte lié et séparation du laboratoire

La revue finale C0 à C5 a ajouté trois garanties avant intégration dans
`develop` :

- le coordinateur lit d'abord la préférence locale et n'ouvre pas Dexie Cloud
  tant que la synchronisation est désactivée ;
- une activation est liée à l'empreinte non réversible du compte explicitement
  autorisé sur l'appareil ;
- un changement de compte désactive immédiatement les échanges automatiques et
  exige une nouvelle activation explicite avant toute synchronisation ;
- les appareils déjà activés avant C6 sont désactivés une seule fois et doivent
  confirmer à nouveau le compte autorisé ;
- l'écran utilisateur ne présente plus les pesées fictives, C4 manuel ni les
  diagnostics détaillés ; ces outils nécessitent le flag distinct
  `VITE_ENABLE_SYNC_DIAGNOSTICS=true`.

Configuration d'un déploiement utilisateur :

```env
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_DEXIE_CLOUD_DATABASE_URL=https://<base>.dexie.cloud
VITE_ENABLE_REAL_WEIGHT_SYNC=true
VITE_ENABLE_SYNC_DIAGNOSTICS=false
```

Configuration réservée au laboratoire :

```env
VITE_ENABLE_SYNC_DIAGNOSTICS=true
```

Le flag de diagnostic ne doit jamais être activé dans une version destinée aux
utilisateurs finaux.
