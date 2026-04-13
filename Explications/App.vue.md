# Explication de App.vue

Ce fichier est le **cadre principal** de ton application. Il contient les éléments qui doivent être visibles sur toutes les pages.

## Partie Script (Logique) :
- `showTopBtn` : Une variable "réactive" qui dit si le bouton de retour en haut doit être affiché ou non.
- `handleScroll` : Cette fonction regarde où tu en es dans la page. Si tu as descendu de plus de 100 pixels, elle active le bouton.
- `scrollToTop` : Utilise une commande interne du navigateur pour remonter tout en haut avec un effet fluide (`smooth`).
- `IntersectionObserver` : Une technique moderne et performante pour savoir si tu es en haut de la page sans fatiguer le processeur du téléphone.
- `pageTitle` : Une fonction de calcul (`computed`) qui analyse l'adresse URL actuelle pour décider du titre à envoyer au [Header](Header.vue.md). Par exemple, si tu es sur la page test, il affiche "Test".

## Partie Template (Affichage) :
- `<Header :title="pageTitle" />` : Affiche la barre du haut en lui envoyant le titre calculé.
- `<RouterView />` : C'est ici que le contenu de chaque page (Accueil, Test, etc.) vient s'afficher. C'est le "trou" que le routeur remplit.
- `<button v-if="showTopBtn" class="scroll-top-btn">` : Le bouton flottant qui apparaît quand tu défiles. Il a un `z-index` énorme pour passer devant tout le reste.

## Pourquoi ce fichier ?
C'est le "parent" de tous les autres. Il gère la structure globale, la détection du défilement et le changement dynamique du titre du Header.

---
[Retour au Sommaire](Sommaire.md)
