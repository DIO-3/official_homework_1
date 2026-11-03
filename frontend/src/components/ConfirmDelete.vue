<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
defineProps({ name: { type: String, required: true }, busy: Boolean })
const emit = defineEmits(['confirm', 'cancel'])
const dialog = ref(null)
onMounted(() => dialog.value.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog ref="dialog" aria-labelledby="delete-title" aria-describedby="delete-description"
    @cancel.prevent="!busy && emit('cancel')">
    <h2 id="delete-title">Delete {{ name }}?</h2>
    <p id="delete-description">This record and its enrollments will be removed. This cannot be undone.</p>
    <div class="actions">
      <button type="button" class="secondary" :disabled="busy" autofocus @click="emit('cancel')">Cancel</button>
      <button type="button" class="danger" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Deleting…' : 'Confirm delete' }}</button>
    </div>
  </dialog>
</template>
