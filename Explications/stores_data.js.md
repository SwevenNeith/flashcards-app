# Explication de store_domaines.js et store_categories.js

Ces deux fichiers sont très similaires : ils gèrent respectivement la liste des thèmes globaux et les tiroirs à l'intérieur de ces thèmes.

## Fonctions Communes :
- `fetchDomaines` / `fetchCategories` : Interrogent Supabase pour récupérer la liste.
- `addDomaine` / `addCategory` : Créent un nouvel élément. Elles gèrent aussi l'upload de l'icône (pareil que pour les flashcards).
- `deleteDomaine` / `deleteCategory` : Suppriment l'élément. Attention, si tu supprimes un domaine, cela peut affecter les catégories à l'intérieur selon les règles de ta base de données.

## Détails importants :
- **Tri** : Les vues comme [DomainesView.vue](DomainesView.vue.md) utilisent souvent ces données mais peuvent décider de les trier par ordre alphabétique.
- **Relatons** : Une catégorie appartient toujours à un domaine. C'est pour cela que `addCategory` demande un `domainId`.

---
[Retour au Sommaire](Sommaire.md)
