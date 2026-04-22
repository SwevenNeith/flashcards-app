<script setup>
defineProps({
  show: Boolean,
  categoryName: String,
  flashcardCount: Number
})

defineEmits(['close', 'confirm'])
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Confirmation de suppression</h3>
          </div>

          <div class="modal-body">
            <p>
              Êtes-vous sûr de vouloir supprimer la catégorie <strong>"{{ categoryName }}"</strong> ?
            </p>
            <div class="warning-text">
              <p>Elle contient <strong>{{ flashcardCount }} flashcard{{ flashcardCount > 1 ? 's' : '' }}</strong>.</p>
            </div>
            <p class="final-warning">
              Cette action supprimera également toutes les flashcards associées ainsi que leurs révisions. Cette action est irréversible.
            </p>
          </div>

          <div class="modal-footer">
            <button class="modal-button cancel" @click="$emit('close')">
              Annuler
            </button>
            <button class="modal-button delete" @click="$emit('confirm')">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: table;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(4px);
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  width: 95%;
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 0px auto;
  padding: 20px 30px;
  background-color: #91576C;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
  border: 1px solid #DFC6A4;
}

.modal-header h3 {
  margin-top: 0;
  color: #C2BAD3;
  font-size: 1.25rem;
}

.modal-body {
  margin: 20px 0;
  line-height: 1.6;
  color: #C2BAD3;
}

.warning-text {
  margin-top: 10px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.2);
  border-left: 4px solid #f56565;
  border-radius: 8px;
}

.final-warning {
  margin-top: 15px;
  font-size: 0.85rem;
  color: #C2BAD3;
  opacity: 0.8;
  font-style: italic;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

.modal-button {
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.modal-button.cancel {
  background-color: #DFC6A4;
  color: white;
}

.modal-button.cancel:hover {
  background-color: #DCB160;
}

.modal-button.delete {
  background-color: #f56565;
  color: white;
}

.modal-button.delete:hover {
  background-color: #e53e3e;
}

/* Transition styles */
.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(1.1);
}

/* Custom scrollbar */
.modal-container::-webkit-scrollbar {
  width: 6px;
}
.modal-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.modal-container::-webkit-scrollbar-thumb {
  background: #DFC6A4;
  border-radius: 10px;
}
</style>
