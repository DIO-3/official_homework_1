<script setup>
import AppNotice from './components/AppNotice.vue'
</script>

<template>
  <header>
    <p>CIS 3339 · Homework 1</p>
    <h1>Student Management</h1>
    <nav aria-label="Main navigation">
      <RouterLink to="/students">Students</RouterLink>
      <RouterLink to="/courses">Courses</RouterLink>
      <RouterLink to="/enrollments">Enrollments</RouterLink>
    </nav>
  </header>
  <main>
    <AppNotice />
    <RouterView />
  </main>
</template>
