<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlashcardsStore } from '../stores/flashcards'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const flashcardsStore = useFlashcardsStore()

const selectionType = computed(() => route.query.type || '')
const selectedDomainId = computed(() => route.query.domainId || '')
const selectedDomainName = computed(() => route.query.domainName || '')
const selectedCategoryId = computed(() => route.query.categoryId || '')
const selectedCategoryName = computed(() => route.query.categoryName || '')
const requestedCount = computed(() => parseInt(route.query.count) || 5)

const isLoading = ref(true)
const allPoolCards = ref([]) 
const quizCards = ref([])    
const currentIndex = ref(0)
const isTestFinished = ref(false)
const isCardFinished = ref(false) // Whether the current card is complete and waiting for "Next"

// Quiz State
const fieldsQueue = ref([])
const revealedFields = ref([])
const targetField = ref(null)
const choices = ref([])
const showFeedback = ref(false)
const selectedChoiceIndex = ref(null)
const isProcessing = ref(false)

// Quiz Progress Tracking (Supabase table: Quizz)
const quizzId = ref(null)

// Results State
const totalScore = ref(0)
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

  isCardFinished.value = false // Reset for new card

  const availableFieldsSet = new Set(['name'])
  if (currentCard.value.icon) availableFieldsSet.add('icon')
  if (currentCard.value.description) availableFieldsSet.add('description')

  fieldsQueue.value = shuffleArray(Array.from(availableFieldsSet))
  revealedFields.value = [fieldsQueue.value[0]]
  
  const questionCount = fieldsQueue.value.length - 1
  pointsPerQuestion.value = questionCount > 0 ? 1 / questionCount : 0

  setupNextQuestion()
}

const setupNextQuestion = async () => {
  const nextFieldIndex = revealedFields.value.length
  
  if (nextFieldIndex < fieldsQueue.value.length) {
    targetField.value = fieldsQueue.value[nextFieldIndex]
    generateChoices(targetField.value)
  } else {
    // No more fields to ask, this card is done.
    targetField.value = null
    choices.value = []
    
    // Reveal everything just to be safe
    revealedFields.value = [...fieldsQueue.value]    
    isCardFinished.value = true

    // Update position in Quizz tracking table (already finished this card, so move to the next label)
    if (quizzId.value) {
      const nextPos = Math.min(currentIndex.value + 2, quizCards.value.length)
      await supabase
        .from('Quizz')
        .update({ position: `${nextPos}/${quizCards.value.length}` })
        .eq('id', quizzId.value)
    }
  }
}

const generateChoices = (field) => {
  if (!currentCard.value) return
  const correctValue = currentCard.value[field]
  
  const normalize = (val) => (typeof val === 'string' ? val.trim() : val)
  const normCorrect = normalize(correctValue)
  
  let distractorsPool = allPoolCards.value.filter(c => 
    c.category === currentCard.value.category && 
    c.name !== currentCard.value.name && 
    c[field] && 
    normalize(c[field]) !== normCorrect
  )

  // Fallback: if we don't have enough distractors in the same category, 
  // take from the whole pool (excluding the current category to avoid getting too many)
  if (distractorsPool.length < 3) {
    const additionalDistractors = allPoolCards.value.filter(c => 
      c.category !== currentCard.value.category && 
      c[field] && 
      normalize(c[field]) !== normCorrect
    )
    distractorsPool = [...distractorsPool, ...additionalDistractors]
  }

  const finalDistractors = []
  const seenValues = new Set([normCorrect])
  
  for (const c of shuffleArray(distractorsPool)) {
    const normVal = normalize(c[field])
    if (!seenValues.has(normVal)) {
      finalDistractors.push(c)
      seenValues.add(normVal)
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

  const currentId = currentCard.value.id || currentCard.value.name

  if (choice.isCorrect) {
    totalScore.value += pointsPerQuestion.value
  } else {
    if (!erroredCardIds.value.includes(currentId)) {
      erroredCardIds.value.push(currentId)
    }
  }

  setTimeout(async () => {
    showFeedback.value = false
    selectedChoiceIndex.value = null
    isProcessing.value = false
    revealedFields.value.push(targetField.value)
    
    // Update score and to_review in Quizz tracking table
    if (quizzId.value) {
      await supabase
        .from('Quizz')
        .update({ 
          score: Number(totalScore.value.toFixed(1)),
          to_review: erroredCardIds.value
        })
        .eq('id', quizzId.value)
    }

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
  const quizzIdInQuery = route.query.quizzId
  
  try {
    let selectionCards = []
    
    if (quizzIdInQuery) {
      // Resume existing quiz
      quizzId.value = quizzIdInQuery
      const { data: qData, error: qError } = await supabase
        .from('Quizz')
        .select(`
          *,
          Domaines (name),
          Categories (name)
        `)
        .eq('id', quizzId.value)
        .single()
      
      if (qError) throw qError
      
      // Update local naming refs if they aren't in query (helpful for page title)
      // Note: route.query is read-only, but we can use qData to populate our state
      
      let flashcardIds = qData.flashcards
      
      // Safety check: ensure flashcardIds is an array (might be a string if column type is text)
      if (typeof flashcardIds === 'string') {
        try {
          flashcardIds = JSON.parse(flashcardIds)
        } catch (e) {
          // If not JSON, try to clean it (remove brackets) and split
          flashcardIds = flashcardIds.replace(/[\[\]"]/g, '').split(',').map(id => id.trim())
        }
      }

      if (!Array.isArray(flashcardIds)) {
        flashcardIds = []
      }

      // Fetch specific cards by ID
      const { data: cards, error: cardsError } = await supabase
        .from('Flashcards')
        .select('*, Categories(name), Revision(maitrise, due_date)')
        .in('id', flashcardIds)
      
      if (cardsError) throw cardsError
      
      // Sort cards to match the original pool order stored in flashcardIds
      selectionCards = flashcardIds.map(id => cards.find(c => c.id === id)).filter(Boolean)
      
      // Restore score, position and errors
      totalScore.value = Number(qData.score) || 0
      
      let reviewIds = qData.to_review || []
      if (typeof reviewIds === 'string') {
        try {
          reviewIds = JSON.parse(reviewIds)
        } catch (e) {
          reviewIds = reviewIds.replace(/[\[\]"]/g, '').split(',').map(id => id.trim()).filter(Boolean)
        }
      }
      erroredCardIds.value = Array.isArray(reviewIds) ? reviewIds : []
      
      const posParts = (qData.position || "1/1").split('/')
      currentIndex.value = Math.max(0, parseInt(posParts[0]) - 1)
      
      // Update selectionType based on data
      // (Though selectionType is usually a computed, we can't change it, 
      // but some components might use it. We'll rely on our data.)
      
      allPoolCards.value = selectionCards
      quizCards.value = selectionCards
    } else {
      // Start new quiz
      if (selectionType.value === 'Catégorie') {
        const { data, error } = await supabase.from('Flashcards').select('*, Categories(name), Revision(maitrise, due_date)').eq('category', selectedCategoryId.value)
        if (error) throw error
        selectionCards = data || []
      } else {
        const { data: categories, error: catError } = await supabase.from('Categories').select('id').eq('domain', selectedDomainId.value)
        if (catError) throw catError
        const categoryIds = categories.map(c => c.id)
        if (categoryIds.length > 0) {
          const { data: cards, error: cardsError } = await supabase
            .from('Flashcards')
            .select('*, Categories(name), Revision(maitrise, due_date)')
            .in('category', categoryIds)
          
          if (cardsError) throw cardsError
          selectionCards = cards || []
        }
      }

      // Use only the cards from the selected scope for distractors
      allPoolCards.value = selectionCards

      // SELECTION LOGIC: 70% due, 30% new
      const today = new Date().toISOString()
      
      const dueCards = selectionCards.filter(c => {
        const rev = Array.isArray(c.Revision) ? c.Revision[0] : c.Revision
        return rev?.due_date && rev.due_date <= today
      })
      
      const newCards = selectionCards.filter(c => {
        const rev = Array.isArray(c.Revision) ? c.Revision[0] : c.Revision
        return !rev?.due_date // New cards have no due_date
      })

      const targetDueCount = Math.floor(requestedCount.value * 0.7)
      const targetNewCount = requestedCount.value - targetDueCount

      // Sort dueCards by mastery ascending (prioritize lower mastery), 
      // but shuffle first to vary cards if multiple have same mastery
      let sortedDuePool = shuffleArray(dueCards).sort((a, b) => {
        const revA = Array.isArray(a.Revision) ? a.Revision[0] : a.Revision
        const revB = Array.isArray(b.Revision) ? b.Revision[0] : b.Revision
        return (revA?.maitrise || 0) - (revB?.maitrise || 0)
      })

      let selectedDue = sortedDuePool.slice(0, targetDueCount)
      let selectedNew = shuffleArray(newCards).slice(0, targetNewCount)

      let finalCards = [...selectedDue, ...selectedNew]

      // Fallback: If not enough cards in one category, fill from the other pools
      if (finalCards.length < requestedCount.value) {
        const remainingPool = selectionCards.filter(c => !finalCards.find(fc => fc.id === c.id))
        const extras = shuffleArray(remainingPool).slice(0, requestedCount.value - finalCards.length)
        finalCards = [...finalCards, ...extras]
      }

      quizCards.value = shuffleArray(finalCards)
      
      if (quizCards.value.length > 0) {
        // Create tracking record in Quizz table
        const flashcardIds = quizCards.value.map(c => c.id)
        const { data: qData, error: qError } = await supabase
          .from('Quizz')
          .insert([
            {
              domain: selectedDomainId.value,
              category: selectedCategoryId.value || null,
              flashcards: flashcardIds,
              position: `1/${quizCards.value.length}`,
              score: 0,
              to_review: [] 
            }
          ])
          .select()
        
        if (qError) throw qError
        if (qData && qData[0]) {
          quizzId.value = qData[0].id
        }
      }
    }

    if (quizCards.value.length > 0) {
      prepareCardPhase()
    }
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    setTimeout(() => { isLoading.value = false }, 1200)
  }
})

const saveAndExit = async () => {
  try {
    const scoreStr = `${Number(totalScore.value.toFixed(1))}/${quizCards.value.length}`
    const toReviewStr = failedCards.value.map(c => c.name).join(', ')

    const { error } = await supabase
      .from('Statistiques')
      .insert([
        {
          date: new Date().toISOString(),
          domain: selectedDomainId.value,
          category: selectedCategoryId.value || null,
          score: scoreStr,
          to_review: toReviewStr
        }
      ])

    if (error) throw error
    
    // UPDATE MASTERY and DUE_DATE in Revision table
    const now = new Date()
    const intervalMap = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

    const updates = quizCards.value.map(async (card) => {
      const isFailed = failedCards.value.some(fc => fc.id === card.id)
      const rev = Array.isArray(card.Revision) ? card.Revision[0] : card.Revision
      let currentMaitrise = rev?.maitrise || 0
      
      // Determine new mastery
      let newMaitrise = isFailed 
        ? Math.max(0, currentMaitrise - 1)
        : Math.min(5, currentMaitrise + 1)
        
      // Determine new due_date
      let newDueDate = new Date()
      if (newMaitrise === 0) {
        newDueDate = now
      } else {
        // Use existing due_date as baseline, or NOW if it was null
        const baseline = rev?.due_date ? new Date(rev.due_date) : now
        newDueDate = new Date(baseline)
        const daysToAdd = intervalMap[newMaitrise]
        newDueDate.setDate(newDueDate.getDate() + daysToAdd)
      }
        
      return supabase
        .from('Revision')
        .update({ 
          maitrise: newMaitrise,
          due_date: newDueDate.toISOString().split('T')[0]
        })
        .eq('flashcard', card.id)
    })

    await Promise.all(updates)

    // Cleanup: Delete the tracking record as the test is now complete
    if (quizzId.value) {
      await supabase.from('Quizz').delete().eq('id', quizzId.value)
    }

    // Success, go home
    router.push('/')
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des statistiques:', error)
    // Even if it fails, we should probably let the user go back to home
    router.push('/')
  }
}

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
                   <span class="card-category">{{ card.Categories?.name || 'Inconnue' }}</span>
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
          
          <button class="finish-btn" @click="saveAndExit">Terminer le test</button>
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

          <!-- Panneau de Choix -->
          <div v-if="targetField && !isCardFinished" class="choices-panel">
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

          <!-- Bouton suivant quand la carte est finie -->
          <div v-if="isCardFinished" class="card-actions">
            <button class="next-card-btn" @click="goToNextCard">
              <span>Passer à la Flashcard suivante</span>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8.59,16.59L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.59Z" />
              </svg>
            </button>
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
  flex: 1;
  width: 100%;
  background-color: #f8f9fa;
  /* Allow natural document scroll instead of internal container scroll */
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
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem 1rem 10rem 1rem; /* Generous bottom padding for mobile browsers */
  display: flex;
  flex-direction: column;
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

.quiz-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
  width: 100%;
}
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

.card-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  animation: fadeIn 0.4s ease-out;
}

.next-card-btn {
  background-color: #048B9A;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(4,139,154,0.2);
  transition: all 0.2s;
}

.next-card-btn:hover {
  background-color: #037380;
  transform: translateX(5px);
}

.finish-btn, .return-btn { background-color: #048B9A; color: white; border: none; padding: 0.8rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin-top: 1rem; }
.finish-btn:hover, .return-btn:hover { background-color: #037380; transform: translateY(-2px); }

.reveal { animation: slideDownIn 0.4s ease-out; }
@keyframes slideDownIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-20px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) { .choices-grid { grid-template-columns: 1fr; } }
</style>
