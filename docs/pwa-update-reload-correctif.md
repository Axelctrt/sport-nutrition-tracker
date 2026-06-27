# Rechargement déterministe après mise à jour PWA

`vite-plugin-pwa` 1.3.0 ignore le paramètre passé à `updateServiceWorker(...)`.
La fonction envoie uniquement le message `SKIP_WAITING` au worker en attente.

SportPilot prend donc explicitement en charge la séquence suivante :

1. attendre la fin des écritures Dexie ;
2. armer l'écoute de `navigator.serviceWorker.controllerchange` ;
3. demander l'activation du nouveau worker ;
4. attendre sa prise de contrôle ;
5. recharger la page une seule fois.

Le callback `onNeedReload` fourni à `useRegisterSW` neutralise le rechargement
automatique de la bibliothèque afin d'éviter une course ou un double rechargement.
Si la prise de contrôle n'arrive pas dans le délai prévu, la page n'est pas
rechargée et la bannière affiche l'erreur existante.
