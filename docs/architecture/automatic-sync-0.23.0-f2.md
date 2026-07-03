# SportPilot 0.23.0 F2 — synchronisation automatique maîtrisée

## Objectif

F2 branche l’orchestrateur F1 sur les événements réels de l’application sans introduire de tâche PWA en arrière-plan. Le mécanisme fonctionne uniquement lorsque SportPilot est ouvert ou revient au premier plan.

## Déclencheurs

Une analyse automatique est demandée :

- au démarrage de l’application ;
- au retour au premier plan, avec temporisation ;
- au rétablissement du réseau ;
- après la connexion du compte explicitement autorisé ;
- après une restauration cloud.

Après une modification locale, le domaine concerné est regroupé par anti-rebond. Une écriture automatique n’est autorisée que si la dernière analyse connue de ce domaine indiquait zéro différence. Sans cette base propre, SportPilot analyse seulement et laisse le centre manuel décider.

## Autorisation et réseau

La préférence est locale à l’appareil et liée à l’empreinte du compte autorisé. Changer de compte désactive de fait l’automatisation jusqu’à une nouvelle confirmation explicite.

Deux modes sont disponibles :

- toute connexion ;
- Wi-Fi uniquement.

Le mode Wi-Fi uniquement est volontairement conservateur : lorsque le navigateur ne sait pas identifier le type de connexion, aucune opération automatique ne part. Les actions manuelles restent disponibles.

## Domaines observés

Les écritures locales publient le domaine concerné : profil et réglages, activités, objectifs, musculation, journal nutritionnel, bibliothèque nutritionnelle, suivi nutritionnel, récompenses et routines, pesées.

L’ancien automatisme limité aux pesées est désactivé lorsqu’on active l’automatisation globale afin d’éviter deux coordinateurs concurrents.

## Garanties

- verrou et file séquentielle hérités de F1 ;
- aucune synchronisation automatique sans autorisation du compte ;
- aucune écriture automatique sans analyse propre préalable ;
- regroupement des modifications rapprochées ;
- aucune opération hors connexion ;
- centre manuel toujours disponible ;
- aucune migration de données.

## Versions

- application affichée : 0.22.0 pendant le développement ;
- runtime Dexie Cloud : v10 ;
- base métier : Dexie v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.
