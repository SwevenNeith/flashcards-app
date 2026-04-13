# Explication de main.js

C'est le **cerveau de démarrage** de l'application. C'veut dire "Exécute ceci en premier dès que la page HTML est chargée".

## Détail des lignes :
- `import './assets/main.css'` : Importe le fichier de style global (les couleurs, polices de base).
- `import { createApp } from 'vue'` : Importe la fonction de base de Vue pour créer une application.
- `import { createPinia } from 'pinia'` : Importe l'outil de gestion des données (les "Stores").
- `import App from './App.vue'` : Importe le composant racine [App.vue](App.vue.md).
- `import router from './router'` : Importe la configuration de la navigation (le routeur).
- `const app = createApp(App)` : Crée l'instance de l'application en utilisant `App.vue` comme composant principal.
- `const pinia = createPinia()` : Initialise le système de stockage de données.
- `app.use(pinia)` : Dit à l'application d'utiliser Pinia.
- `app.use(router)` : Dit à l'application d'utiliser le système de navigation.
- `app.mount('#app')` : Branche l'application sur la balise `<div id="app">` présente dans [index.html](index.html.md).

## Pourquoi ce fichier ?
Il sert à configurer tous les outils (plugins) dont l'application a besoin (navigation, données, styles) avant de l'afficher.

---
[Retour au Sommaire](Sommaire.md)
