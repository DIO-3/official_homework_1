<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useCatalogStore } from '../stores/catalog'
import { useNoticeStore } from '../stores/notice'
import StudentTable from '../components/StudentTable.vue'
import FormField from '../components/FormField.vue'
import ConfirmDelete from '../components/ConfirmDelete.vue'

const catalog = useCatalogStore()
const notice = useNoticeStore()
let active = true
onBeforeUnmount(() => { active = false })
function notify(message, isError = false) {
  if (active) notice.show(message, isError)
}
const searchName = ref('')
const search = ref('')
const pendingDelete = ref(null)
const heading = ref(null)
const form = reactive({ name: '', id: '', phone: '', zip: '' })
const visibleStudents = computed(() => {
  const query = search.value.toLowerCase()
  return catalog.students.filter(student => student.name.toLowerCase().includes(query) || student.id.toLowerCase().includes(query))
})
const busy = computed(() => catalog.saving || catalog.loading)
onMounted(() => catalog.refresh())

function find() { search.value = searchName.value.trim() }
function clearSearch() { searchName.value = ''; search.value = '' }
async function add() {
  notify('')
  const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
  if (Object.values(values).some(value => !value)) return notify('Please fill in every field.', true)
  try {
    await catalog.addStudent(values)
    Object.keys(form).forEach(key => { form[key] = '' })
    clearSearch()
    notify('Student added successfully.')
  } catch (error) { notify(error.message, true) }
}
async function remove() {
  notify('')
  try {
    await catalog.removeStudent(pendingDelete.value.id)
    notify('Student and their enrollments deleted.')
  } catch (error) { notify(error.message, true) }
  finally {
    pendingDelete.value = null
    await nextTick()
    if (active) heading.value?.focus()
  }
}
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">Directory</p><h2 ref="heading" tabindex="-1">Students</h2><p>Add a student or find an existing record by name or ID.</p></div>
    <button type="button" class="secondary" :disabled="busy" @click="catalog.refresh()">Refresh records</button>
  </div>
  <div v-if="catalog.error" class="notice error" role="alert">{{ catalog.error }} Use Refresh records to try again.</div>
  <div class="workspace-grid">
    <section class="panel">
      <h3>Add a student</h3><p class="hint">All fields are required.</p>
      <form @submit.prevent="add">
        <fieldset :disabled="busy">
          <FormField id="name" v-model="form.name" label="Name" autocomplete="name" />
          <FormField id="student-id" v-model="form.id" label="Student ID" :maxlength="64" />
          <FormField id="phone" v-model="form.phone" label="Phone" type="tel" inputmode="tel" autocomplete="tel" :maxlength="40" />
          <FormField id="zip" v-model="form.zip" label="ZIP code" inputmode="numeric" autocomplete="postal-code" :maxlength="20" />
          <button type="submit">{{ catalog.saving ? 'Saving…' : 'Add student' }}</button>
        </fieldset>
      </form>
    </section>
    <section class="panel records-panel" :aria-busy="catalog.loading">
      <div class="section-heading"><h3>Student directory</h3><span class="count">{{ catalog.students.length }} total</span></div>
      <form class="search-form" role="search" @submit.prevent="find">
        <div class="field"><label for="search-name">Search by name or ID</label><input id="search-name" v-model="searchName" type="search" maxlength="200" /></div>
        <div class="actions"><button :disabled="catalog.loading">Search</button><button v-if="search" type="button" class="secondary" @click="clearSearch">Clear</button></div>
      </form>
      <p v-if="catalog.loading" class="empty-state" role="status">Loading student records…</p>
      <template v-else-if="!catalog.error">
        <p class="result-count" role="status">{{ visibleStudents.length }} {{ visibleStudents.length === 1 ? 'student' : 'students' }}{{ search ? ` matching “${search}”` : '' }}</p>
        <StudentTable v-if="visibleStudents.length" :students="visibleStudents" :busy="busy" @delete="pendingDelete = $event" />
        <div v-else class="empty-state"><h4>{{ search ? 'No matching students' : 'Your directory is empty' }}</h4><p>{{ search ? 'Try another name or student ID.' : 'Add your first student using the form.' }}</p></div>
      </template>
    </section>
  </div>
  <ConfirmDelete v-if="pendingDelete" :name="`${pendingDelete.name} (${pendingDelete.id})`" :busy="catalog.saving" @cancel="pendingDelete = null" @confirm="remove" />
</template>
