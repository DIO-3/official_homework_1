<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useCatalogStore } from '../stores/catalog'
import { useNoticeStore } from '../stores/notice'
import FormField from '../components/FormField.vue'
import ConfirmDelete from '../components/ConfirmDelete.vue'
const catalog = useCatalogStore()
const notice = useNoticeStore()
let active = true
onBeforeUnmount(() => { active = false })
function notify(message, isError = false) {
  if (active) notice.show(message, isError)
}
const form = reactive({ id: '', name: '' })
const pendingDelete = ref(null)
const heading = ref(null)
const busy = computed(() => catalog.loading || catalog.saving)
onMounted(() => catalog.refresh())
async function add() {
  notify('')
  if (!form.id.trim() || !form.name.trim()) return notify('Please fill in every field.', true)
  try {
    await catalog.addCourse({ id: form.id.trim(), name: form.name.trim() })
    form.id = ''; form.name = ''
    notify('Course added successfully.')
  } catch (error) { notify(error.message, true) }
}
async function remove() {
  notify('')
  try {
    await catalog.removeCourse(pendingDelete.value.id)
    notify('Course and its enrollments deleted.')
  } catch (error) { notify(error.message, true) }
  finally {
    pendingDelete.value = null
    await nextTick()
    if (active) heading.value?.focus()
  }
}
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">Course catalog</p><h2 ref="heading" tabindex="-1">Courses</h2><p>Manage courses available for student enrollment.</p></div>
    <button type="button" class="secondary" :disabled="busy" @click="catalog.refresh()">Refresh records</button>
  </div>
  <div v-if="catalog.error" class="notice error" role="alert">{{ catalog.error }} Use Refresh records to try again.</div>
  <div class="workspace-grid">
    <section class="panel"><h3>Add a course</h3><p class="hint">All fields are required.</p>
      <form @submit.prevent="add"><fieldset :disabled="busy">
        <FormField id="course-id" v-model="form.id" label="Course ID" :maxlength="64" />
        <FormField id="course-name" v-model="form.name" label="Course name" />
        <button type="submit">{{ catalog.saving ? 'Saving…' : 'Add course' }}</button>
      </fieldset></form>
    </section>
    <section class="panel records-panel" :aria-busy="catalog.loading">
      <div class="section-heading"><h3>Available courses</h3><span class="count">{{ catalog.courses.length }} total</span></div>
      <p v-if="catalog.loading" class="empty-state" role="status">Loading courses…</p>
      <template v-else-if="!catalog.error">
        <div v-if="catalog.courses.length" class="table-wrap" tabindex="0" aria-label="Course records"><table>
          <caption class="sr-only">Available courses</caption>
          <thead><tr><th scope="col">Course ID</th><th scope="col">Course name</th><th scope="col">Actions</th></tr></thead>
          <tbody><tr v-for="course in catalog.courses" :key="course.id">
            <th scope="row" class="record-id">{{ course.id }}</th><td>{{ course.name }}</td>
            <td><div class="table-actions"><RouterLink to="/enrollments" @click="catalog.selectedCourseId = course.id">View roster</RouterLink>
              <button type="button" class="danger quiet" :disabled="busy" :aria-label="`Delete course ${course.id}`" @click="pendingDelete = course">Delete</button></div></td>
          </tr></tbody>
        </table></div>
        <div v-else class="empty-state"><h4>No courses yet</h4><p>Add a course to start enrolling students.</p></div>
      </template>
    </section>
  </div>
  <ConfirmDelete v-if="pendingDelete" :name="pendingDelete.id" :busy="catalog.saving" @cancel="pendingDelete = null" @confirm="remove" />
</template>
