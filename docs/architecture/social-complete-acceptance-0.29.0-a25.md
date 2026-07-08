# SportPilot 0.29.0 — A25 Recette sociale complète

## Objectif

Valider le parcours social complet sur la Preview `develop`, sans élargir le périmètre fonctionnel. La recette doit être exécutée avec deux comptes réels, **Compte A** et **Compte B**, puis vérifiée sur ordinateur et sur **iPhone 15 sous iOS 26**.

## Préconditions

- `develop` propre et déployé en Preview ;
- migrations D1 déjà appliquées, sans rejouer `0002` ;
- deux comptes SportPilot distincts et connectables ;
- DevTools Network disponible sur ordinateur ;
- aucune fusion dans `main` avant la clôture complète.

## Matrice de recette

### 1. Profil et recherche

1. Compte A ouvre **Amis et confidentialité**.
2. Le nom public et le handle sont lisibles et modifiables.
3. Compte B est trouvé par son handle exact.
4. Une recherche inexistante retourne un message compréhensible.
5. Une recherche de son propre handle ne permet pas l’envoi d’une demande.

### 2. Demande d’ami

1. Compte A envoie une demande à Compte B.
2. A voit une demande sortante unique.
3. B voit une demande entrante avec le bon nom et le bon handle.
4. Un second envoi identique ne crée aucun doublon.
5. Tester une annulation, puis un nouvel envoi.
6. Tester un refus : la demande terminale doit disparaître.
7. Envoyer une dernière demande et l’accepter.

### 3. Amitié active

1. A voit B dans **Amis connectés**.
2. B voit A dans **Amis connectés**.
3. Les noms et handles publics sont corrects.
4. Aucune adresse email n’est utilisée comme handle visible.
5. Une actualisation ou une réouverture conserve l’amitié.

### 4. Permissions par ami

Tester séparément A → B et B → A :

- **Aucun** : aucune activité visible ;
- **Résumé** : titre, type, date et durée uniquement ;
- **Personnalisé** : uniquement les champs cochés ;
- la modification A → B ne modifie jamais B → A ;
- les catégories Musculation et Cardio restent compactes et repliables ;
- RPE et calories sont présentés comme conditionnels ;
- aucun réglage social n’apparaît dans le formulaire d’activité ou pendant une séance de musculation.

### 5. Musculation

Créer une séance contrôlée contenant :

- au moins deux exercices ;
- séries, répétitions et charges ;
- repos ;
- au moins un RPE renseigné.

Vérifier successivement :

1. Résumé sans détail.
2. Personnalisé avec exercices et séries uniquement.
3. Activation des charges et du RPE.
4. Désactivation rétroactive des charges sans republier la séance.
5. Ouverture de la fiche détaillée depuis le fil.
6. Absence des notes privées et de toute activité brute dans Network.

### 6. Cardio

Créer une activité contrôlée contenant autant que possible :

- durée et distance ;
- allure et vitesse ;
- dénivelé ;
- calories ;
- fréquence cardiaque et cadence.

Vérifier :

1. Résumé limité aux informations essentielles.
2. Personnalisé avec distance et allure.
3. Calories visibles uniquement lorsqu’elles existent.
4. Désactivation de la fréquence cardiaque, cadence et dénivelé.
5. Absence des champs désactivés dans la réponse HTTP.
6. Ouverture et fermeture correcte de la fiche détaillée.

### 7. Cycle de vie d’une activité

1. Modifier le titre ou une métrique d’une activité.
2. Actualiser l’autre compte : une seule carte mise à jour doit rester.
3. Rendre une activité privée : sa carte doit disparaître.
4. Supprimer une activité : sa carte et son détail doivent disparaître.
5. Une fiche ouverte doit se fermer si l’activité devient inaccessible.
6. L’ordre reste fondé sur la date sportive et non sur la date de modification.

### 8. Résilience

1. Charger amis, permissions et fil en ligne.
2. Passer hors ligne puis rouvrir la page.
3. Les données locales valides restent affichées.
4. Créer ou modifier une activité hors ligne.
5. Revenir en ligne : la publication reprend sans doublon.
6. Fermer puis rouvrir la PWA avec une publication en attente.
7. Changer rapidement une permission : le dernier état confirmé doit gagner.
8. Changer de compte sur le même navigateur : aucune donnée de l’ancien compte ne doit apparaître.

### 9. Suppression et recréation de l’amitié

1. Compte A supprime Compte B.
2. L’amitié disparaît dans les deux sens après synchronisation.
3. Les permissions bilatérales disparaissent.
4. Le fil et les détails deviennent inaccessibles.
5. Une nouvelle demande peut être envoyée et acceptée.
6. La nouvelle relation repart sans ancienne permission obsolète.

### 10. Sécurité

- toutes les routes sociales sans Bearer répondent `401` ;
- un identifiant d’un tiers avec le Bearer du compte courant est refusé ;
- un ancien ami ne peut pas lire un snapshot connu ;
- aucune réponse ne contient `rawActivity`, `privateNotes`, `stack`, `sql` ou `internalError` ;
- les réponses sociales utilisent `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`.

### 11. Mobile et ordinateur

Sur ordinateur puis sur iPhone 15 :

- aucun débordement horizontal ;
- cartes compactes ;
- zones tactiles accessibles ;
- panneaux de permissions repliables ;
- feuille de détail compatible avec la zone sûre ;
- bouton de fermeture toujours visible ;
- scroll fluide avec plusieurs activités ;
- états vide, chargement, actualisation, hors-ligne et erreur compréhensibles.

## Contrôle D1

À la fin de la recette, vérifier :

- aucune demande terminale résiduelle ;
- amitié canonique `active` si elle a été recréée ;
- exactement une permission par direction ;
- `field_selection_json` valide pour chaque permission ;
- aucun doublon de friendship ou de snapshot actif pour la même relation logique.

## Critères de clôture

A25 est validé uniquement si :

- tous les scénarios bloquants passent sur les deux comptes ;
- les tests automatisés A14 à A24 restent verts ;
- la suite sociale ciblée, le lint et le build passent ;
- aucun défaut de confidentialité ou de changement de compte n’est observé ;
- la Preview reste stable sur ordinateur et iPhone 15 ;
- aucun changement n’est encore fusionné dans `main`.
