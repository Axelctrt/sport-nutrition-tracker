# SportPilot 0.23.0 F3 — transparence de synchronisation

F3 ajoute un journal local borné à 20 opérations par compte. Chaque exécution de l’orchestrateur enregistre son origine, son type, son résultat, les domaines terminés, les domaines en échec et le nombre de différences observées.

Le centre distingue les actions manuelles des déclencheurs automatiques, présente la dernière réussite, le dernier échec et les opérations récentes. Une divergence ouvre d’abord l’examen des détails. Le centre global ne propose qu’une fusion non destructive lorsque les services la permettent ; il ne simule pas de remplacement directionnel local/cloud.

Aucune donnée métier ni version de stockage n’est modifiée. Le journal est une métadonnée locale facultative et ne bloque jamais la synchronisation si `localStorage` est indisponible.
