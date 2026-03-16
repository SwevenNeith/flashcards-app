<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlashcardsStore } from '../stores/flashcards'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const flashcardsStore = useFlashcardsStore()

const selectionType = computed(() => route.query.type || '')
const selectedDomain = computed(() => route.query.domain || '')
const selectedCategory = computed(() => route.query.category || '')
const requestedCount = computed(() => parseInt(route.query.count) || 5)

const isLoading = ref(true)
const allPoolCards = ref([]) 
const quizCards = ref([])    
const currentIndex = ref(0)
const isTestFinished = ref(false)

// Quiz State
const fieldsQueue = ref([])
const revealedFields = ref([])
const targetField = ref(null)
const choices = ref([])
const showFeedback = ref(false)
const selectedChoiceIndex = ref(null)
const isProcessing = ref(false)

// Results State
const totalScore = ref(0)
/* 
  We store the IDs of cards that have at least one error.
  To be ultra-safe, we'll use a plain array or be very explicit with the Set.
*/
const erroredCardIds = ref([])
const pointsPerQuestion = ref(0)

const currentCard = computed(() => quizCards.value[currentIndex.value] || null)

const shuffleArray = (array) => {
  const newArr = [...array]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
  }
  return newArr
}

const prepareCardPhase = () => {
  if (!currentCard.value) return

  const availableFields = ['name']
  if (currentCard.value.icon) availableFields.push('icon')
  if (currentCard.value.description) availableFields.push('description')

  fieldsQueue.value = shuffleArray(availableFields)
  revealedFields.value = [fieldsQueue.value[0]]
  
  const questionCount = fieldsQueue.value.length - 1
  pointsPerQuestion.value = questionCount > 0 ? 1 / questionCount : 0

  setupNextQuestion()
}

const setupNextQuestion = () => {
  const nextFieldIndex = revealedFields.value.length
  
  if (nextFieldIndex < fieldsQueue.value.length) {
    targetField.value = fieldsQueue.value[nextFieldIndex]
    generateChoices(targetField.value)
  } else {
    targetField.value = null
    choices.value = []
    setTimeout(goToNextCard, 500)
  }
}

const generateChoices = (field) => {
  if (!currentCard.value) return
  const correctValue = currentCard.value[field]
  
  // Distractors: cards with different names AND having the field AND having a different field value
  let distractorsPool = allPoolCards.value.filter(c => 
    c.name !== currentCard.value.name && 
    c[field] && 
    c[field] !== correctValue
  )

  const finalDistractors = []
  const seenValues = new Set([correctValue])
  
  for (const c of shuffleArray(distractorsPool)) {
    if (!seenValues.has(c[field])) {
      finalDistractors.push(c)
      seenValues.add(c[field])
    }
    if (finalDistractors.length >= 3) break
  }

  const finalChoices = finalDistractors.map(c => ({
    value: c[field],
    isCorrect: false
  }))

  finalChoices.push({ value: correctValue, isCorrect: true })
  choices.value = shuffleArray(finalChoices)
}

const handleChoice = (choice, index) => {
  if (isProcessing.value) return
  
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  isProcessing.value = true
  selectedChoiceIndex.value = index
  showFeedback.value = true

  // Capture current card ID to avoid any reactivity skip
  const currentId = currentCard.value.id || currentCard.value.name

  if (choice.isCorrect) {
    totalScore.value += pointsPerQuestion.value
  } else {
    // Only add if not already in the error list
    if (!erroredCardIds.value.includes(currentId)) {
      erroredCardIds.value.push(currentId)
    }
  }

  setTimeout(() => {
    showFeedback.value = false
    selectedChoiceIndex.value = null
    isProcessing.value = false
    revealedFields.value.push(targetField.value)
    setupNextQuestion()
  }, 3000)
}

const goToNextCard = () => {
  if (currentIndex.value < quizCards.value.length - 1) {
    currentIndex.value++
    prepareCardPhase()
  } else {
    isTestFinished.value = true
  }
}

onMounted(async () => {
  try {
    let selectionCards = []

    // Fetch cards for the test based on the selected domain/category
    if (selectionType.value === 'Catégorie') {
      const { data, error } = await supabase
        .from('Flashcards')
        .select('*')
        .eq('category', selectedCategory.value)
      
      if (error) throw error
      selectionCards = data || []
    } else {
      // For a domain-wide test, we fetch all categories in that domain first
      const { data: categories, error: catError } = await supabase
        .from('Categories')
        .select('name')
        .eq('domain', selectedDomain.value)
      
      if (catError) throw catError
      
      const categoryNames = categories.map(c => c.name)
      if (categoryNames.length > 0) {
        // fetchFlashcardsByCategories retrieves all cards within these categories
        selectionCards = await flashcardsStore.fetchFlashcardsByCategories(categoryNames)
      }
    }

    // Now allPoolCards only contains cards that are logically within the test scope
    allPoolCards.value = selectionCards
    
    // Select a random subset for the actual quiz
    quizCards.value = shuffleArray(selectionCards).slice(0, requestedCount.value)
    
    if (quizCards.value.length > 0) {
      prepareCardPhase()
    }
  } catch (error) {
    console.error('Erreur lors de la préparation du test:', error)
  } finally {
    setTimeout(() => { isLoading.value = false }, 1200)
  }
})

const exitTest = () => { router.push('/') }

const failedCards = computed(() => {
  return quizCards.value.filter(c => {
    const id = c.id || c.name
    return erroredCardIds.value.includes(id)
  })
})
</script>

<template>
  <main class="test-container">
    <transition name="fade" mode="out-in">
      <!-- Écran de chargement -->
      <div v-if="isLoading" class="state-container">
        <div class="message-card">
          <div class="test-icon">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path fill="#048B9A" d="M13,9.5H11V5.5H13M13,17.5H11V13.5H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
            </svg>
          </div>
          <h2>Préparation du quiz...</h2>
          <div class="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      </div>

      <!-- Écran de Résultats -->
      <div v-else-if="isTestFinished" class="results-interface">
        <div class="score-card">
          <div class="score-circle">
            <span class="score-value">{{ Number(totalScore.toFixed(1)) }}</span>
            <span class="score-total">/ {{ quizCards.length }}</span>
          </div>
          <h2>Bravo ! Test terminé</h2>
          
          <div v-if="failedCards.length > 0" class="review-section">
            <h3>Voici les flashcards à réviser :</h3>
            <div class="review-list">
              <div v-for="card in failedCards" :key="card.id || card.name" class="review-item">
                <span class="card-info">
                   <strong class="card-title">{{ card.name }}</strong>
                   <span class="card-category">{{ card.category }}</span>
                </span>
                <span class="error-badge">À revoir</span>
              </div>
            </div>
          </div>
          <div v-else class="perfect-score">
            <svg viewBox="0 0 24 24" width="64" height="64" class="trophy">
              <path fill="#f1c40f" d="M18,2H6V4H18V2M1,7V11C1,12.07 1.84,12.93 2.89,13H7.07C7.62,14.71 8.87,16.09 10.5,16.65V20H8V22H16V20H13.5V16.65C15.13,16.09 16.38,14.71 16.93,13H21.11C22.16,12.93 23,12.07 23,11V7H1M3,9H7V11H3V9M17,11V9H21V11H17Z" />
            </svg>
            <p>Score parfait ! Vous maîtrisez tout !</p>
          </div>
          
          <button class="finish-btn" @click="exitTest">Retour à l'accueil</button>
        </div>
      </div>

      <!-- Écran de Quiz Interactif -->
      <div v-else-if="quizCards.length > 0" class="quiz-interface">
        <div class="quiz-progress-bar">
          <span class="progress-text">Flashcard {{ currentIndex + 1 }} sur {{ quizCards.length }}</span>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: ((currentIndex + 1) / quizCards.length) * 100 + '%' }"></div>
          </div>
        </div>

        <div class="quiz-body">
          <div class="flashcard-display">
            <div class="active-card">
              <transition-group name="list">
                <div v-if="revealedFields.includes('icon')" key="icon" class="card-icon reveal">
                  <img :src="currentCard.icon" alt="Icon" />
                </div>
                <h2 v-if="revealedFields.includes('name')" key="name" class="card-name reveal">
                  {{ currentCard.name }}
                </h2>
                <div v-if="revealedFields.includes('description')" key="description" class="card-desc reveal" v-html="currentCard.description"></div>
              </transition-group>
            </div>
          </div>

          <div v-if="targetField" class="choices-panel">
            <p class="choice-instruction">Choisissez la bonne proposition :</p>
            <div class="choices-grid">
              <button 
                v-for="(choice, idx) in choices" :key="idx" class="choice-btn"
                :class="{ 'correct': showFeedback && choice.isCorrect, 'incorrect': showFeedback && selectedChoiceIndex === idx && !choice.isCorrect, 'disabled': isProcessing && selectedChoiceIndex !== idx }"
                @click="handleChoice(choice, idx)"
              >
                <div v-if="targetField === 'icon'" class="choice-icon">
                  <img :src="choice.value" alt="Icon choice" />
                </div>
                <div v-else-if="targetField === 'name'" class="choice-text">{{ choice.value }}</div>
                <div v-else-if="targetField === 'description'" class="choice-html" v-html="choice.value"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.test-container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 60px);
  background-color: #f8f9fa;
}

.state-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.message-card {
  background: white;
  padding: 3rem 2.5rem;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.06);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.quiz-interface, .results-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
}

.score-card {
  background: white;
  margin-top: 2rem;
  padding: 3rem 2rem;
  border-radius: 32px;
  box-shadow: 0 15px 45px rgba(0,0,0,0.05);
  text-align: center;
  border: 1px solid #f0f0f0;
}

.score-circle {
  width: 120px;
  height: 120px;
  border: 8px solid #048B9A;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
}

.score-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2c3e50;
  line-height: 1;
}

.score-total {
  font-size: 1rem;
  color: #666;
  font-weight: 600;
}

.review-section {
  margin: 2.5rem 0;
}

.review-section h3 {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
  font-weight: 600;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 500px;
  margin: 0 auto;
}

.review-item {
  background: #fff;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.card-title {
  font-weight: 700;
  color: #2c3e50;
  font-size: 1rem;
}

.card-category {
  font-size: 0.75rem;
  color: #048B9A;
  font-weight: 600;
}

.error-badge {
  font-size: 0.75rem;
  color: #ff4757;
  background: #fff5f5;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-weight: 700;
  border: 1px solid #ffebeb;
}

.perfect-score {
  margin: 2rem 0;
  color: #2ed573;
  font-weight: 700;
}

.trophy {
  margin-bottom: 1rem;
  filter: drop-shadow(0 4px 10px rgba(241, 196, 15, 0.3));
}

.quiz-progress-bar { padding: 1rem 0; }
.progress-text { font-weight: 700; color: #048B9A; font-size: 0.9rem; display: block; margin-bottom: 0.5rem; }
.progress-track { height: 6px; background-color: #eee; border-radius: 3px; }
.progress-fill { height: 100%; background-color: #048B9A; transition: width 0.3s ease; }

.quiz-body { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; align-items: center; }
.flashcard-display { width: 100%; background: white; border-radius: 24px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; min-height: 200px; display: flex; align-items: center; justify-content: center; }
.active-card { text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.card-icon { width: 80px; height: 80px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.card-icon img { width: 100%; height: 100%; object-fit: cover; }
.card-name { font-size: 1.6rem; color: #2c3e50; margin: 0; }
.card-desc { font-size: 1rem; color: #555; text-align: left; width: 100%; max-width: 500px; border-top: 1px solid #eee; padding-top: 1rem; }

.choices-panel { width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.choice-instruction { font-weight: 600; color: #666; text-align: center; }
.choices-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }

.choice-btn {
  background: white;
  border: 2px solid #eee;
  border-radius: 16px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.choice-btn:focus, .choice-btn:focus-visible { outline: none; border-color: #eee; }

@media (hover: hover) {
  .choice-btn:hover:not(.disabled) { border-color: #048B9A; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(4,139,154,0.1); }
}

.choice-btn.correct { border-color: #2ed573 !important; background-color: #f0fff4; color: #2ed573; box-shadow: 0 0 15px rgba(46, 213, 115, 0.2); }
.choice-btn.incorrect { border-color: #ff4757 !important; background-color: #fff5f5; color: #ff4757; box-shadow: 0 0 15px rgba(255, 71, 87, 0.2); }
.choice-btn.disabled { cursor: default; opacity: 0.7; }

.choice-icon { width: 60px; height: 60px; }
.choice-icon img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.choice-text { font-size: 1rem; font-weight: 600; color: #2c3e50; text-align: center; }
.choice-html { font-size: 0.85rem; color: #555; text-align: left; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.finish-btn, .return-btn { background-color: #048B9A; color: white; border: none; padding: 0.8rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin-top: 1rem; }
.finish-btn:hover, .return-btn:hover { background-color: #037380; transform: translateY(-2px); }

.reveal { animation: slideDownIn 0.4s ease-out; }
@keyframes slideDownIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-20px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) { .choices-grid { grid-template-columns: 1fr; } }
</style>
