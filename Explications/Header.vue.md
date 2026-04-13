# Explication de Header.vue

C'est la barre supérieure de ton application que l'on voit en permanence.

## Détail des lignes :
- `defineProps(['title'])` : Reçoit le titre de la part de [App.vue](App.vue.md).
- `goBack` : Fonction qui utilise `router.back()` pour simuler le bouton de retour du téléphone.
- `logo-link` : Le logo sur la gauche qui ramène à l'accueil.
- `icon-link` (Crayon) : Un lien SVG vers la page des Domaines.
- `icon-link` (Graphique) : Un lien SVG vers la page des Statistiques.

## Pourquoi ce fichier ?
Il centralise la navigation rapide. Au lieu de mettre des menus partout, les icônes à droite permettent d'accéder aux fonctions clés de l'app (création et stats) depuis n'importe où.

---
[Retour au Sommaire](Sommaire.md)
