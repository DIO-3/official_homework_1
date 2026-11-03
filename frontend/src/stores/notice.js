import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNoticeStore = defineStore('notice', () => {
  const message = ref('')
  const isError = ref(false)
  function show(text, error = false) {
    message.value = text
    isError.value = error
  }
  return { message, isError, show }
})
