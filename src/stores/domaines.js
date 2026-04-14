import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useDomainesStore = defineStore('domaines', {
  state: () => ({
    domaines: [],
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
          .from('domain-icon')
          .upload(fileName, uInt8Array, {
            contentType,
            upsert: false
          })

        if (error) throw error
        
        const { data: { publicUrl } } = supabase.storage
          .from('domain-icon')
          .getPublicUrl(data.path)
          
        return publicUrl
      } catch (e) {
        console.error('Erreur upload Storage:', e)
        return null
      }
    },

    async _deleteIcon(url) {
      if (!url || !url.includes('/public/domain-icon/')) {
        console.log('URL non reconnue comme une icône du bucket:', url)
        return
      }
      
      try {
        const fileName = url.split('/').pop()
        const { error } = await supabase.storage
          .from('domain-icon')
          .remove([fileName])
          
        if (error) {
          throw error
        }
      } catch (e) {
        console.error('Erreur lors de la suppression de l\'icône:', e)
      }
    },

    async fetchDomaines() {
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase
          .from('Domaines')
          .select('*')
        
        if (error) throw error
        this.domaines = data || []
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la récupération des domaines:', e)
      } finally {
        this.loading = false
      }
    },

    async addDomaine(domainData) {
      if (!domainData.name) return
      
      const trimmedName = domainData.name.trim()
      
      // Vérifier si le nom existe déjà localement (optimisation)
      const existing = this.domaines.find(d => d.name.toLowerCase() === trimmedName.toLowerCase())
      if (existing) {
        alert('Un domaine avec ce nom existe déjà.')
        return
      }

      this.loading = true
      try {
        let iconUrl = domainData.icon
        
        // Si c'est une image base64, on l'upload d'abord dans le Storage
        if (iconUrl && iconUrl.startsWith('data:')) {
          const uploadedUrl = await this._uploadIcon(iconUrl)
          if (uploadedUrl) {
            iconUrl = uploadedUrl
          } else {
            console.warn('L\'upload de l\'icône a échoué (vérifiez vos politiques RLS), stockage en Base64 à la place.')
          }
        }

        const { data, error } = await supabase
          .from('Domaines')
          .insert([{
            name: trimmedName,
            description: domainData.description || '',
            icon: iconUrl || null
          }])
          .select()

        if (error) {
          if (error.code === '23505') { // Code Postgres pour violation de contrainte unique
             alert('Un domaine avec ce nom existe déjà dans la base de données.')
          } else {
            throw error
          }
          return
        }

        if (data && data[0]) {
          this.domaines.unshift(data[0])
        }
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de l\'ajout du domaine:', e)
        alert('Erreur lors de l\'ajout du domaine : ' + e.message)
      } finally {
        this.loading = false
      }
    },

    async updateDomaine(oldName, updatedData) {
      if (!updatedData.name) return
      
      this.loading = true
      try {
        let iconUrl = updatedData.icon
        
        // Si c'est une nouvelle image base64, on l'upload
        if (iconUrl && iconUrl.startsWith('data:')) {
          const uploadedUrl = await this._uploadIcon(iconUrl)
          if (uploadedUrl) {
            iconUrl = uploadedUrl
          }
        }

        const { data, error } = await supabase
          .from('Domaines')
          .update({
            name: updatedData.name.trim(),
            description: updatedData.description || '',
            icon: iconUrl || null
          })
          .eq('name', oldName)
          .select()

        if (error) {
          if (error.code === '23505') {
            alert('Un autre domaine avec ce nom existe déjà.')
          } else {
            throw error
          }
          return
        }

        if (data && data[0]) {
          const index = this.domaines.findIndex(d => d.name === oldName)
          if (index !== -1) {
            const oldIcon = this.domaines[index].icon
            // Si l'icône a changé, on supprime l'ancienne
            if (oldIcon && oldIcon !== iconUrl) {
              await this._deleteIcon(oldIcon)
            }
            this.domaines[index] = data[0]
          }
        }
      } catch (e) {
        this.error = e.message
        console.error('Erreur lors de la mise à jour du domaine:', e)
        alert('Erreur lors de la mise à jour : ' + e.message)
      } finally {
        this.loading = false
      }
    },

    async deleteDomaine(name) {
      const domainToDelete = this.domaines.find(d => d.name === name)
      if (!domainToDelete) return
      
      const domainId = domainToDelete.id
      const oldIcon = domainToDelete.icon

      this.loading = true
      try {
        // 1. Récupérer les informations des catégories pour le nettoyage futur des icônes
        const { data: categories } = await supabase
          .from('Categories')
          .select('id, name, icon')
          .eq('domain', domainId)

        // 2. Identifier toutes les flashcards impactées
        const { data: flashcards } = await supabase
          .from('Flashcards')
          .select('id')
          .eq('domain', domainId)
        
        const flashcardIds = flashcards?.map(f => f.id) || []

        if (flashcardIds.length > 0) {
          // 3. Supprimer les Révisions
          const { error: revError } = await supabase
            .from('Revision')
            .delete()
            .in('flashcard', flashcardIds)
          if (revError) throw revError
        }

        // 5. Supprimer les flashcards
        const { error: flashError } = await supabase
          .from('Flashcards')
          .delete()
          .eq('domain', domainId)
        if (flashError) throw flashError

        // 6. Supprimer les catégories
        const { error: catError } = await supabase
          .from('Categories')
          .delete()
          .eq('domain', domainId)
        if (catError) throw catError

        // 7. Supprimer le domaine
        const { error: domError } = await supabase
          .from('Domaines')
          .delete()
          .eq('id', domainId)
        if (domError) throw domError
        
        // 8. Nettoyage des icônes dans le Storage
        if (oldIcon) await this._deleteIcon(oldIcon)
        
        if (categories && categories.length > 0) {
          for (const cat of categories) {
            if (cat.icon && cat.icon.includes('/public/category-icon/')) {
              try {
                const fileName = cat.icon.split('/').pop()
                await supabase.storage.from('category-icon').remove([fileName])
              } catch (err) {
                console.error('Erreur suppression icône catégorie:', err)
              }
            }
          }
        }

        this.domaines = this.domaines.filter(d => d.id !== domainId)
      } catch (e) {
        this.error = e.message
        console.error('Échec de la suppression cascade:', e)
        alert('Erreur lors de la suppression : ' + e.message)
      } finally {
        this.loading = false
      }
    }
  }
})
