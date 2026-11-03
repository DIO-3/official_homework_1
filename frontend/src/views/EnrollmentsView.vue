<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCatalogStore } from '../stores/catalog'
import { useNoticeStore } from '../stores/notice'
import StudentTable from '../components/StudentTable.vue'
const catalog = useCatalogStore()
const notice = useNoticeStore()
let active = true
onBeforeUnmount(() => { active = false })
function notify(message, isError = false) {
  if (active) notice.show(message, isError)
}
const studentId = ref('')
const busy = computed(() => catalog.loading || catalog.saving)
const selectedCourse = computed(() => catalog.courses.find(course => course.id === catalog.selectedCourseId))
onMounted(() => catalog.refresh())
watch(() => catalog.selectedCourseId, id => catalog.loadRoster(id))
watch(() => catalog.students, students => {
  if (!students.some(student => student.id === studentId.value)) studentId.value = ''
})
async function enroll() {
  notify('')
  if (!studentId.value || !catalog.selectedCourseId) return notify('Select a student and a course.', true)
  try {
    await catalog.enroll({ studentId: studentId.value, courseId: catalog.selectedCourseId })
    studentId.value = ''
    notify('Student enrolled successfully.')
  } catch (error) { notify(error.message, true) }
}
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">Class membership</p><h2>Enrollments</h2><p>Choose a course to view its roster and enroll a student.</p></div>
    <button type="button" class="secondary" :disabled="busy || catalog.rosterLoading" @click="catalog.refresh()">Refresh records</button>
  </div>
  <div v-if="catalog.error" class="notice error" role="alert">{{ catalog.error }} Use Refresh records to try again.</div>
  <p v-if="catalog.loading" role="status">Loading students and courses…</p>
  <div class="workspace-grid">
    <section class="panel"><h3>Enroll a student</h3><p class="hint">Both selections are required.</p>
      <form @submit.prevent="enroll"><fieldset :disabled="busy || !!catalog.error">
        <div class="field"><label for="enroll-course">Course</label><select id="enroll-course" v-model="catalog.selectedCourseId" required>
          <option disabled value="">Select a course</option><option v-for="course in catalog.courses" :key="course.id" :value="course.id">{{ course.id }} — {{ course.name }}</option>
        </select></div>
        <div class="field"><label for="enroll-student">Student</label><select id="enroll-student" v-model="studentId" required>
          <option disabled value="">Select a student</option><option v-for="student in catalog.students" :key="student.id" :value="student.id">{{ student.name }} ({{ student.id }})</option>
        </select></div>
        <button type="submit" :disabled="!catalog.students.length || !catalog.courses.length">{{ catalog.saving ? 'Enrolling…' : 'Enroll student' }}</button>
      </fieldset></form>
      <p v-if="!catalog.loading && !catalog.error && !catalog.courses.length" class="hint">First, <RouterLink to="/courses">add a course</RouterLink>.</p>
      <p v-if="!catalog.loading && !catalog.error && !catalog.students.length" class="hint">First, <RouterLink to="/students">add a student</RouterLink>.</p>
    </section>
    <section class="panel records-panel" :aria-busy="catalog.rosterLoading || catalog.loading">
      <div class="section-heading"><h3>Course roster</h3><span v-if="selectedCourse && !catalog.rosterLoading && !catalog.rosterError" class="count">{{ catalog.roster.length }} enrolled</span></div>
      <p v-if="selectedCourse" class="course-label"><strong>{{ selectedCourse.id }}</strong> · {{ selectedCourse.name }}</p>
      <p v-if="catalog.loading || catalog.rosterLoading" class="empty-state" role="status">Loading roster…</p>
      <div v-else-if="catalog.rosterError" class="notice error" role="alert"><p>{{ catalog.rosterError }}</p><button type="button" class="secondary" @click="catalog.loadRoster()">Retry roster</button></div>
      <template v-else-if="!catalog.error">
        <div v-if="!selectedCourse" class="empty-state"><h4>Choose a course</h4><p>Its enrolled students will appear here.</p></div>
        <StudentTable v-else-if="catalog.roster.length" :students="catalog.roster" :removable="false" :caption="`${selectedCourse.id} roster`" />
        <div v-else class="empty-state"><h4>No students enrolled yet</h4><p>Select a student and enroll them in this course.</p></div>
      </template>
    </section>
  </div>
</template>
