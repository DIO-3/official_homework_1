import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from '../src/stores/catalog.js'
import { get } from '../src/api/client.js'

const originalFetch = globalThis.fetch
const john = { id: '1001', name: 'John', phone: '555-1234', zip: '77001' }
const jane = { id: '1002', name: 'Jane', phone: '555-5678', zip: '77002' }
const course = { id: 'CIS 3339', name: 'Enterprise Applications Development' }
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data })
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => { globalThis.fetch = originalFetch })

test('loads backend data and keeps shared student/course lists sorted', async () => {
  globalThis.fetch = async url => response(url === '/api/students' ? [john, jane] : [course])
  const store = useCatalogStore()
  await store.refresh()
  assert.deepEqual(store.students.map(row => row.id), ['1002', '1001'])
  assert.deepEqual(store.courses, [course])
  assert.equal(store.loading, false)
  assert.equal(store.error, '')
})

test('reports load failures and keeps the last good data', async () => {
  globalThis.fetch = async () => { throw new TypeError('offline') }
  const store = useCatalogStore()
  store.students = [john]
  await store.refresh()
  assert.match(store.error, /Cannot reach the server/)
  assert.deepEqual(store.students, [john])
  assert.equal(store.loading, false)
})

test('adds records through the API and updates shared state', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: JSON.parse(options.body) })
    return response(url === '/api/students' ? { student: john } : { course }, 201)
  }
  const store = useCatalogStore()
  assert.deepEqual(await store.addStudent(john), john)
  assert.deepEqual(await store.addCourse(course), course)
  assert.deepEqual(store.students, [john])
  assert.deepEqual(store.courses, [course])
  assert.deepEqual(calls.map(call => call.method), ['POST', 'POST'])
  assert.equal(store.saving, false)
})

test('duplicate errors preserve data and release the saving state', async () => {
  globalThis.fetch = async () => response({ error: 'That ID already exists.' }, 409)
  const store = useCatalogStore()
  store.students = [john]
  await assert.rejects(store.addStudent(john), /That ID already exists/)
  assert.deepEqual(store.students, [john])
  assert.equal(store.saving, false)
})

test('prevents repeated writes while a save is pending', async () => {
  const request = deferred()
  globalThis.fetch = () => request.promise
  const store = useCatalogStore()
  const first = store.addStudent(john)
  assert.equal(store.saving, true)
  await assert.rejects(store.addStudent(jane), /Please wait/)
  request.resolve(response({ student: john }, 201))
  await first
  assert.deepEqual(store.students, [john])
})

test('deleting a student updates the shared list and roster', async () => {
  let requestedUrl
  globalThis.fetch = async (url, options) => {
    requestedUrl = url
    assert.equal(options.method, 'DELETE')
    return response({ student: john })
  }
  const store = useCatalogStore()
  store.students = [jane, john]
  store.roster = [jane, john]
  await store.removeStudent(john.id)
  assert.equal(requestedUrl, '/api/students/1001')
  assert.deepEqual(store.students, [jane])
  assert.deepEqual(store.roster, [jane])
})

test('deleting the selected course clears its roster and selection', async () => {
  globalThis.fetch = async url => {
    assert.equal(url, '/api/courses/CIS%203339')
    return response({ course })
  }
  const store = useCatalogStore()
  store.courses = [course]
  store.selectedCourseId = course.id
  store.roster = [john]
  await store.removeCourse(course.id)
  assert.deepEqual(store.courses, [])
  assert.equal(store.selectedCourseId, '')
  assert.deepEqual(store.roster, [])
})

test('enrollment updates the selected roster and keeps duplicate errors visible to the caller', async () => {
  let duplicate = false
  globalThis.fetch = async () => duplicate
    ? response({ error: 'This student is already enrolled in this course.' }, 409)
    : response({ enrollment: { studentId: john.id, courseId: course.id } }, 201)
  const store = useCatalogStore()
  store.students = [john]
  store.selectedCourseId = course.id
  await store.enroll({ studentId: john.id, courseId: course.id })
  assert.deepEqual(store.roster, [john])
  duplicate = true
  await assert.rejects(store.enroll({ studentId: john.id, courseId: course.id }), /already enrolled/)
  assert.deepEqual(store.roster, [john])
})

test('a late roster response cannot overwrite a newer course selection', async () => {
  const first = deferred()
  const second = deferred()
  globalThis.fetch = url => url.includes('FIRST') ? first.promise : second.promise
  const store = useCatalogStore()
  const oldLoad = store.loadRoster('FIRST')
  const newLoad = store.loadRoster('SECOND')
  second.resolve(response([jane]))
  await newLoad
  first.resolve(response([john]))
  await oldLoad
  assert.equal(store.selectedCourseId, 'SECOND')
  assert.deepEqual(store.roster, [jane])
  assert.equal(store.rosterLoading, false)
})

test('refresh clears a selection that was deleted outside the current view', async () => {
  globalThis.fetch = async url => response(url === '/api/students' ? [john] : [])
  const store = useCatalogStore()
  store.selectedCourseId = course.id
  store.roster = [john]
  await store.refresh()
  assert.equal(store.selectedCourseId, '')
  assert.deepEqual(store.roster, [])
})

test('a pending refresh cannot overwrite a completed addition', async () => {
  const studentsResponse = deferred()
  globalThis.fetch = async (url, options) => {
    if (options.method === 'POST') return response({ student: john }, 201)
    return url === '/api/students' ? studentsResponse.promise : response([])
  }
  const store = useCatalogStore()
  const loading = store.refresh()
  await store.addStudent(john)
  studentsResponse.resolve(response([]))
  await loading
  assert.deepEqual(store.students, [john])
  assert.equal(store.loading, false)
})

test('invalid server JSON produces a readable error', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError() } })
  await assert.rejects(get('students'), /unreadable response/)
})
