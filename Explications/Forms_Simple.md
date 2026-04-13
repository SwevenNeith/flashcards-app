# Explication de DomaineForm.vue et CategoryForm.vue

Ces deux fichiers sont les fenêtres qui s'ouvrent pour créer un nouveau thème ou une nouvelle catégorie.

## Logique partagée :
- **Upload d'icône** : Comme pour les flashcards, ils permettent de choisir une image qui est compressée avant d'être envoyée.
- **Émission d'événement** : Une fois validé, le composant utilise `emit('submit', ...)` pour envoyer les données au composant parent qui se chargera de l'enregistrement via le store.

## Pourquoi ces fichiers ?
Ils gardent l'interface propre en isolant la logique de saisie dans des fenêtres modales, évitant ainsi de surcharger les pages principales.

---
[Retour au Sommaire](Sommaire.md)
