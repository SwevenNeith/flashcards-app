# Explication de DomainesView, CategoriesView et FlashcardsView

Ces trois pages fonctionnent sur le même modèle de **navigation en cascade**.

## Logique de DomainesView.vue :
- Affiche tous les domaines depuis le [store domaines](store_domaines.js.md).
- Quand tu cliques sur un domaine, il utilise le [routeur](router_index.js.md) pour t'envoyer vers `/categories/NomDuDomaine`.

## Logique de CategoriesView.vue :
- Récupère le nom du domaine dans l'URL.
- Filtre les catégories pour n'afficher que celles qui appartiennent à ce domaine.

## Logique de FlashcardsView.vue :
- C'est la page la plus interactive après le test.
- **Recherche** : Filtre les cartes par leur nom en ignorant les accents et les majuscules (`normalizeText`).
- **Alphabet** : Permet de filtrer les cartes par leur première lettre.
- **Swipe (Mobile)** : Contient une logique (`touchStartX`, `touchEndX`) pour passer d'une carte à l'autre en glissant le doigt sur l'écran.

## Pourquoi ces fichiers ?
Ils constituent l'explorateur de ton contenu. Sans eux, tu ne pourrais pas gérer tes cartes manuellement ou simplement les consulter comme un dictionnaire.

---
[Retour au Sommaire](Sommaire.md)
