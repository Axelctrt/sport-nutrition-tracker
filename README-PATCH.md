# Correctif mobile 0.13.0-alpha.2

Ce patch corrige l'échec de création de l'objectif quotidien lorsque l'application est ouverte depuis un téléphone via une adresse HTTP du réseau local.

## Cause

`crypto.randomUUID()` n'est pas disponible dans certains contextes HTTP non sécurisés, notamment une adresse locale de type `http://192.168.x.x:5173` ouverte depuis un téléphone.

## Correction

- utilisation de `crypto.randomUUID()` lorsqu'il est disponible ;
- repli vers `crypto.getRandomValues()` ;
- dernier repli local pour les anciens environnements ;
- centralisation des identifiants des repas favoris ;
- aucun changement Dexie ;
- aucune suppression de données.
