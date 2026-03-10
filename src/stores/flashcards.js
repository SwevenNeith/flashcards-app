import { defineStore } from 'pinia'

export const useFlashcardsStore = defineStore('flashcards', {
  state: () => ({
    cards: [],
    loading: false,
    error: null
  }),
  
  actions: {
    addCard(card) {
      this.cards.push({
        id: Date.now(),
        ...card
      })
      this.saveToLocalStorage()
    },
    
    deleteCard(id) {
      this.cards = this.cards.filter(card => card.id !== id)
      this.saveToLocalStorage()
    },
    
    saveToLocalStorage() {
      localStorage.setItem('flashcards', JSON.stringify(this.cards))
    },
    
    loadFromLocalStorage() {
      const stored = localStorage.getItem('flashcards')
      if (stored) {
        this.cards = JSON.parse(stored)
      }
    }
  }
})
