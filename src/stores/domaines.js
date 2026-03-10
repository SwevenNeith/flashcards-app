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
    },

    deleteDomaine(id) {
      this.domaines = this.domaines.filter(d => d.id !== id)
    }
  },
  persist: true
})
