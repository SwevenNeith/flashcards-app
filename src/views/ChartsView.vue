<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useDomainesStore } from '../stores/domaines'
import { useCategoriesStore } from '../stores/categories'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { fr } from 'date-fns/locale'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  TimeScale
)

const domainesStore = useDomainesStore()
const categoriesStore = useCategoriesStore()

const stats = ref([])
const isLoading = ref(true)
const selectedDomain = ref('')
const selectedCategory = ref('')
const timeRange = ref('all') // 'week', 'month', 'year', 'all'
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth()) // 0-based

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const yearsList = []
  for (let i = currentYear; i >= currentYear - 5; i--) {
    yearsList.push(i)
  }
  return yearsList
})

const months = [
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' },
  { value: 7, label: 'Août' },
  { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' }
]

const filterStats = computed(() => {
  let filtered = stats.value

  if (selectedDomain.value) {
    filtered = filtered.filter(s => s.domain === selectedDomain.value)
  }
  if (selectedCategory.value) {
    filtered = filtered.filter(s => s.category === selectedCategory.value)
  }

  if (timeRange.value === 'week') {
    const now = new Date()
    const lastWeek = new Date(now)
    lastWeek.setDate(now.getDate() - 7)
    filtered = filtered.filter(s => new Date(s.date) >= lastWeek)
  } else if (timeRange.value === 'month') {
    filtered = filtered.filter(s => {
      const d = new Date(s.date)
      return d.getFullYear() === selectedYear.value && d.getMonth() === selectedMonth.value
    })
  } else if (timeRange.value === 'year') {
    filtered = filtered.filter(s => new Date(s.date).getFullYear() === selectedYear.value)
  }

  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date))
})

const chartData = computed(() => {
  const data = filterStats.value.map(s => {
    const parts = s.score.split('/')
    const val = parseFloat(parts[0])
    const total = parseFloat(parts[1])
    return {
      x: new Date(s.date),
      y: total > 0 ? (val / total) * 100 : 0,
      targetDomain: s.Domaines?.name || 'Inconnu',
      targetCategory: s.Categories?.name || ''
    }
  })

  return {
    datasets: [
      {
        label: 'Score (%)',
        backgroundColor: '#048B9A',
        borderColor: '#048B9A',
        data: data,
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 8
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 30, // Even more space at the top
      right: 30,
      bottom: 10,
      left: 15
    }
  },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: timeRange.value === 'week' ? 'day' : (timeRange.value === 'month' ? 'day' : 'month'),
        displayFormats: {
          day: 'dd MMM',
          month: 'MMM yyyy'
        }
      },
      adapters: {
        date: {
          locale: fr
        }
      },
      title: {
        display: true,
        text: 'Date',
        font: {
          weight: 'bold'
        }
      },
      grid: {
        display: false
      }
    },
    y: {
      min: 0,
      max: 110, // Gives empty space at the top
      ticks: {
        stepSize: 10, // Force clear steps
        callback: (value) => {
          if (value > 100) return null // Hide labels above 100
          return `${value}%`
        }
      },
      title: {
        display: true,
        text: 'Score (%)',
        font: {
          weight: 'bold'
        }
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        title: (items) => {
          if (!items.length) return ''
          const date = new Date(items[0].raw.x)
          return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })
        },
        label: (context) => {
          const raw = context.raw
          const lines = [`Score : ${raw.y.toFixed(1)}%`]
          lines.push(`Domaine : ${raw.targetDomain}`)
          if (raw.targetCategory) lines.push(`Catégorie : ${raw.targetCategory}`)
          return lines
        }
      }
    }
  }
}

watch(selectedDomain, async (newDomain) => {
  selectedCategory.value = ''
  if (newDomain) {
    await categoriesStore.fetchCategories(newDomain)
  }
})

onMounted(async () => {
  try {
    const [statsResult, _] = await Promise.all([
      supabase.from('Statistiques')
        .select('*, Domaines(name), Categories(name)')
        .order('date', { ascending: true }),
      domainesStore.fetchDomaines()
    ])
    if (statsResult.error) throw statsResult.error
    stats.value = statsResult.data || []
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="charts-container">
    <div class="header-actions">
      <router-link to="/statistiques" class="back-link">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
        </svg>
        Retour aux stats
      </router-link>
      <h1>Ma Progression</h1>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loader"></div>
      <p>Analyse des données...</p>
    </div>

    <div v-else class="charts-content">
      <div class="filters-card">
        <div class="filter-row">
          <div class="filter-group">
            <label>Période</label>
            <div class="range-selector">
              <button :class="{ active: timeRange === 'all' }" @click="timeRange = 'all'">Tout</button>
              <button :class="{ active: timeRange === 'year' }" @click="timeRange = 'year'">Année</button>
              <button :class="{ active: timeRange === 'month' }" @click="timeRange = 'month'">Mois</button>
              <button :class="{ active: timeRange === 'week' }" @click="timeRange = 'week'">Semaine</button>
            </div>
          </div>
          
          <div v-if="timeRange === 'year' || timeRange === 'month'" class="filter-group">
            <label>Année Sélectionnée</label>
            <select v-model="selectedYear" class="styled-select">
              <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>

          <div v-if="timeRange === 'month'" class="filter-group">
            <label>Mois Sélectionné</label>
            <select v-model="selectedMonth" class="styled-select">
              <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-group">
            <label>Domaine</label>
            <select v-model="selectedDomain" class="styled-select">
              <option value="">Tous les domaines</option>
              <option v-for="dom in domainesStore.domaines" :key="dom.id" :value="dom.id">{{ dom.name }}</option>
            </select>
          </div>
          <div class="filter-group" :class="{ disabled: !selectedDomain }">
            <label>Catégorie</label>
            <select v-model="selectedCategory" class="styled-select" :disabled="!selectedDomain">
              <option value="">Toutes les catégories</option>
              <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="chart-wrapper">
        <div v-if="filterStats.length > 1" class="chart-container">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div v-else class="empty-chart">
          <svg viewBox="0 0 24 24" width="60" height="60">
            <path fill="#ddd" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
          </svg>
          <p>Pas assez de données pour générer un graphique (min. 2 tests).</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.charts-container {
  padding: 1.5rem 1rem 5rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
  font-weight: 800;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #048B9A;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s;
}

.back-link:hover {
  transform: translateX(-5px);
}

.filters-card {
  background: white;
  padding: 1.5rem;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border: 1px solid #f0f0f0;
}

.filter-row {
  display: flex;
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.filter-group label {
  font-weight: 700;
  color: #048B9A;
  font-size: 0.9rem;
}

.filter-group.disabled {
  opacity: 0.4;
}

.range-selector {
  display: flex;
  background: #f0f2f5;
  padding: 4px;
  border-radius: 12px;
  gap: 4px;
}

.range-selector button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.6rem;
  border-radius: 9px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.range-selector button.active {
  background: white;
  color: #048B9A;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.styled-select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 1rem;
  color: #2c3e50;
  background-color: #f9f9f9;
}

.chart-wrapper {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.05);
  border: 1px solid #f0f0f0;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  width: 100%;
}

.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  color: #999;
  gap: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 24px;
  width: 100%;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #048B9A;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
  }
}
</style>
