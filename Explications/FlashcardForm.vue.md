# Explication de FlashcardForm.vue

C'est le formulaire complexe pour créer ou modifier une carte.

## Détail de la logique :
- **Éditeur Riche** (`contenteditable`) : Contrairement à un simple champ texte, il permet de mettre du **gras**, de l'*italique* ou de souligner. Les fonctions `format('bold')` utilisent des commandes internes du navigateur (`execCommand`).
- **Gestion des Images** :
    - `FileReader` : Lit le fichier image que tu choisis sur ton ordinateur.
    - `compressImage` : Utilise un "Canvas" (une zone de dessin invisible) pour redimensionner ton image en 200x200 pixels avant de l'envoyer. Cela évite que les images soient trop lourdes en base de données.
- `handleSubmit` : Rassemble le nom, la description mise en forme (HTML) et l'image pour les envoyer au [store des flashcards](store_flashcards.js.md).

## Pourquoi ce fichier ?
C'est l'outil de création de contenu. Sa complexité vient du fait qu'il gère à la fois du texte riche (HTML) et des images compressées pour que l'app reste rapide.

---
[Retour au Sommaire](Sommaire.md)
