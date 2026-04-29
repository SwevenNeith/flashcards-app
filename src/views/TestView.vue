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
const optionsFromQuery = computed(() => route.query.options === 'true')
/** Mode « Options » (Duo / Carré / Cash) : query ou quizz.options au reprendre */
const optionsModeActive = ref(false)

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
const selectedAnswerMode = ref(null) // 'carre' | 'duo' | 'cash' | null
const cashAnswer = ref('')
const cashStatus = ref('idle') // 'idle' | 'correct' | 'incorrect'

// Quiz Progress Tracking (Supabase table: Quizz)
const quizzId = ref(null)

// Results State
const totalScore = ref(0)
const erroredCardIds = ref([])
const pointsPerQuestion = ref(0)

/** Chaîne answer pour Quizz : segments par carte séparés par ",", modes sur une carte par "-" (D, CR, CS) */
const completedCardAnswerSegments = ref([])
const currentCardModes = ref([])

/** En mode Options : 5 points par flashcard (répartis entre les sous-questions), pas 5 par question */
const maxOptionsTestScore = computed(() => quizCards.value.length * 5)

const maxClassicTestScore = computed(() => quizCards.value.length)

const maxDisplayedTestScore = computed(() =>
  optionsModeActive.value ? maxOptionsTestScore.value : maxClassicTestScore.value
)

const buildAnswerString = () => {
  const segs = [...completedCardAnswerSegments.value]
  if (currentCardModes.value.length) segs.push(currentCardModes.value.join('-'))
  return segs.join(',')
}

const restoreAnswerState = (answer, currentCardIdx) => {
  completedCardAnswerSegments.value = []
  currentCardModes.value = []
  const parts = String(answer || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const i = currentCardIdx
  if (!parts.length) return
  if (parts.length >= i + 1) {
    completedCardAnswerSegments.value = parts.slice(0, i)
    currentCardModes.value = (parts[i] || '')
      .split('-')
      .map((x) => x.trim())
      .filter(Boolean)
  } else {
    completedCardAnswerSegments.value = parts.slice(0, parts.length)
  }
}

const persistQuizzProgress = async (extra = {}) => {
  if (!quizzId.value) return
  await supabase
    .from('Quizz')
    .update({
      score: Number(totalScore.value.toFixed(2)),
      to_review: erroredCardIds.value,
      answer: buildAnswerString(),
      ...extra
    })
    .eq('id', quizzId.value)
}

const recordSelectedModeCode = (isCorrect) => {
  if (!optionsModeActive.value) return
  const m = selectedAnswerMode.value
  const code = m === 'duo' ? 'D' : m === 'carre' ? 'CR' : m === 'cash' ? 'CS' : ''
  if (code) currentCardModes.value.push(`${code}${isCorrect ? '+' : '-'}`)
}

/** Parse un segment de carte ex. "D+-CR-+CS+" ou ancien "D-CR" */
const parseCardAnswerSegment = (segment) => {
  const s = String(segment || '').trim()
  if (!s) return []
  const re = /(CR|CS|D)(\+|-)?/g
  const out = []
  let m
  while ((m = re.exec(s)) !== null) {
    const code = m[1]
    const suf = m[2]
    out.push({
      code,
      correct: suf === '+' ? true : suf === '-' ? false : null
    })
  }
  return out
}

/**
 * Points mode Options : la carte vaut 5 pts au total, divisés entre les n sous-questions.
 * Par sous-question (max = 5/n) : Duo = 2/5 du max, Carré = 3/5 du max, Cash = max ;
 * si Cash est désactivé sur cette question : Carré = max, Duo = 2/5 du max.
 */
const getOptionsPointsForAnswer = (isCorrect) => {
  if (!isCorrect) return 0
  const n = Math.max(1, fieldsQueue.value.length - 1)
  const perSlotMax = 5 / n
  const mode = selectedAnswerMode.value
  const cashOff = isCashDisabled.value
  let pts = 0
  if (mode === 'duo') pts = perSlotMax * (2 / 5)
  else if (mode === 'carre') pts = cashOff ? perSlotMax : perSlotMax * (3 / 5)
  else if (mode === 'cash') pts = cashOff ? 0 : perSlotMax
  return Math.round(pts * 100) / 100
}

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
  currentCardModes.value = []
  selectedAnswerMode.value = optionsModeActive.value ? null : 'carre'
  cashAnswer.value = ''
  cashStatus.value = 'idle'

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
    selectedAnswerMode.value = optionsModeActive.value ? null : 'carre'
    cashAnswer.value = ''
    cashStatus.value = 'idle'
    choices.value = []
    if (!optionsModeActive.value) {
      generateChoices(targetField.value, 4)
    }
  } else {
    // No more fields to ask, this card is done.
    if (optionsModeActive.value && currentCardModes.value.length) {
      completedCardAnswerSegments.value.push(currentCardModes.value.join('-'))
      currentCardModes.value = []
    }
    targetField.value = null
    choices.value = []
    
    // Reveal everything just to be safe
    revealedFields.value = [...fieldsQueue.value]    
    isCardFinished.value = true

    // Update position in Quizz tracking table (already finished this card, so move to the next label)
    if (quizzId.value) {
      const nextPos = Math.min(currentIndex.value + 2, quizCards.value.length)
      await persistQuizzProgress({ position: `${nextPos}/${quizCards.value.length}` })
    }
  }
}

const generateChoices = (field, total = 4) => {
  if (!currentCard.value) return
  const correctValue = currentCard.value[field]
  
  const normalize = (val) => {
    if (typeof val !== 'string') return val

    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const normCorrect = normalize(correctValue)
  const normName = normalize(currentCard.value.name)
  const normDesc = normalize(currentCard.value.description)
  
  const isGoodDistractor = (c) => {
    if (!c[field]) return false
    const dField = normalize(c[field])
    const dName = normalize(c.name)
    const dDesc = normalize(c.description)
    
    // 1. La valeur du choix doit être différente de la réponse
    if (dField === normCorrect) return false
    
    // 2. Le nom doit être différent
    if (dName === normName) return false
    
    // 3. LA RÈGLE D'OR : On n'exclut sur la description QUE si c'est pertinent.
    const isTestingNameOrDesc = field === 'name' || field === 'description'
    if (isTestingNameOrDesc && normDesc && dDesc === normDesc) return false
    
    return true
  }

  // --- AUTONOMOUS SEMANTIC MATCHING ---
  const getSignificantWords = (text) => {
    const stopWords = new Set(['quel', 'quelle', 'quels', 'quelles', 'est', 'sont', 'dans', 'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'ce', 'cet', 'cette', 'ces', 'et', 'ou', 'pour', 'par', 'sur', 'avec', 'qui', 'que', 'quoi', 'où', 'quand', 'comment', 'pourquoi', 'avez', 'vous', 'votre', 'vos', 'notre', 'nos', 'leur', 'leurs', 'aux', 'au', 'il', 'elle', 'on', 'ils', 'elles', 'se', 'sa', 'son', 'ses', 'en', 'y', 'a', 'au'])
    return new Set(
      normalize(text)
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w))
    )
  }

  const correctWords = getSignificantWords(currentCard.value.name)

  const getSimilarityScore = (candidate) => {
    const candidateVal = normalize(candidate[field])
    if (typeof candidateVal !== 'string' || typeof normCorrect !== 'string') return 0
    let score = 0
    
    // 1. AUTONOMOUS KEYWORD INTERSECTION (Questions similarity)
    const candidateWords = getSignificantWords(candidate.name)
    let intersectionCount = 0
    for (const word of correctWords) {
      if (candidateWords.has(word)) intersectionCount++
    }
    score += intersectionCount * 30

    // 2. STRUCTURAL MATCH (Same starting words in question)
    const cNameWords = normalize(currentCard.value.name).split(/\s+/)
    const dNameWords = normalize(candidate.name).split(/\s+/)
    if (cNameWords[0] === dNameWords[0]) score += 15
    if (cNameWords[1] && cNameWords[1] === dNameWords[1]) score += 8

    // 3. VALUE MATCH (Word count, digits, etc.)
    const cValClean = normCorrect.trim()
    const dValClean = candidateVal.trim()
    const cValWords = cValClean.split(/\s+/)
    const dValWords = dValClean.split(/\s+/)

    if (cValWords.length === dValWords.length) score += 5
    if (cValWords.length === 1 && dValWords.length === 1) score += 8

    const hasDigits = (s) => /\d/.test(s)
    if (hasDigits(cValClean) === hasDigits(dValClean)) score += 12
    
    const hasHtml = (s) => /<[a-z][\s\S]*>/i.test(s)
    if (hasHtml(cValClean) === hasHtml(dValClean)) score += 10

    // 4. PREFER SAME CATEGORY/DOMAIN
    if (candidate.category === currentCard.value.category) score += 10
    if (candidate.domain === currentCard.value.domain) score += 5

    return score
  }

  // Search through ALL available cards in the DB for the best matches
  const scoredPool = allPoolCards.value
    .filter(c => isGoodDistractor(c))
    .map(c => ({
      card: c,
      simScore: getSimilarityScore(c)
    }))
    .sort((a, b) => b.simScore - a.simScore)

  const finalDistractors = []
  const seenValues = new Set([normCorrect])
  
  const distractorTarget = Math.max(0, total - 1)

  // Pick the top distractors from the entire pool
  for (const item of scoredPool) {
    const c = item.card
    const val = normalize(c[field])
    if (!seenValues.has(val)) {
      finalDistractors.push(c)
      seenValues.add(val)
    }
    if (finalDistractors.length >= distractorTarget) break
  }

  const finalChoices = finalDistractors.map(c => ({
    value: c[field],
    isCorrect: false
  }))

  finalChoices.push({ value: correctValue, isCorrect: true })
  choices.value = shuffleArray(finalChoices)
}

const getPlainText = (val) => {
  if (typeof val !== 'string') return ''
  return val.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const cashMaxLength = 50
const cashCorrectText = computed(() => {
  if (!currentCard.value || !targetField.value) return ''
  const field = targetField.value
  const raw = currentCard.value[field]
  if (raw === null || raw === undefined) return ''
  const str = String(raw)
  return field === 'description' ? getPlainText(str) : str.trim()
})

const isCashDisabled = computed(() => {
  if (targetField.value === 'icon') return true
  return cashCorrectText.value.length > cashMaxLength
})

const cashExpectedKindLabel = computed(() => {
  const field = targetField.value
  if (field === 'name') return 'Nom attendu'
  if (field === 'description') return 'Description attendue'
  if (field === 'icon') return 'Icône attendue'
  return 'Réponse attendue'
})

const cashDisabledTitle = computed(() => {
  if (!isCashDisabled.value) return 'Réponse libre'
  if (targetField.value === 'icon') return 'Option indisponible pour une question image'
  return `Option indisponible : réponse trop longue (>${cashMaxLength} caractères)`
})

const selectAnswerMode = (mode) => {
  if (!targetField.value || isCardFinished.value) return
  if (isProcessing.value) return
  if (mode === 'cash' && isCashDisabled.value) return

  selectedAnswerMode.value = mode
  cashAnswer.value = ''
  cashStatus.value = 'idle'

  if (mode === 'carre') generateChoices(targetField.value, 4)
  if (mode === 'duo') generateChoices(targetField.value, 2)
  if (mode === 'cash') choices.value = []
}

const handleCashSubmit = () => {
  if (isProcessing.value) return
  if (!currentCard.value || !targetField.value) return
  if (selectedAnswerMode.value !== 'cash') return
  if (isCashDisabled.value) return

  const field = targetField.value
  const correctRaw = currentCard.value[field]

  const normalize = (val) => {
    if (typeof val !== 'string') return ''
    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const userNorm = normalize(cashAnswer.value)
  const correctNorm = normalize(typeof correctRaw === 'string' ? correctRaw : String(correctRaw ?? ''))

  isProcessing.value = true

  const cashOk = !!(userNorm && userNorm === correctNorm)
  recordSelectedModeCode(cashOk)

  if (cashOk) {
    cashStatus.value = 'correct'
    totalScore.value += optionsModeActive.value
      ? getOptionsPointsForAnswer(true)
      : pointsPerQuestion.value
  } else {
    cashStatus.value = 'incorrect'
    const correctToShow = field === 'description' ? getPlainText(String(correctRaw || '')) : String(correctRaw || '')
    cashAnswer.value = correctToShow

    const currentId = currentCard.value.id || currentCard.value.name
    if (!erroredCardIds.value.includes(currentId)) {
      erroredCardIds.value.push(currentId)
    }
  }

  showFeedback.value = true
  selectedChoiceIndex.value = null

  setTimeout(async () => {
    showFeedback.value = false
    isProcessing.value = false
    revealedFields.value.push(targetField.value)

    await persistQuizzProgress()

    setupNextQuestion()
  }, 1000)
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

  recordSelectedModeCode(!!choice.isCorrect)

  if (choice.isCorrect) {
    totalScore.value += optionsModeActive.value
      ? getOptionsPointsForAnswer(true)
      : pointsPerQuestion.value
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
    
    await persistQuizzProgress()

    setupNextQuestion()
  }, 1000)
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
  
  let resumeAnswerRestore = null

  try {
    let poolQuery = supabase.from('Flashcards').select('*, Categories(name)')
    
    // Si on a un domaine identifié, on filtre la pioche des distracteurs sur ce domaine
    // Cela évite de charger des milliers de cartes inutiles et garantit la cohérence.
    const domainToFetch = quizzIdInQuery ? null : selectedDomainId.value
    if (domainToFetch) {
      poolQuery = poolQuery.eq('domain', domainToFetch)
    }

    const { data: globalPool, error: poolError } = await poolQuery
    if (poolError) throw poolError
    allPoolCards.value = globalPool || []

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
      
      // On charge les distracteurs du même domaine (pour les 4 propositions)
      if (cards.length > 0) {
        const domainId = cards[0].domain
        const { data: qPool } = await supabase.from('Flashcards').select('*, Categories(name)').eq('domain', domainId)
        allPoolCards.value = qPool || []
      }

      // Sort cards to match the original pool order stored in flashcardIds
      selectionCards = flashcardIds.map(id => cards.find(c => id && c && c.id === id)).filter(Boolean)
      
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
      
      quizCards.value = selectionCards

      const useOpts = qData.options === true || qData.options === 'true'
      optionsModeActive.value = useOpts || optionsFromQuery.value
      resumeAnswerRestore = { answer: qData.answer ?? '', cardIdx: currentIndex.value }
    } else {
      optionsModeActive.value = optionsFromQuery.value
      completedCardAnswerSegments.value = []
      currentCardModes.value = []
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
              to_review: [],
              answer: '',
              options: optionsFromQuery.value
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
      if (resumeAnswerRestore) {
        restoreAnswerState(resumeAnswerRestore.answer, resumeAnswerRestore.cardIdx)
      }
    }
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    setTimeout(() => { isLoading.value = false }, 1200)
  }
})

const saveAndExit = async () => {
  try {
    const maxPts = optionsModeActive.value ? maxOptionsTestScore.value : quizCards.value.length
    const scoreStr = `${Number(totalScore.value.toFixed(1))}/${maxPts}`
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

const optionsRecapCards = computed(() => {
  if (!optionsModeActive.value || !isTestFinished.value) return []
  const str = buildAnswerString().trim()
  if (!str) return []
  return str.split(',').map((seg) => parseCardAnswerSegment(seg))
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
              <path fill="#DFC6A4" d="M13,9.5H11V5.5H13M13,17.5H11V13.5H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
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
            <span class="score-total">/ {{ maxDisplayedTestScore }}</span>
          </div>
          <h2>Bravo ! Test terminé</h2>
          <div v-if="optionsRecapCards.length" class="options-answer-recap" aria-label="Récapitulatif des modes choisis">
            <template v-for="(card, ci) in optionsRecapCards" :key="ci">
              <template v-for="(tok, ti) in card" :key="`${ci}-${ti}-${tok.code}`">
                <span
                  class="recap-mode"
                  :class="{
                    'recap-ok': tok.correct === true,
                    'recap-bad': tok.correct === false,
                    'recap-neutral': tok.correct === null
                  }"
                >{{ tok.code }}</span><span v-if="ti < card.length - 1" class="recap-sep">-</span>
              </template>
              <span v-if="ci < optionsRecapCards.length - 1" class="recap-sep">,</span>
            </template>
          </div>
          <p v-if="optionsRecapCards.length" class="options-answer-legend">D = Duo · CR = Carré · CS = Cash · vert = bon · rouge = faux</p>
          
          <div v-if="failedCards.length > 0" class="review-section">
            <h3>Voici les flashcards à réviser :</h3>
            <div class="review-list">
              <div v-for="card in failedCards" :key="card.id || card.name" class="review-item">
                <div class="card-info">
                   <div class="card-title-row">
                     <strong class="card-title">{{ card.name }} :</strong>
                     <div v-if="card.description" class="card-answer-text" v-html="card.description"></div>
                     <img v-if="card.icon" :src="card.icon" class="card-answer-img" />
                   </div>
                   <span class="card-category">{{ card.Categories?.name || 'Inconnue' }}</span>
                </div>
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
            <!-- Si Options activées : on choisit d'abord le mode -->
            <div v-if="optionsModeActive && !selectedAnswerMode" class="mode-rows">
              <div class="mode-row mode-row-top">
                <button type="button" class="mode-btn" @click="selectAnswerMode('duo')">Duo</button>
                <button type="button" class="mode-btn" @click="selectAnswerMode('carre')">Carré</button>
              </div>
              <div class="mode-row mode-row-bottom">
                <button 
                  type="button" 
                  class="mode-btn" 
                  :class="{ disabled: isCashDisabled }"
                  :disabled="isCashDisabled"
                  @click="selectAnswerMode('cash')"
                  :title="cashDisabledTitle"
                >
                  Cash
                </button>
              </div>
            </div>

            <!-- Mode Cash -->
            <div v-else-if="selectedAnswerMode === 'cash'" class="cash-panel">
              <p class="cash-expected-label">{{ cashExpectedKindLabel }}</p>
              <input
                v-model="cashAnswer"
                class="cash-input"
                :class="{ correct: cashStatus === 'correct', incorrect: cashStatus === 'incorrect' }"
                type="text"
                placeholder="Écris ta réponse..."
                :disabled="isProcessing"
                @keydown.enter.prevent="handleCashSubmit"
              />
              <button
                type="button"
                class="cash-submit"
                :disabled="isProcessing || !cashAnswer.trim()"
                @click="handleCashSubmit"
              >
                Valider
              </button>
            </div>

            <!-- Mode QCM (Carré / Duo) ou test classique -->
            <div v-else class="choices-grid">
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
  background-color: #91576C;
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
  background: #91576C;
  padding: 3rem 2.5rem;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
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
  background: #91576C;
  margin-top: 2rem;
  padding: 3rem 2rem;
  border-radius: 32px;
  box-shadow: 0 15px 45px rgba(0,0,0,0.05);
  text-align: center;
  border: 1px solid #DFC6A4;
}

.score-circle {
  width: 120px;
  height: 120px;
  border: 8px solid #DFC6A4;
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
  color: #C2BAD3;
  line-height: 1;
}

.score-total {
  font-size: 1rem;
  color: #C2BAD3;
  font-weight: 600;
}

.options-answer-recap {
  margin: 0.75rem auto 0.25rem;
  max-width: 100%;
  padding: 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  word-break: break-word;
  line-height: 1.6;
}

.recap-mode {
  font-weight: 800;
}

.recap-ok {
  color: #2ed573;
}

.recap-bad {
  color: #ff4757;
}

.recap-neutral {
  color: #DFC6A4;
}

.recap-sep {
  color: #C2BAD3;
  opacity: 0.75;
  font-weight: 600;
  margin: 0 0.15em;
}

.options-answer-legend {
  margin: 0 0 1.25rem;
  font-size: 0.8rem;
  color: #C2BAD3;
  opacity: 0.85;
}

.review-section {
  margin: 2.5rem 0;
}

.review-section h3 {
  font-size: 1.1rem;
  color: #C2BAD3;
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
  background: rgba(255, 255, 255, 0.05);
  padding: 1.25rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(223, 198, 164, 0.3);
  gap: 1rem;
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  flex: 1;
  min-width: 0; /* Allow shrinking for long content */
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.card-title {
  font-weight: 700;
  color: #DCB160;
  font-size: 1rem;
}

.card-answer-text {
  font-size: 0.95rem;
  color: #C2BAD3;
}

/* Remove any paragraph margins from rich text in summary */
.card-answer-text :deep(p) {
  margin: 0;
}

.card-answer-img {
  max-width: 50px;
  max-height: 50px;
  border-radius: 8px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px;
}

.card-category {
  font-size: 0.8rem;
  color: #C2BAD3;
  opacity: 0.7;
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
.progress-text { font-weight: 700; color: #DFC6A4; font-size: 0.9rem; display: block; margin-bottom: 0.5rem; }
.progress-track { height: 6px; background-color: #eee; border-radius: 3px; }
.progress-fill { height: 100%; background-color: #DFC6A4; transition: width 0.3s ease; }

.quiz-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
  width: 100%;
}
.flashcard-display { width: 100%; background: #91576C; border-radius: 24px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #DFC6A4; min-height: 200px; display: flex; align-items: center; justify-content: center; }
.active-card { text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.card-icon { width: 80px; height: 80px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background-color: #91576C; display: flex; align-items: center; justify-content: center; }
.card-icon img { width: 100%; height: 100%; object-fit: contain; }
.card-name { font-size: 1.6rem; color: #C2BAD3; margin: 0; }
.card-desc { font-size: 1rem; color: #C2BAD3; text-align: left; width: 100%; max-width: 500px; border-top: 1px solid #DFC6A4; padding-top: 1rem; }

.choices-panel { width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.choice-instruction { font-weight: 600; color: #C2BAD3; text-align: center; }
.choices-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }

.mode-rows {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mode-row {
  width: 100%;
  display: flex;
  gap: 1rem;
}

/* Ligne 1 : occupe toute la largeur (espacement), boutons taille fixe */
.mode-row-top {
  width: 80%;
  max-width: 560px;
  margin: 0 auto;
  justify-content: space-between;
}

/* Ligne 2 : contenu centré */
.mode-row-bottom {
  justify-content: center;
}

.mode-btn {
  --mode-size: clamp(110px, 20vw, 170px);
  width: var(--mode-size);
  height: var(--mode-size);
  border-radius: 50%;
  border: none;
  background-color: #462A39;
  color: #C2BAD3;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, opacity 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  font-size: clamp(1rem, 3.4vw, 1.35rem);
}

@media (hover: hover) {
  .mode-btn:hover:not(.disabled) {
    background-color: #DCB160;
  }
}

.mode-btn:active:not(.disabled) {
  transform: scale(0.98);
}

.mode-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cash-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.cash-expected-label {
  margin: 0;
  text-align: center;
  font-weight: 800;
  color: #C2BAD3;
  font-size: 0.95rem;
}

.cash-input {
  width: 100%;
  padding: 0.95rem 1rem;
  border-radius: 14px;
  border: 2px solid #DFC6A4;
  background: #91576C;
  color: #C2BAD3;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.cash-input::placeholder {
  color: #C2BAD3;
  opacity: 0.8;
}

.cash-input.correct {
  border-color: #2ed573;
  box-shadow: 0 0 0 3px rgba(46, 213, 115, 0.15);
}

.cash-input.incorrect {
  border-color: #ff4757;
  box-shadow: 0 0 0 3px rgba(255, 71, 87, 0.15);
}

.cash-submit {
  background-color: #DFC6A4;
  color: white;
  border: none;
  padding: 0.85rem 1.25rem;
  border-radius: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}

.cash-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.choice-btn {
  background: #91576C;
  border: 2px solid #DFC6A4;
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

.choice-btn:focus, .choice-btn:focus-visible { outline: none; border-color: #DFC6A4; }

@media (hover: hover) {
  .choice-btn:hover:not(.disabled) { border-color: #DFC6A4; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(4,139,154,0.1); }
}

.choice-btn.correct { border-color: #2ed573 !important; background-color: #f0fff4; color: #2ed573; box-shadow: 0 0 15px rgba(46, 213, 115, 0.2); }
.choice-btn.incorrect { border-color: #ff4757 !important; background-color: #91576C; color: #ff4757; box-shadow: 0 0 15px rgba(255, 71, 87, 0.2); }
.choice-btn.disabled { cursor: default; opacity: 0.7; }

.choice-icon { width: 60px; height: 60px; background-color: #91576C; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.choice-icon img { width: 100%; height: 100%; object-fit: contain; }
.choice-text { font-size: 1rem; font-weight: 600; color: #C2BAD3; text-align: center; }
.choice-html { font-size: 0.85rem; color: #C2BAD3; text-align: left; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  animation: fadeIn 0.4s ease-out;
}

.next-card-btn {
  background-color: #DFC6A4;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px #DFC6A4;
  transition: all 0.2s;
}

.next-card-btn:hover {
  background-color: #DCB160;
  transform: translateX(5px);
}

.finish-btn, .return-btn { background-color: #DFC6A4; color: white; border: none; padding: 0.8rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin-top: 1rem; }
.finish-btn:hover, .return-btn:hover { background-color: #DCB160; transform: translateY(-2px); }

.reveal { animation: slideDownIn 0.4s ease-out; }
@keyframes slideDownIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-20px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .choices-grid { grid-template-columns: 1fr; }
  .mode-row { gap: 0.75rem; }
  /* la taille est déjà responsive via clamp() */
}
</style>
