import { defineStore } from 'pinia'
// Supabase est importé mais on va bypasser les appels pour l'instant
// import { supabase } from '../lib/supabase'

export const useCategoriesStore = defineStore('categories', {
  state: () => ({
    categories: [],
    loading: false,
    error: null
  }),
  
  actions: {
    async _uploadIcon(base64Data) {
      // Mocking upload for now (return base64 directly to show in UI)
      return base64Data
    },

    async _deleteIcon(url) {
      console.log('Mock: Suppression de l\'icône', url)
    },

    async fetchCategories() {
      this.loading = true
      this.error = null
      try {
        // Mock loading: on ne fait rien car la table n'existe pas
        // this.categories = [] 
        console.log('Mock: fetchCategories (Table non existante dans Supabase)')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async addCategory(categoryData) {
      if (!categoryData.name) return
      
      this.loading = true
      try {
        const newCategory = {
          name: categoryData.name.trim(),
          description: categoryData.description || '',
          icon: categoryData.icon || null
        }
        
        // On ajoute seulement localement pour l'instant
        this.categories.unshift(newCategory)
        console.log('Mock: addCategory (Local uniquement)')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async updateCategory(oldName, updatedData) {
      if (!updatedData.name) return
      
      this.loading = true
      try {
        const index = this.categories.findIndex(c => c.name === oldName)
        if (index !== -1) {
          const updatedCategory = {
            name: updatedData.name.trim(),
            description: updatedData.description || '',
            icon: updatedData.icon || null
          }
          this.categories[index] = updatedCategory
        }
        console.log('Mock: updateCategory (Local uniquement)')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async deleteCategory(name) {
      this.loading = true
      try {
        this.categories = this.categories.filter(c => c.name !== name)
        console.log('Mock: deleteCategory (Local uniquement)')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    }
  }
})
