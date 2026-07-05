# SportPilot 0.25.1

SportPilot 0.25.1 ajoute l’analyse nutritionnelle assistée par IA à partir d’une photo, via un proxy backend Gemini Free Tier. L’utilisateur choisit une photo, accepte explicitement son envoi ponctuel au service IA, vérifie l’estimation proposée, corrige les valeurs, puis ajoute l’entrée au bon repas du journal alimentaire.

## Parcours photo nutrition

- sélection ou prise de photo depuis le journal alimentaire ;
- aperçu de la photo sélectionnée et suppression manuelle possible ;
- analyse IA distante uniquement si `VITE_PHOTO_NUTRITION_AI_ENDPOINT` est configuré et si l’utilisateur donne son consentement ;
- proxy backend `/api/photo-nutrition/analyze` utilisant `PHOTO_NUTRITION_AI_API_KEY` côté serveur ;
- modèle par défaut `gemini-2.5-flash-lite` pour limiter les coûts ;
- fallback local automatique si le proxy, le quota ou Gemini échoue ;
- correction manuelle obligatoire avant l’ajout au journal.

## Confidentialité et coût IA

Aucune clé Gemini n’est exposée dans le front. Les variables `PHOTO_NUTRITION_AI_API_KEY` ou `GEMINI_API_KEY` doivent rester côté serveur ou dans le terminal du proxy local. Le Free Tier Gemini permet de tester sans budget OpenAI, mais il reste soumis aux quotas Google et les contenus envoyés peuvent être utilisés par Google pour améliorer ses produits. L’app affiche donc une mention de consentement avant tout envoi externe.

## Synchronisation et données

La branche 0.26.0 prépare la persistance locale des amis : la base métier passe en Dexie v9, la sauvegarde en JSON v8 et le runtime Dexie Cloud reste en v10 sans synchronisation sociale réelle. Un garde-fou social bloque aussi tout export détaillé tant que le consentement par ami n’est pas livré.

## Arbitrage bundle

Le budget JavaScript reste aligné sur le budget 0.25.x accepté pour conserver une interface photo claire, testable et compatible avec le parcours IA. L’optimisation du bundle devra être traitée ultérieurement comme chantier technique global.
