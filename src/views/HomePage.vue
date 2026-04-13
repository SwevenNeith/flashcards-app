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
      count: data.count
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
      categoryName: quizz.Categories?.name
    }
  })
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
      <p class="cta-section">
        Allez voir tous les domaines que nous avons en cliquant ici :
        <router-link to="/domaines" class="cta-link">Domaines</router-link>
      </p>
      <p class="cta-section">
        Pour voir votre progression, consultez vos statistiques juste ici :
        <router-link to="/statistiques" class="cta-link">Statistiques</router-link>
      </p>

      <div class="revision-summary cta-section">
        <p>Vous avez <strong>{{ newCardsCount }}</strong> nouvelles cartes.</p>
        <p>Vous avez <strong>{{ dueCardsCount }}</strong> cartes à réviser aujourd'hui.</p>
      </div>
    </div>

    <!-- Modal Formulaire de Test -->
    <transition name="fade">
      <TestForm 
        v-if="showForm" 
        @close="showForm = false"
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
  background-color: #048B9A;
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
  background-color: #037380;
}

.start-test-btn:active {
  transform: scale(0.98);
}

.cta-section {
  font-size: 1.1rem;
  color: #666;
  line-height: 1.6;
}

.revision-summary {
  margin-top: 1rem;
}

.cta-link {
  color: #048B9A;
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
  background-color: #f0f7f8;
  border-left: 5px solid #048B9A;
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}

.quizz-info {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
}

.resume-btn {
  background-color: #048B9A;
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
  background-color: #037380;
  transform: translateY(-2px);
}

@media (max-width: 600px) {
  .quizz-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .resume-btn {
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
