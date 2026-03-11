import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useCategoriesStore = defineStore('categories', {
  state: () => ({
    categories: [],
    loading: false,
    error: null
  }),
  
  actions: {
    async _uploadIcon(base64Data) {
      if (!base64Data || !base64Data.startsWith('data:')) return null
      
      try {
        const parts = base64Data.split(';base64,')
        const contentType = parts[0].split(':')[1]
        const raw = window.atob(parts[1])
        const rawLength = raw.length
        const uInt8Array = new Uint8Array(rawLength)
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i)
        }
        
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        const { data, error } = await supabase.storage
          .from('category-icon')
          .upload(fileName, uInt8Array, {
            contentType,
            upsert: false
          })

        if (error) throw error
        
        const { data: { publicUrl } } = supabase.storage
          .from('category-icon')
          .getPublicUrl(data.path)
          
        return publicUrl
      } catch (e) {
        console.error('Erreur upload Storage:', e)
        return null
      }
    },

    async _deleteIcon(url) {
      if (!url || !url.includes('/public/category-icon/')) {
        console.log('URL non reconnue comme une icône du bucket category-icon:', url)
        return
      }
      
      try {
        const fileName = url.split('/').pop()
        const { error } = await supabase.storage
          .from('category-icon')
          .remove([fileName])
          
        if (error) {
          console.error('Erreur Supabase Storage DELETE:', error)
          throw error
        }
      } catch (e) {
        console.error('Erreur lors de la suppression de l\'icône:', e)
      }
    },

    async fetchCategories(domainName) {
      if (!domainName) return
      
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase
          .from('Categories')
          .select('*')
          .eq('domain', domainName)
        
        if (error) throw error
        this.categories = data || []
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la récupération des catégories:', e)
      } finally {
        this.loading = false
      }
    },

    async addCategory(categoryData, domainName) {
      if (!categoryData.name || !domainName) return
      
      const trimmedName = categoryData.name.trim()
      
      // Vérification locale rapide
      const existing = this.categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase())
      if (existing) {
        alert('Une catégorie avec ce nom existe déjà dans ce domaine.')
        return
      }

      this.loading = true
      try {
        let iconUrl = categoryData.icon
        
        if (iconUrl && iconUrl.startsWith('data:')) {
          const uploadedUrl = await this._uploadIcon(iconUrl)
          if (uploadedUrl) {
            iconUrl = uploadedUrl
          }
        }

        const { data, error } = await supabase
          .from('Categories')
          .insert([{
            name: trimmedName,
            domain: domainName,
            description: categoryData.description || '',
            icon: iconUrl || null
          }])
          .select()

        if (error) {
          if (error.code === '23505') {
             alert('Une catégorie avec ce nom existe déjà pour ce domaine.')
          } else {
            throw error
          }
          return
        }

        if (data && data[0]) {
          this.categories.unshift(data[0])
        }
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de l\'ajout de la catégorie:', e)
        alert('Erreur lors de l\'ajout : ' + e.message)
      } finally {
        this.loading = false
      }
    },

    async updateCategory(oldName, updatedData, domainName) {
      if (!updatedData.name || !domainName) return
      
      this.loading = true
      try {
        let iconUrl = updatedData.icon
        
        if (iconUrl && iconUrl.startsWith('data:')) {
          const uploadedUrl = await this._uploadIcon(iconUrl)
          if (uploadedUrl) {
            iconUrl = uploadedUrl
          }
        }

        const { data, error } = await supabase
          .from('Categories')
          .update({
            name: updatedData.name.trim(),
            description: updatedData.description || '',
            icon: iconUrl || null
          })
          .eq('name', oldName)
          .eq('domain', domainName)
          .select()

        if (error) {
          if (error.code === '23505') {
            alert('Une autre catégorie avec ce nom existe déjà dans ce domaine.')
          } else {
            throw error
          }
          return
        }

        if (data && data[0]) {
          const index = this.categories.findIndex(c => c.name === oldName)
          if (index !== -1) {
            const oldIcon = this.categories[index].icon
            if (oldIcon && oldIcon !== iconUrl) {
              await this._deleteIcon(oldIcon)
            }
            this.categories[index] = data[0]
          }
        }
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la mise à jour de la catégorie:', e)
        alert('Erreur lors de la mise à jour : ' + e.message)
      } finally {
        this.loading = false
      }
    },

    async deleteCategory(name, domainName) {
      if (!domainName) return
      
      this.loading = true
      try {
        const categoryToDelete = this.categories.find(c => c.name === name)
        const oldIcon = categoryToDelete?.icon

        const { error } = await supabase
          .from('Categories')
          .delete()
          .eq('name', name)
          .eq('domain', domainName)

        if (error) throw error
        
        if (oldIcon) {
          await this._deleteIcon(oldIcon)
        }

        this.categories = this.categories.filter(c => c.name !== name)
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la suppression de la catégorie:', e)
      } finally {
        this.loading = false
      }
    }
  }
})
