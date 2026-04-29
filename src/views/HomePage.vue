<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import TestForm from '../components/TestForm.vue'

const router = useRouter()
const showForm = ref(false)
const activeQuizzes = ref([])
const newCardsCount = ref(0)
const dueCardsCount = ref(0)
const dueDomains = ref([])
const preselectedDomainId = ref(null)

onMounted(async () => {
  const { data, error } = await supabase
    .from('Quizz')
    .select(`
      *,
      Domaines (name),
      Categories (name)
    `)
  if (!error) {
    activeQuizzes.value = data || []
  }

  // Fetch Revision counts
  const today = new Date().toISOString()
  
  const [newRes, dueRes] = await Promise.all([
    supabase.from('Revision').select('*', { count: 'exact', head: true }).is('due_date', null),
    supabase.from('Revision').select('*', { count: 'exact', head: true }).lte('due_date', today)
  ])
  
  newCardsCount.value = newRes.count || 0
  dueCardsCount.value = dueRes.count || 0

  // Fetch Revision counts grouped by domain
  const { data: revData, error: revError } = await supabase
    .from('Revision')
    .select(`
      flashcard,
      Flashcards (
        domain,
        Domaines (id, name)
      )
    `)
    .lte('due_date', today)

  if (!revError && revData) {
    const map = {}
    revData.forEach(r => {
      const d = r.Flashcards?.Domaines
      if (d) {
        if (!map[d.id]) {
          map[d.id] = { id: d.id, name: d.name, count: 0 }
        }
        map[d.id].count++
      }
    })
    dueDomains.value = Object.values(map).sort((a, b) => b.count - a.count)
  }
})

const handleStartTest = (data) => {
  showForm.value = false
  router.push({
    name: 'test',
    query: {
      type: data.type,
      domainId: data.domainId,
      domainName: data.domainName,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      count: data.count,
      options: data.options ? 'true' : 'false'
    }
  })
}

const resumeQuizz = (quizz) => {
  router.push({
    name: 'test',
    query: {
      quizzId: quizz.id,
      domainId: quizz.domain,
      domainName: quizz.Domaines?.name,
      categoryId: quizz.category,
      categoryName: quizz.Categories?.name,
      options: quizz.use_options ? 'true' : 'false'
    }
  })
}

const startTestForDomain = (domainId) => {
  preselectedDomainId.value = domainId
  showForm.value = true
}

const closeTestForm = () => {
  showForm.value = false
  preselectedDomainId.value = null
}
</script>

<template>
  <main class="content">
    <div class="welcome-container">
      <div class="test-action">
        <button class="start-test-btn" @click="showForm = true">Démarrer un test</button>
      </div>

      <!-- Tests en cours -->
      <div v-if="activeQuizzes.length > 0" class="active-quizzes-section">
        <div v-for="quizz in activeQuizzes" :key="quizz.id" class="quizz-card">
          <p class="quizz-info">
            Vous avez un quizz en cours sur 
            <strong>{{ quizz.Domaines?.name }}{{ quizz.Categories ? ' / ' + quizz.Categories.name : '' }}</strong>
          </p>
          <button class="resume-btn" @click="resumeQuizz(quizz)">Reprendre le quizz</button>
        </div>
      </div>

      <div class="revision-summary cta-section">
        <p>
          <span v-if="newCardsCount > 0" class="summary-icon">✨</span>
          <span v-else class="summary-icon">✅</span>
          Vous avez <strong>{{ newCardsCount }}</strong> nouvelles cartes.
        </p>
        <p>
          <span class="summary-icon">🔔</span>
          Vous avez <strong>{{ dueCardsCount }}</strong> cartes à réviser aujourd'hui.
        </p>
      </div>

      <!-- Liste des domaines à réviser -->
      <div v-if="dueDomains.length > 0" class="due-domains-list cta-section">
        <div v-for="domain in dueDomains" :key="domain.id" class="due-domain-item">
          <p>Vous avez <strong>{{ domain.count }}</strong> cartes à réviser en <strong>{{ domain.name }}</strong></p>
          <button class="domain-test-btn" @click="startTestForDomain(domain.id)">Démarrer un test</button>
        </div>
      </div>
    </div>

    <!-- Modal Formulaire de Test -->
    <transition name="fade">
      <TestForm 
        v-if="showForm" 
        :preselectedDomainId="preselectedDomainId"
        @close="closeTestForm"
        @start="handleStartTest"
      />
    </transition>
  </main>
</template>

<style scoped>
.content {
  flex: 1;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  text-align: justify;
}

.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2rem;
  width: 100%;
  max-width: 900px;
}

.test-action {
  width: 100%;
  display: flex;
  justify-content: center;
}

.start-test-btn {
  background-color: #DFC6A4;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  font-size: 1rem;
}

.start-test-btn:hover {
  background-color: #DCB160;
}

.start-test-btn:active {
  transform: scale(0.98);
}

.cta-section {
  font-size: 1.1rem;
  color: #C2BAD3;
  line-height: 1.6;
}

.revision-summary {
  margin-top: 1rem;
}

.due-domains-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.due-domain-item {
  background-color: #91576C;
  border-right: 5px solid #DFC6A4;
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.domain-test-btn {
  background-color: #DFC6A4;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.domain-test-btn:hover {
  background-color: #DCB160;
  transform: translateY(-2px);
}

.summary-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.cta-link {
  color: #DFC6A4;
  font-weight: 700;
  text-decoration: underline;
  font-size: 1.25rem;
  display: inline;
  margin-left: 0.25rem;
}

.active-quizzes-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0.5rem 0;
}

.quizz-card {
  background-color: #91576C;
  border-left: 5px solid #DFC6A4;
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.quizz-info {
  margin: 0;
  color: #C2BAD3;
  font-size: 1rem;
}

.resume-btn {
  background-color: #DFC6A4;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.resume-btn:hover {
  background-color: #DCB160;
  transform: translateY(-2px);
}

@media (max-width: 600px) {
  .quizz-card, .due-domain-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .resume-btn, .domain-test-btn {
    width: 100%;
  }
}

/* Transition Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
