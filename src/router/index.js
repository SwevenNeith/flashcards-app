import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },

    {
      path: '/domaines',
      name: 'domaines',
      component: () => import('../views/DomainesView.vue')
    },
    {
      path: '/categories/:domainName',
      name: 'categories',
      component: () => import('../views/CategoriesView.vue'),
      props: true
    },
    {
      path: '/flashcards/:categoryName',
      name: 'flashcards',
      component: () => import('../views/FlashcardsView.vue'),
      props: true
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/TestView.vue'),
      props: (route) => ({
        type: route.query.type,
        domain: route.query.domain,
        category: route.query.category,
        count: route.query.count
      })
    }

  ]
})

export default router
