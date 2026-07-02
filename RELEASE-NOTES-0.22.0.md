# SportPilot 0.22.0

## Continuité complète du compte

SportPilot 0.22.0 étend la continuité des données aux derniers états fonctionnels du compte et rassemble toutes les synchronisations dans une interface unique. Un changement d’appareil ou une nouvelle installation permet désormais de retrouver les données métier, le profil, les réglages partageables, la progression et les routines sans écraser silencieusement un état plus récent.

## Profil et réglages partageables

- synchronisation du profil utilisateur ;
- objectifs généraux et paramètres de calcul énergétique ;
- coefficients d’activité, valeurs MET et limites d’ajustement calorique ;
- organisation du tableau de bord ;
- modèles d’endurance personnalisés ;
- protection d’un cloud déjà renseigné contre les valeurs par défaut d’un appareil vierge.

Les préférences strictement liées à l’appareil restent locales : mode clair ou sombre, stockage persistant, minuteur de repos, activation automatique et métadonnées de sauvegarde.

## Récompenses, thèmes et routines

- succès obtenus et thèmes visuels SportPilot débloqués ;
- thème visuel SportPilot actif ;
- missions hebdomadaires terminées ;
- préférences de rappels de routine ;
- rappels déjà accomplis ;
- fusion non destructive de la progression ;
- conservation de la date d’obtention la plus ancienne pour les états cumulatifs ;
- résolution par modification la plus récente pour le thème actif et les préférences.

## Centre de synchronisation unifié

- analyse des neuf rubriques depuis un seul écran ;
- synchronisation globale après confirmation explicite ;
- état et nombre de différences par rubrique ;
- dernière analyse et dernière synchronisation conservées localement par compte ;
- poursuite des autres domaines lorsqu’une rubrique échoue ;
- relance limitée aux rubriques en échec ;
- détails chargés uniquement à la demande ;
- actions cloud désactivées hors connexion, sans bloquer les données locales ;
- navigation recentrée sur la rubrique et sélection visuelle unique dans les menus.
- modification d’un objectif ouverte dans la page sans remplacer la route du HashRouter.

## Restauration après nouvelle installation

La restauration cloud inclut maintenant :

- pesées, activités et objectifs ;
- musculation ;
- journal, bibliothèque et suivi nutritionnels ;
- profil et réglages partageables ;
- récompenses, thèmes visuels SportPilot, missions et routines.

La restauration reste préparée en lecture seule, vérifiée par empreintes puis appliquée localement de manière atomique. Elle est bloquée lorsqu’un espace contient déjà de vraies données métier.

## Compatibilité

- runtime Dexie Cloud : v10 ;
- runtime local : `sportpilot-sync-runtime-0.20.0-v10` ;
- schéma métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1.

Aucune migration de la base métier, du format de sauvegarde ou du registre des espaces n’est introduite par E4. Le runtime v10 a été créé pendant E2 pour les agrégats du profil et de la progression et peut demander une authentification OTP lors de sa première ouverture sur un appareil.

## Validation

- suites normale et mélangée ;
- audits E1, E2, E3, E4 et isolation des comptes ;
- build PWA et budgets de production ;
- analyse et synchronisation des neuf rubriques ;
- conflits non destructifs entre deux appareils ;
- restauration dans un navigateur vierge ;
- fonctionnement hors connexion puis reprise réseau ;
- tests sur ordinateur et sur iPhone 15 sous iOS 26.
