# Explication de index.html

Ce fichier est le **point d'entrée physique** de ton application. C'est la seule page HTML que le navigateur charge réellement. On appelle cela une **SPA (Single Page Application)**.

## Détail des lignes :
- `<!doctype html>` : Indique au navigateur qu'il s'agit d'un document HTML5 moderne.
- `<html lang="">` : La balise racine du document.
- `<head>` : Contient les métadonnées (ce qui ne se voit pas directement sur la page).
    - `<link rel="icon" href="/favicon.png" />` : Définit la petite icône dans l'onglet du navigateur (logo du projet).
    - `<meta name="viewport" ...>` : Crucial pour le **Responsive**. Indique au téléphone que la largeur de l'écran doit être respectée (évite que tout soit écrit en minuscule sur mobile).
    - `<title>Flashcards</title>` : Le nom qui s'affiche sur l'onglet du navigateur.
- `<body>` : Le contenu visible de la page.
    - `<div id="app"></div>` : C'est la ligne la plus importante. C'est ici que Vue.js va "injecter" toute l'application. On appelle ça le point de montage.
    - `<script type="module" src="/src/main.js"></script>` : Appelle le fichier [main.js](main.js.md) qui va démarrer la logique JavaScript.

## Pourquoi ce fichier ?
Sans lui, le navigateur ne saurait pas quoi afficher. Il sert de "coque" vide que Vue.js va remplir dynamiquement au fur et à mesure que tu navigues.

---
[Retour au Sommaire](Sommaire.md)
