# SportPilot 1.0.0 — stable en préparation

Branche : `codex/163-release-1-0-0`

Base vérifiée : `origin/develop` au commit
`13cef273d09d78eeb4d177ab23e86c7770748419`.

Cette branche contient uniquement le passage à la version stable `1.0.0`, les
contrats de readiness et la documentation nécessaires à la stable. RC2 est
historiquement acceptée ; #141 est levée et #162 suit le résiduel Quagga/Sharp.
Aucun comportement produit n'est modifié par cette branche.

Dexie reste en v12, la sauvegarde JSON en v10, le runtime Dexie Cloud en v16 et
le contrat de snapshot social en `0.29.0-a3`. Aucun fichier Functions,
Cloudflare, IA, schéma ou migration n'est modifié.

Aucune Preview Cloudflare, écriture CORS/Dexie Cloud, fusion, modification de
`main`, création de tag, GitHub Release ou production n'est incluse.
