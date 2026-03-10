<script setup>
import { ref, onMounted, nextTick } from 'vue'

const emit = defineEmits(['close', 'submit'])

const name = ref('')
const description = ref('')
const iconUrl = ref('')
const nameInput = ref(null)

onMounted(() => {
  console.log('DomaineForm monté')
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
    }
  })
})

const compressImage = (base64Str, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve) => {
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
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.7)) // Compress to JPEG with 0.7 quality
    }
  })
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

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image est trop grande (max 5Mo)')
      return
    }
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result)
      iconUrl.value = compressed
    }
    reader.readAsDataURL(file)
  }
}

</script>

<template>
  <div class="inline-form-card">
    <header class="form-header">
      <h2>Nouveau Domaine</h2>
    </header>

    <form @submit.prevent="handleSubmit" class="domaine-form">
      <div class="form-group">
        <label for="name">Nom du Domaine*</label>
        <input 
          id="name" 
          ref="nameInput"
          v-model="name" 
          type="text" 
          placeholder="Ex: Informatique, Langues..." 
          required 
        />
      </div>

      <div class="form-group">
        <label for="description">Description (Optionnel)</label>
        <textarea 
          id="description" 
          v-model="description" 
          placeholder="De quoi s'agit-il ?" 
          rows="2"
        ></textarea>
      </div>

      <div class="form-group">
        <label>Icône / Image (Optionnel)</label>
        <div class="icon-upload">
          <div v-if="iconUrl" class="icon-preview">
            <img :src="iconUrl" alt="Aperçu icône" />
            <button type="button" class="remove-icon" @click="iconUrl = ''">Supprimer</button>
          </div>
          <label v-else class="upload-placeholder">
            <input type="file" accept="image/*" @change="handleFileChange" hidden />
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            <span>Choisir une image</span>
          </label>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$emit('close')">Annuler</button>
        <button type="submit" class="btn-submit" :disabled="!name.trim()">Valider</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.inline-form-card {
  background: white;
  border-radius: 16px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  overflow: hidden;
  animation: slide-down 0.3s ease-out;
}

@keyframes slide-down {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.form-header {
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.form-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.domaine-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.85rem;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #048B9A;
  box-shadow: 0 0 0 2px rgba(4, 139, 154, 0.1);
}

.icon-upload {
  border: 2px dashed #eee;
  border-radius: 12px;
  padding: 0.75rem;
  text-align: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  color: #888;
  font-size: 0.85rem;
}

.icon-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.icon-preview img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 10px;
}

.remove-icon {
  background: #ff4757;
  color: white;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.form-actions button {
  flex: 1;
  padding: 0.65rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-cancel {
  background: #f1f2f6;
  border: none;
  color: #2c3e50;
}

.btn-submit {
  background: #048B9A;
  border: none;
  color: white;
}

.btn-submit:disabled {
  background: #a4d2d8;
  cursor: not-allowed;
}
</style>

