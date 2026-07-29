# SportPilot 0.33.1

## Analyse photo

- Corrige la route de production utilisée pour joindre l'analyse nutritionnelle.
- Prépare les photos avant l'envoi : orientation respectée, dimension maximale de
  1 600 px et compression JPEG adaptative jusqu’à 1,5 Mo.
- Distingue les erreurs de connexion, d'authentification, de délai, de quota et
  de réponse invalide.
- Ajoute une référence de diagnostic courte sans journaliser la photo, le jeton
  ou la clé du fournisseur.
- Supprime l'estimation locale prédéfinie : une analyse réelle produit une
  estimation à vérifier, sinon le formulaire manuel reste vide, sans estimation fictive.
- Simplifie l'écran photo et corrige le switch d'analyse sur les petits écrans.

## Nutrition

- Les quatre repas sont fermés au chargement et le dernier repas ouvert peut
  désormais être refermé.
- Le parcours de recherche demande d'abord de choisir entre `Mes aliments` et
  `Open Food Facts`, puis ouvre directement la bonne recherche avec le focus.
- Une recherche sans résultat permet de créer immédiatement un aliment en
  conservant le nom ou le code-barres, la date, le repas et le contexte de retour.

## Interface

- Les aides courtes sont maintenant affichées dans un popover ancré qui gère les
  collisions, le clic extérieur, la touche Échap et le retour du focus.
- L'aide redondante de la cible alimentaire a été retirée.
- Les sections repliables non indispensables sont fermées par défaut.
- Les textes techniques liés à l'implémentation ont été retirés des parcours
  ordinaires.

## Validation

- Suite Vitest, lint, compilation TypeScript et build PWA.
- Audits de sécurité, synchronisation, sauvegarde, production et analyse photo.
- Parcours Playwright sur Chromium desktop, mobile 320/360/412 px et WebKit
  iPhone 15.
- Une checklist séparée couvre les validations restantes sur iPhone, Android et
  plusieurs appareils physiques.

## Périmètre

- Aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute
  n’est ajouté.
- Aucun changement du moteur calorique, du schéma Dexie, du format de sauvegarde
  ou des contrats sociaux.

Tag attendu : `v0.33.1`.
