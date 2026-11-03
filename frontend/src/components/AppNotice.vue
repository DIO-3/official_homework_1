<script setup>
import { useNoticeStore } from '../stores/notice'
const notice = useNoticeStore()
</script>

<template>
  <p v-if="notice.message" :role="notice.isError ? 'alert' : 'status'"
    :class="['notice', { error: notice.isError }]">{{ notice.message }}</p>
</template>
