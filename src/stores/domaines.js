import { defineStore } from 'pinia'

export const useDomainesStore = defineStore('domaines', {
  state: () => ({
    domaines: [],
    loading: false,
    error: null
  }),
  
  actions: {
    addDomaine(domainData) {
      if (!domainData.name) return
      this.domaines.push({
        id: Date.now(),
        name: domainData.name,
        description: domainData.description || '',
        icon: domainData.icon || null
      })
      this.saveToLocalStorage()
    },

    
    deleteDomaine(id) {
      this.domaines = this.domaines.filter(d => d.id !== id)
      this.saveToLocalStorage()
    },
    
    saveToLocalStorage() {
      try {
        localStorage.setItem('domaines', JSON.stringify(this.domaines))
      } catch (e) {
        console.error('Erreur de stockage LocalStorage:', e)
        if (e.name === 'QuotaExceededError') {
          alert('Impossible de sauvegarder : l\'espace de stockage est plein. Essayez avec des images plus petites.')
        }
      }
    },

    
    loadFromLocalStorage() {
      const stored = localStorage.getItem('domaines')
      if (stored) {
        this.domaines = JSON.parse(stored)
      }
    }
  }
})
