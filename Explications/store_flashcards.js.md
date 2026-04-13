# Explication de store/flashcards.js

C'est le **centre de gestion de tes cartes**. Ce fichier utilise Pinia pour stocker les flashcards et contient toutes les fonctions pour créer, modifier ou supprimer des cartes dans la base de données.

## État (State) :
- `flashcards` : La liste des cartes actuellement affichées.
- `loading` : Un indicateur pour savoir si un téléchargement est en cours (pour afficher un spinner).

## Fonctions principales (Actions) :
- `_uploadIcon` : Transforme une image (base64) en un fichier réel stocké sur Supabase Storage. C'est ce qui permet d'avoir des icônes personnalisées.
- `fetchFlashcards` : Va chercher les cartes d'une catégorie précise en demandant à Supabase. Elle utilise un "Join" (`!inner`) pour être sûre de récupérer aussi le nom de la catégorie.
- `addFlashcard` : 
    1. Trouve les ID de catégorie et de domaine.
    2. Upload l'icône si nécessaire.
    3. Enregistre la nouvelle carte dans la table **Flashcards**.
    4. **Nouveau** : Crée automatiquement une ligne dans la table **Revision** avec une maîtrise de 0. C'est ici que l'automatisation dont nous avons parlé se passe.
- `deleteFlashcard` : Supprime la carte de la base de données et supprime aussi son icône du stockage pour ne pas prendre de place inutilement.

## Pourquoi ce fichier ?
C'est la "source de vérité" pour les cartes. N'importe quelle page qui a besoin de cartes (comme [FlashcardsView.vue](FlashcardsView.vue.md)) pioche dans ce fichier.

---
[Retour au Sommaire](Sommaire.md)
