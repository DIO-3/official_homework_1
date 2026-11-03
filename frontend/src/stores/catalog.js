import { ref } from 'vue'
import { defineStore } from 'pinia'
import { get, post, remove } from '../api/client.js'

const byStudent = (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
const byCourse = (a, b) => a.id.localeCompare(b.id)

export const useCatalogStore = defineStore('catalog', () => {
  const students = ref([])
  const courses = ref([])
  const selectedCourseId = ref('')
  const roster = ref([])
  const loading = ref(false)
  const error = ref('')
  const rosterLoading = ref(false)
  const rosterError = ref('')
  const saving = ref(false)
  let refreshRequest = 0
  let rosterRequest = 0
  let revision = 0

  function cancelRosterLoad() {
    rosterRequest++
    rosterLoading.value = false
  }

  async function loadRoster(id = selectedCourseId.value) {
    const request = ++rosterRequest
    selectedCourseId.value = id
    roster.value = []
    rosterError.value = ''
    rosterLoading.value = Boolean(id)
    if (!id) return
    try {
      const result = await get(`courses/${encodeURIComponent(id)}/students`)
      if (request === rosterRequest && selectedCourseId.value === id) roster.value = result
    } catch (cause) {
      if (request === rosterRequest && selectedCourseId.value === id) rosterError.value = cause.message
    } finally {
      if (request === rosterRequest) rosterLoading.value = false
    }
  }

  async function refresh() {
    const request = ++refreshRequest
    const startedAt = revision
    loading.value = true
    error.value = ''
    try {
      const [studentRows, courseRows] = await Promise.all([get('students'), get('courses')])
      if (request !== refreshRequest || startedAt !== revision) return
      students.value = studentRows.sort(byStudent)
      courses.value = courseRows.sort(byCourse)
      if (!courses.value.some(course => course.id === selectedCourseId.value)) {
        selectedCourseId.value = ''
        cancelRosterLoad()
        roster.value = []
        rosterError.value = ''
      } else {
        await loadRoster()
      }
    } catch (cause) {
      if (request === refreshRequest && startedAt === revision) error.value = cause.message
    } finally {
      if (request === refreshRequest) loading.value = false
    }
  }

  async function save(action) {
    if (saving.value) throw new Error('Please wait for the current change to finish.')
    saving.value = true
    revision++
    try {
      const result = await action()
      revision++
      return result
    } finally {
      saving.value = false
    }
  }

  function addStudent(fields) {
    return save(async () => {
      const { student } = await post('students', fields)
      students.value = [...students.value.filter(row => row.id !== student.id), student].sort(byStudent)
      return student
    })
  }

  function removeStudent(id) {
    return save(async () => {
      const { student } = await remove(`students/${encodeURIComponent(id)}`)
      students.value = students.value.filter(row => row.id !== id)
      const needsReload = rosterLoading.value || rosterError.value
      cancelRosterLoad()
      roster.value = roster.value.filter(row => row.id !== id)
      if (needsReload && selectedCourseId.value) void loadRoster()
      return student
    })
  }

  function addCourse(fields) {
    return save(async () => {
      const { course } = await post('courses', fields)
      courses.value = [...courses.value.filter(row => row.id !== course.id), course].sort(byCourse)
      return course
    })
  }

  function removeCourse(id) {
    return save(async () => {
      const { course } = await remove(`courses/${encodeURIComponent(id)}`)
      courses.value = courses.value.filter(row => row.id !== id)
      if (selectedCourseId.value === id) {
        selectedCourseId.value = ''
        cancelRosterLoad()
        roster.value = []
        rosterError.value = ''
      }
      return course
    })
  }

  function enroll(fields) {
    return save(async () => {
      const { enrollment } = await post('enrollments', fields)
      if (selectedCourseId.value === enrollment.courseId) {
        const needsReload = rosterLoading.value || rosterError.value
        cancelRosterLoad()
        const student = students.value.find(row => row.id === enrollment.studentId)
        if (student && !roster.value.some(row => row.id === student.id)) {
          roster.value = [...roster.value, student].sort(byStudent)
        }
        if (needsReload) void loadRoster()
      }
      return enrollment
    })
  }

  return {
    students, courses, selectedCourseId, roster, loading, error, rosterLoading, rosterError, saving,
    refresh, loadRoster, addStudent, removeStudent, addCourse, removeCourse, enroll,
  }
})
