# Explication de router/index.js

C'est l'**aiguilleur** de ton application. C'est lui qui définit quel fichier s'affiche quand tu changes d'adresse (URL).

## Détail des lignes :
- `createWebHashHistory` : Utilise le symbole `#` dans l'URL. C'est très pratique pour héberger sur GitHub Pages car cela évite les erreurs 404 quand on rafraîchit la page.
- `routes` : C'est la liste de toutes tes pages.
    - `/` : C'est l'accueil ([HomePage.vue](HomePage.vue.md)).
    - `/domaines` : La liste des domaines ([DomainesView.vue](DomainesView.vue.md)).
    - `/categories/:domainName` : Le `:` indique que `domainName` est une variable (ex: `/categories/Informatique`).
    - `/test` : La page de test interactif ([TestView.vue](TestView.vue.md)).
- `component: () => import(...)` : C'est ce qu'on appelle le **Lazy Loading**. L'application ne charge le code de la page que lorsque tu cliques dessus. Cela permet à l'application de s'ouvrir plus vite au début.

## Pourquoi ce fichier ?
Sans lui, tu ne pourrais pas changer de page. Il fait le lien entre une adresse (ex: `/statistiques`) et un fichier visuel (ex: [StatsView.vue](StatsView.vue.md)).

---
[Retour au Sommaire](Sommaire.md)
