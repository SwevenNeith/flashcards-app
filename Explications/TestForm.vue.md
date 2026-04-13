# Explication de TestForm.vue

C'est la fenêtre surgissante (modale) qui s'ouvre quand tu cliques sur "Démarrer un test".

## Détail des lignes :
- `selectionType` : Variable qui retient si tu veux te tester sur un "Domaine" complet ou une "Catégorie" précise.
- `props: ['preselectedDomainId']` : Reçoit l'ID d'un domaine si tu as cliqué sur un domaine spécifique depuis l'accueil.
- `watch([selectedDomain, selectionType])` : Si tu changes de domaine ou si tu passes en mode "Catégorie", cette fonction va demander au [store des catégories](store_categories.js.md) de charger les bonnes catégories.
- `countOptions` : La liste [10, 20, 30] qui définit le nombre de questions.
- `handleStart` : Vérifie que tu as bien tout sélectionné avant d'envoyer les informations à la [HomePage](HomePage.vue.md) pour lancer le test.

## Pourquoi ce fichier ?
Il sert de filtre. Au lieu de lancer un test au hasard sur les 1000+ cartes, il permet de cibler exactement ce que tu veux réviser.

---
[Retour au Sommaire](Sommaire.md)
