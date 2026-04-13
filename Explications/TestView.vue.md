# Explication de TestView.vue

C'est le fichier **le plus complexe** du projet. Il gère toute la logique du quiz interactif et le calcul de la répétition espacée (SRS).

## Logique de sélection des cartes (Algorithme 70/30) :
- Le code sépare les cartes disponibles en deux tas : `dueCards` (à réviser) et `newCards` (nouvelles).
- Il prend 70% dans le tas "à réviser" en donnant la **priorité aux maîtrises les plus faibles**.
- Il prend 30% dans le tas "nouvelles".
- Si un tas est vide, il complète avec l'autre pour toujours arriver au nombre de questions demandé.

## Déroulement d'une question :
- `generateChoices` : Pour chaque carte, il va chercher 3 autres cartes de la **même catégorie** pour servir de pièges (distracteurs). Il nettoie les textes (suppression d'espaces) pour éviter d'avoir deux fois la même réponse.
- `handleChoice` : Vérifie si ta réponse est bonne. Si tu te trompes une seule fois sur une carte, elle est marquée comme "échouée" (failed) pour la suite.

## Calcul de la Maîtrise et des Dates (SRS) :
C'est la partie cruciale à la fin du test (`saveAndExit`) :
- Si tu as réussi la carte : `maitrise + 1`.
- Si tu as échoué : `maitrise - 1`.
- La nouvelle `due_date` est calculée à partir de la date déjà enregistrée :
    - Maîtrise 1 : +1 jour
    - Maîtrise 2 : +3 jours
    - Maîtrise 3 : +7 jours
    - Maîtrise 4 : +14 jours
    - Maîtrise 5 : +30 jours
    - Maîtrise 0 : Date d'aujourd'hui.

## Pourquoi ce fichier ?
C'est le "moteur" d'apprentissage. Il transforme tes réponses en données mathématiques pour décider quand tu devras revoir chaque carte pour ne pas l'oublier.

---
[Retour au Sommaire](Sommaire.md)
