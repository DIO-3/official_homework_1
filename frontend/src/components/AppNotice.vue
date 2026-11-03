<script setup>
import { useNoticeStore } from '../stores/notice'
const notice = useNoticeStore()
</script>

<template>
  <div aria-live="polite" aria-atomic="true">
    <div v-if="notice.message" :class="['notice', { error: notice.isError }]">
      <p :role="notice.isError ? 'alert' : 'status'">{{ notice.message }}</p>
      <button class="quiet" type="button" aria-label="Dismiss message" @click="notice.show('')">Dismiss</button>
    </div>
  </div>
</template>
