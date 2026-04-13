# Sommaire des explications

Bienvenue dans le dossier d'explications du projet Flashcards. Chaque fichier ici correspond à une pièce du puzzle de l'application.

## Architecture Globale
L'application est construite avec **Vue.js 3** (Composition API), **Pinia** pour la gestion d'état, **Vue Router** pour la navigation, et **Supabase** pour la base de données.

## Fichiers de configuration et points d'entrée
- [index.html](index.html.md) : Le point d'entrée HTML.
- [main.js](main.js.md) : Le point d'entrée JavaScript.
- [App.vue](App.vue.md) : Le composant racine.
- [supabase.js](supabase.js.md) : Configuration de la base de données.
- [router/index.js](router_index.js.md) : Définition des pages et de la navigation.

## Gestion des données (Stores Pinia)
- [categories.js](store_categories.js.md) : Gestion des catégories.
- [domaines.js](store_domaines.js.md) : Gestion des domaines.
- [flashcards.js](store_flashcards.js.md) : Gestion des flashcards et de la table Revision.

## Composants Réutilisables
- [Header.vue](Header.vue.md) : La barre de navigation supérieure.
- [TestForm.vue](TestForm.vue.md) : Formulaire de configuration d'un test.
- [FlashcardForm.vue](FlashcardForm.vue.md) : Formulaire d'ajout/édition de flashcards.
- [DomaineForm.vue](DomaineForm.vue.md) : Formulaire pour les domaines.
- [CategoryForm.vue](CategoryForm.vue.md) : Formulaire pour les catégories.

## Pages (Views)
- [HomePage.vue](HomePage.vue.md) : Page d'accueil avec résumé des révisions.
- [DomainesView.vue](DomainesView.vue.md) : Liste des domaines.
- [CategoriesView.vue](CategoriesView.vue.md) : Liste des catégories d'un domaine.
- [FlashcardsView.vue](FlashcardsView.vue.md) : Liste des flashcards d'une catégorie.
- [TestView.vue](TestView.vue.md) : L'interface de test interactif.
- [StatsView.vue](StatsView.vue.md) : Historique des scores.
- [ChartsView.vue](ChartsView.vue.md) : Graphiques de progression.
