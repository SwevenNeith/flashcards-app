import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useFlashcardsStore = defineStore('flashcards', {
  state: () => ({
    flashcards: [], // Changé de 'cards' à 'flashcards' pour la cohérence
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
          .from('flashcard-icon')
          .upload(fileName, uInt8Array, {
            contentType,
            upsert: false
          })

        if (error) throw error
        
        const { data: { publicUrl } } = supabase.storage
          .from('flashcard-icon')
          .getPublicUrl(data.path)
          
        return publicUrl
      } catch (e) {
        console.error('Erreur upload Storage Flashcards:', e)
        return null
      }
    },

    async _deleteIcon(url) {
      if (!url || !url.includes('/public/flashcard-icon/')) {
        console.log('URL non reconnue comme une icône du bucket flashcard-icon:', url)
        return
      }
      
      try {
        const fileName = url.split('/').pop()
        const { error } = await supabase.storage
          .from('flashcard-icon')
          .remove([fileName])
          
        if (error) {
          console.error('Erreur Supabase Storage DELETE Flashcard:', error)
          throw error
        }
      } catch (e) {
        console.error('Erreur lors de la suppression de l\'icône flashcard:', e)
      }
    },

    async fetchFlashcards(identifier) {
      if (!identifier) return
      
      this.loading = true
      this.error = null
      try {
        const isId = /^[0-9a-fA-F-]{36}$/.test(identifier) || !isNaN(identifier)
        
        let query = supabase.from('Flashcards').select('*, Categories!inner(name)')
        
        if (isId) {
          query = query.eq('category', identifier)
        } else {
          query = query.eq('Categories.name', identifier)
        }

        const { data, error } = await query
        
        if (error) throw error
        this.flashcards = data || []
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la récupération des flashcards:', e)
      } finally {
        this.loading = false
      }
    },

    async addFlashcard(flashcardData, categoryName) {
      if (!flashcardData.name || !categoryName) return
      
      const trimmedName = flashcardData.name.trim()
      
      this.loading = true
      try {
        // First, get the category ID and domain ID by its name
        const { data: catData, error: catError } = await supabase
          .from('Categories')
          .select('id, domain')
          .eq('name', categoryName)
          .single()
        
        if (catError || !catData) throw new Error('Catégorie introuvable')
        const categoryId = catData.id
        const domainId = catData.domain

        let iconUrl = flashcardData.icon
        
        if (iconUrl && iconUrl.startsWith('data:')) {
          const uploadedUrl = await this._uploadIcon(iconUrl)
          if (uploadedUrl) {
            iconUrl = uploadedUrl
          }
        }

        const { data, error } = await supabase
          .from('Flashcards')
          .insert([{
            name: trimmedName,
            category: categoryId,
            domain: domainId,
            description: flashcardData.description || '',
            icon: iconUrl || null
          }])
          .select()

        if (error) throw error

        if (data && data[0]) {
          this.flashcards.unshift(data[0])
        }
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de l\'ajout de la flashcard:', e)
        alert('Erreur lors de l\'ajout : ' + e.message)
      } finally {
        this.loading = false
      }
    },

    async updateFlashcard(oldName, updatedData, categoryName) {
      if (!updatedData.name || !categoryName) return
      
      this.loading = true
      try {
        let iconUrl = updatedData.icon
        
        if (iconUrl && iconUrl.startsWith('data:')) {
          const uploadedUrl = await this._uploadIcon(iconUrl)
          if (uploadedUrl) {
            iconUrl = uploadedUrl
          }
        }

        // Resolve category ID
        const { data: catData } = await supabase.from('Categories').select('id').eq('name', categoryName).single()
        if (!catData) throw new Error('Catégorie introuvable')

        const { data, error } = await supabase
          .from('Flashcards')
          .update({
            name: updatedData.name.trim(),
            description: updatedData.description || '',
            icon: iconUrl || null
          })
          .eq('name', oldName)
          .eq('category', catData.id)
          .select()

        if (error) throw error

        if (data && data[0]) {
          const index = this.flashcards.findIndex(f => f.name === oldName)
          if (index !== -1) {
            const oldIcon = this.flashcards[index].icon
            if (oldIcon && oldIcon !== iconUrl) {
              await this._deleteIcon(oldIcon)
            }
            this.flashcards[index] = data[0]
          }
        }
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la mise à jour de la flashcard:', e)
        alert('Erreur lors de la mise à jour : ' + e.message)
      } finally {
        this.loading = false
      }
    },

    async deleteFlashcard(name, categoryName) {
      if (!categoryName) return
      
      this.loading = true
      try {
        const flashcardToDelete = this.flashcards.find(f => f.name === name)
        const oldIcon = flashcardToDelete?.icon

        // Resolve category ID
        const { data: catData } = await supabase.from('Categories').select('id').eq('name', categoryName).single()
        if (!catData) throw new Error('Catégorie introuvable')

        const { error } = await supabase
          .from('Flashcards')
          .delete()
          .eq('name', name)
          .eq('category', catData.id)

        if (error) throw error
        
        if (oldIcon) {
          await this._deleteIcon(oldIcon)
        }

        this.flashcards = this.flashcards.filter(f => f.name !== name)
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la suppression de la flashcard:', e)
      } finally {
        this.loading = false
      }
    },

    async fetchFlashcardsByCategories(categoryNames) {
      if (!categoryNames || categoryNames.length === 0) return []
      
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase
          .from('Flashcards')
          .select('*, Categories!inner(name)')
          .in('Categories.name', categoryNames)
        
        if (error) throw error
        return data || []
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la récupération groupée des flashcards:', e)
        return []
      } finally {
        this.loading = false
      }
    }
  }
})
