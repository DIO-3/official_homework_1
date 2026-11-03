<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNoticeStore } from './stores/notice'
import AppNotice from './components/AppNotice.vue'
const route = useRoute()
const notice = useNoticeStore()
watch(() => route.path, () => notice.show(''))
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <div><p class="eyebrow">CIS 3339 · Homework 1</p><h1>Student Management</h1></div>
      <span class="header-tag">Campus records</span>
    </div>
    <nav aria-label="Main navigation">
      <RouterLink to="/students">Students</RouterLink>
      <RouterLink to="/courses">Courses</RouterLink>
      <RouterLink to="/enrollments">Enrollments</RouterLink>
    </nav>
  </header>
  <main id="main-content" tabindex="-1">
    <AppNotice />
    <RouterView />
  </main>
  <footer>Student records, course details, and enrollments in one place.</footer>
</template>
