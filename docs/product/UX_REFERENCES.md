# Références UX externes

Statut : **décision validée**. Une référence est une source d’inspiration,
jamais une dépendance produit ni un modèle à copier aveuglément.

## Aceternity UI

Référence : <https://ui.aceternity.com/>

Aceternity UI est étudié pour sa hiérarchie visuelle, ses surfaces, ses
transitions et ses mises en scène. Aucun composant n’est copié tel quel :
licence, accessibilité, poids, comportement tactile, thème et mouvement réduit
doivent être revérifiés.

### Éléments déjà reflétés dans SportPilot

- surfaces translucides et élévation mesurée de Performance Glass ;
- révélations ponctuelles pour badges, onboarding et accomplissements ;
- transitions d’onglets et de panneaux ;
- fonds décoratifs pilotés par thème.

Ces éléments sont implémentés dans le système propre de SportPilot, pas importés
depuis Aceternity.

### Retenus pour de futurs chantiers

- micro-interactions de progression sobres ;
- compositions de cartes pour comparaisons et jalons ;
- transitions de contexte qui conservent la position et le focus.

Statut : **idées à étudier**, donc non autorisées sans cadrage.

### Rejetés ou inadaptés

- effets reposant sur le survol ;
- curseurs personnalisés ;
- parallaxe permanente et animations de fond coûteuses ;
- textes animés qui ralentissent la lecture ;
- grilles desktop denses transposées directement sur mobile ;
- effets lumineux qui dégradent contraste, batterie ou mouvement réduit.

## Adaptations Performance Glass

Toute inspiration externe doit :

1. utiliser les tokens `--sp-*` et les thèmes existants ;
2. rester utilisable à 320 px et au toucher ;
3. préserver les cibles tactiles, le focus et les safe areas ;
4. offrir un résultat complet sans animation ;
5. rester compatible clair/sombre et thèmes déverrouillables ;
6. justifier son coût bundle et rendu.
