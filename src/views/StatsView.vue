<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useDomainesStore } from '../stores/domaines'
import { useCategoriesStore } from '../stores/categories'

const domainesStore = useDomainesStore()
const categoriesStore = useCategoriesStore()

const stats = ref([])
const isLoading = ref(true)

const selectedDomain = ref('')
const selectedCategory = ref('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

const totalPages = computed(() => Math.ceil(filteredStats.value.length / itemsPerPage))

const paginatedStats = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredStats.value.slice(start, start + itemsPerPage)
})

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const sortedDomaines = computed(() => {
  return [...domainesStore.domaines].sort((a, b) => a.name.localeCompare(b.name))
})

const sortedCategories = computed(() => {
  return [...categoriesStore.categories].sort((a, b) => a.name.localeCompare(b.name))
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const filteredStats = computed(() => {
  if (!selectedDomain.value) return stats.value
  
  return stats.value.filter(stat => {
    const domainMatch = stat.domain === selectedDomain.value
    const categoryMatch = !selectedCategory.value || stat.category === selectedCategory.value
    return domainMatch && categoryMatch
  })
})

watch(selectedDomain, async (newDomain) => {
  selectedCategory.value = ''
  currentPage.value = 1 // Reset pagination
  if (newDomain) {
    await categoriesStore.fetchCategories(newDomain)
  }
})

watch(selectedCategory, () => {
  currentPage.value = 1 // Reset pagination
})

onMounted(async () => {
  try {
    // Parallel fetch for stats and domains
    const [statsResult, _] = await Promise.all([
      supabase
        .from('Statistiques')
        .select(`
          *,
          Domaines (name),
          Categories (name)
        `)
        .order('date', { ascending: false }),
      domainesStore.fetchDomaines()
    ])
    
    if (statsResult.error) throw statsResult.error
    stats.value = statsResult.data || []
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="stats-container">
    <div v-if="isLoading" class="loading-state">
      <div class="loader"></div>
      <p>Chargement des données...</p>
    </div>

    <div v-else class="stats-content">
      <div class="stats-header">
        <router-link to="/graphiques" class="charts-btn">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
          </svg>
          Graphiques
        </router-link>
      </div>

      <div class="filters-section">
        <div class="filter-group">
          <label for="domain-filter">Domaine</label>
          <select id="domain-filter" v-model="selectedDomain" class="styled-select">
            <option value="">Tous les domaines</option>
            <option v-for="dom in sortedDomaines" :key="dom.id" :value="dom.id">{{ dom.name }}</option>
          </select>
        </div>
        <div class="filter-group" :class="{ 'disabled': !selectedDomain }">
          <label for="category-filter">Catégorie</label>
          <select id="category-filter" v-model="selectedCategory" class="styled-select" :disabled="!selectedDomain">
            <option value="">Toutes les catégories</option>
            <option v-for="cat in sortedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="total-badge-container">
          <div class="total-tests-badge">
            <span class="label">Total de tests</span>
            <span class="count">{{ filteredStats.length }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredStats.length > 0" class="table-wrapper">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Test sur</th>
              <th>Score</th>
              <th>A réviser</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in paginatedStats" :key="stat.id">
            <td class="date-cell">{{ formatDate(stat.date) }}</td>
            <td class="target-cell">
              <div class="domain-name">{{ stat.Domaines?.name || 'Inconnu' }}</div>
              <div v-if="stat.Categories" class="category-subname">{{ stat.Categories.name }}</div>
            </td>
            <td class="score-cell">
              <span class="score-badge" :class="{'perfect': stat.score.startsWith(stat.score.split('/')[1])}">
                {{ stat.score }}
              </span>
            </td>
            <td class="review-cell">
              <span v-if="stat.to_review" class="review-text">{{ stat.to_review }}</span>
              <span v-else class="success-text">Aucune erreur !</span>
            </td>
          </tr>
        </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <div class="pagination-controls">
            <button class="page-btn" @click="goToPage(1)" :disabled="currentPage === 1" title="Premier">
              «
            </button>
            <button class="page-btn" @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" title="Précédent">
              ‹
            </button>
            <div class="page-info">
              Page <strong>{{ currentPage }}</strong> sur <strong>{{ totalPages }}</strong>
            </div>
            <button class="page-btn" @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" title="Suivant">
              ›
            </button>
            <button class="page-btn" @click="goToPage(totalPages)" :disabled="currentPage === totalPages" title="Dernier">
              »
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path fill="#ddd" d="M14,10H17L13.5,13.5L10,10H13V3H14V10M19,19H5V11H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V11H19V19Z" />
          </svg>
        </div>
        <p v-if="!selectedDomain">Aucune données pour l'instant. Faites un test pour voir votre résultat apparaître.</p>
        <p v-else>Aucun test trouvé pour les filtres sélectionnés.</p>
        <router-link to="/" class="start-link">Retourner à l'accueil</router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
.stats-container {
  padding: 1.5rem 1rem 5rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: #91576C;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  text-align: center;
  width: 100%;
}

.stats-header {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: flex-start;
}

.charts-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #DFC6A4;
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s;
  box-shadow: 0 4px 12px #DFC6A4;
}

.charts-btn:hover {
  background-color: #DCB160;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px #DCB160;
}

.filters-section {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  background: #91576C;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  align-items: flex-end;
}

.total-badge-container {
  display: flex;
  align-items: center;
  padding-bottom: 0.25rem;
}

.total-tests-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #91576C;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: 1px solid #DFC6A4;
}

.total-tests-badge .label {
  font-size: 0.75rem;
  color: #C2BAD3;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.total-tests-badge .count {
  font-size: 1.25rem;
  font-weight: 800;
  color: #DCB160;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.filter-group.disabled {
  opacity: 0.5;
}

.filter-group label {
  font-weight: 700;
  color: #DCB160;
  font-size: 0.9rem;
}

.styled-select {
  padding: 0.75rem;
  border: 1px solid #DFC6A4;
  border-radius: 8px;
  font-size: 1rem;
  color: #C2BAD3;
  background-color: #91576C;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.styled-select:focus {
  border-color: #DFC6A4;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #DFC6A4;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.table-wrapper {
  background: #91576C;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  overflow-x: auto; /* Scroll horizontal si besoin sur très petit écran */
  border: 1px solid #DFC6A4;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 600px; /* Force un minimum de largeur pour garder le tableau lisible */
}

.stats-table th {
  background-color: #91576C;
  padding: 1.25rem 1rem;
  font-weight: 700;
  color: #DCB160;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #DFC6A4;
}

.stats-table td {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid #DFC6A4;
  color: #C2BAD3;
  vertical-align: middle;
}

.date-cell {
  font-weight: 600;
  color: #C2BAD3;
  white-space: nowrap;
}

.target-cell {
  line-height: 1.2;
}

.domain-name {
  font-weight: 700;
  color: #C2BAD3;
  font-size: 1rem;
}

.category-subname {
  font-size: 0.85rem;
  color: #C2BAD3;
  margin-top: 0.1rem;
}

.score-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background: #DFC6A4;
  border-radius: 20px;
  font-weight: 800;
  color: #462A39;
  font-size: 0.9rem;
}

.score-badge.perfect {
  background: #e6f9ed;
  color: #2ed573;
}

.review-cell {
  max-width: 300px;
}

.review-text {
  font-size: 0.85rem;
  color: #ff4757;
  display: block;
}

.success-text {
  color: #2ed573;
  font-weight: 600;
  font-size: 0.9rem;
}

.start-link {
  margin-top: 1.5rem;
  color: #DFC6A4;
  font-weight: 700;
  text-decoration: none;
}

.empty-icon {
  margin-bottom: 1rem;
}

/* Pagination Styles */
.pagination {
  padding: 1.25rem;
  border-top: 1px solid #DFC6A4;
  background-color: #91576C;
  display: flex;
  justify-content: center;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #DFC6A4;
  background-color: #91576C;
  border-radius: 10px;
  color: #C2BAD3;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #DFC6A4;
  color: #DFC6A4;
  background-color: #91576C;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: #91576C;
}

.page-info {
  font-size: 0.95rem;
  color: #C2BAD3;
}

.page-info strong {
  color: #DCB160;
}

/* Responsive adjustments */
@media (max-width: 800px) {
  .stats-container {
    padding: 1rem 0.5rem;
  }
  .filters-section {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  .total-badge-container {
    width: 100%;
    padding-bottom: 0;
  }
  .total-tests-badge {
    width: 100%;
  }
}
</style>
