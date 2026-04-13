# Explication de supabase.js

Ce fichier est le **pont de communication** entre ton application (le code) et ta base de données (Supabase).

## Détail des lignes :
- `import { createClient } from '@supabase/supabase-js'` : Utilise la bibliothèque officielle de Supabase pour créer une connexion.
- `const supabaseUrl = '...'` : C'est comme l'adresse postale de ton serveur de base de données.
- `const supabaseKey = '...'` : C'est la clé (le mot de passe public) qui permet à ton code d'avoir le droit de lire et écrire dans la base.
- `export const supabase = createClient(...)` : Crée l'objet `supabase` que tous les autres fichiers vont importer pour parler à la base de données.

## Pourquoi ce fichier ?
Au lieu de réécrire tes identifiants de connexion dans chaque page, on les met ici une fois pour toutes. Si tu changes de base de données, tu n'as qu'un seul fichier à modifier.

Il est utilisé par :
- Les stores comme [flashcards.js](store_flashcards.js.md) pour sauver les cartes.
- Les vues comme [HomePage.vue](HomePage.vue.md) pour afficher les compteurs.

---
[Retour au Sommaire](Sommaire.md)
