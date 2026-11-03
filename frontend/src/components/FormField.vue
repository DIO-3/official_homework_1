<script setup>
const model = defineModel({ type: String, default: '' })
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  maxlength: { type: Number, default: 200 },
  inputmode: { type: String, default: 'text' },
  autocomplete: { type: String, default: 'off' },
})
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input :id="id" v-model="model" :type="type" :maxlength="maxlength"
      :inputmode="inputmode" :autocomplete="autocomplete" required />
  </div>
</template>
