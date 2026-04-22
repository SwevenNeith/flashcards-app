<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'submit'])

const name = ref('')
const description = ref('')
const iconUrl = ref('')
const nameInput = ref(null)

onMounted(() => {
  if (props.initialData) {
    name.value = props.initialData.name || ''
    description.value = props.initialData.description || ''
    iconUrl.value = props.initialData.icon || ''
  }
  
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
    }
  })
})

const compressImage = (base64Str, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve) => {
    const mimeType = base64Str.match(/data:([^;]+);base64/)?.[1] || 'image/jpeg'
    const img = new Image()
    img.src = base64Str
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // Clear canvas for transparency if PNG
      if (mimeType === 'image/png') {
        ctx.clearRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0, width, height)
      // For PNG, quality parameter is ignored
      resolve(canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.7 : undefined))
    }
  })
}

const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64 = e.target.result
    iconUrl.value = await compressImage(base64)
  }
  reader.readAsDataURL(file)
}

const handleSubmit = () => {
  const trimmedName = name.value.trim()
  if (!trimmedName) return
  
  emit('submit', {
    name: trimmedName,
    description: description.value.trim(),
    icon: iconUrl.value
  })
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="form-header">
        <h2>{{ initialData ? 'Modifier la Catégorie' : 'Nouvelle Catégorie' }}</h2>
        <button type="button" class="close-x" @click="$emit('close')">&times;</button>
      </header>

      <form @submit.prevent="handleSubmit" class="category-form">
        <div class="form-group">
          <label for="name">Nom de la catégorie</label>
          <input 
            id="name"
            ref="nameInput"
            v-model="name" 
            type="text" 
            placeholder="Ex: Verbes, Vocabulaire..." 
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description (optionnel)</label>
          <textarea 
            id="description"
            v-model="description" 
            placeholder="De quoi parle cette catégorie ?"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Icône / Image</label>
          <div class="icon-upload-container">
            <div v-if="iconUrl" class="icon-preview">
              <img :src="iconUrl" alt="Preview" />
              <button type="button" class="remove-icon" @click="iconUrl = ''">&times;</button>
            </div>
            <div v-else class="icon-placeholder" @click="$refs.fileInput.click()">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
              <span>Ajouter une image</span>
            </div>
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              class="hidden-input" 
              @change="handleFileChange"
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="$emit('close')">Annuler</button>
          <button type="submit" class="submit-btn">Valider</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background-color: #91576C;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.form-header {
  padding: 1.25rem 1.5rem;
  background-color: #DFC6A4;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-x {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.category-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #C2BAD3;
  font-weight: 600;
  font-size: 0.9rem;
}

input[type="text"],
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #DFC6A4;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input[type="text"]:focus,
textarea:focus {
  outline: none;
  border-color: #DFC6A4;
}

.icon-upload-container {
  border: 2px dashed #ddd;
  border-radius: 12px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background-color: #91576C;
}

.icon-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.remove-icon {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(255, 71, 87, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #C2BAD3;
  cursor: pointer;
}

.icon-placeholder span {
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.hidden-input {
  display: none;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #DFC6A4;
  background-color: #DFC6A4;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #DCB160;
}

.submit-btn {
  flex: 2;
  padding: 0.75rem;
  border: none;
  background-color: #DFC6A4;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:hover {
  background-color: #DCB160;
}

.submit-btn:disabled {
  background-color: #C2BAD3;
  cursor: not-allowed;
}
</style>
