<script setup>
import { reactive, ref } from 'vue'
import { post } from '../api/client'
import { useNoticeStore } from '../stores/notice'
import StudentTable from '../components/StudentTable.vue'

const notice = useNoticeStore()
const searchName = ref('')
const student = ref(null)
const busy = ref(false)
const form = reactive({ name: '', id: '', phone: '', zip: '' })

async function run(action) {
  busy.value = true
  notice.show('')
  try { await action() }
  catch (error) { notice.show(error.message, true) }
  finally { busy.value = false }
}
function search() {
  student.value = null
  run(async () => {
    student.value = await post('find-student', { name: searchName.value.trim() })
    notice.show('Student found.')
  })
}
function add() {
  run(async () => {
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
    if (Object.values(values).some(value => !value)) throw new Error('Please fill in every field.')
    await post('add-student', values)
    Object.keys(form).forEach(key => { form[key] = '' })
    notice.show('Student added successfully.')
  })
}
function remove(record) {
  if (!window.confirm(`Delete student ${record.name}?`)) return
  run(async () => {
    await post('delete-student', { name: record.name })
    student.value = null
    notice.show('Student deleted successfully.')
  })
}
</script>

<template>
  <h2>Students</h2>
  <div class="forms">
    <section>
      <h3>Search for a student</h3>
      <form @submit.prevent="search">
        <label for="search-name">Student name</label>
        <input id="search-name" v-model="searchName" required />
        <button :disabled="busy">Search</button>
      </form>
    </section>
    <section>
      <h3>Add a student</h3>
      <form @submit.prevent="add">
        <label for="name">Name</label><input id="name" v-model="form.name" required />
        <label for="student-id">Student ID</label><input id="student-id" v-model="form.id" required />
        <label for="phone">Phone</label><input id="phone" v-model="form.phone" type="tel" required />
        <label for="zip">ZIP code</label><input id="zip" v-model="form.zip" inputmode="numeric" required />
        <button :disabled="busy">Add student</button>
      </form>
    </section>
  </div>
  <p v-if="busy" role="status">Working…</p>
  <StudentTable v-if="student" :student="student" :busy="busy" @delete="remove" />
  <p v-else>Search by exact name to display a student.</p>
</template>
