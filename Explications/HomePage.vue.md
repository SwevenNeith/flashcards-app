# Explication de HomePage.vue

C'est la page d'accueil, ton tableau de bord personnel.

## Détail des lignes et de la logique :
- `onMounted` : Dès que la page s'affiche, elle fait trois choses :
    1. Vérifie si tu as un test en cours (`Quizz`) pour te proposer de le reprendre.
    2. Compte les **Nouvelles cartes** (celles qui n'ont jamais été testées, `due_date IS NULL`).
    3. Compte les **Cartes à réviser** (celles dont la date est passée ou égale à aujourd'hui).
- `Aggregation des domaines` : Le code parcourt toutes les cartes à réviser et crée un objet `map` pour compter combien il y en a par domaine. Ensuite, il trie ces domaines pour afficher ceux qui ont le plus de travail en premier.
- `startTestForDomain` : Ouvre le [TestForm](TestForm.vue.md) en lui passant l'ID du domaine cliqué. Cela verrouille le formulaire sur ce domaine.

## Pourquoi ce fichier ?
Il ne sert pas juste à dire "Bonjour", il analyse ta base de données en temps réel pour te dire exactement ce que tu dois travailler aujourd'hui (le système SRS).

---
[Retour au Sommaire](Sommaire.md)
