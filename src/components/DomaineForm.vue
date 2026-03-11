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
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="form-header">
        <h2>Nouveau Domaine</h2>
        <button type="button" class="close-x" @click="$emit('close')">&times;</button>
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

.modal-card {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: modal-in 0.3s ease-out;
}

@keyframes modal-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.form-header {
  padding: 1.25rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: 600;
}

.close-x {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}

.close-x:hover {
  color: #ff4757;
}

.domaine-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #048B9A;
  box-shadow: 0 0 0 3px rgba(4, 139, 154, 0.1);
}

.icon-upload {
  border: 2px dashed #e0e0e0;
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
  transition: border-color 0.2s;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #777;
  font-size: 0.9rem;
}

.icon-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.icon-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.remove-icon {
  background: #ff4757;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions button {
  flex: 1;
  padding: 0.8rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f1f2f6;
  border: none;
  color: #2c3e50;
}

.btn-cancel:hover {
  background: #e1e2e6;
}

.btn-submit {
  background: #048B9A;
  border: none;
  color: white;
}

.btn-submit:hover {
  background: #037a88;
  transform: translateY(-1px);
}

.btn-submit:disabled {
  background: #a4d2d8;
  cursor: not-allowed;
  transform: none;
}
</style>

