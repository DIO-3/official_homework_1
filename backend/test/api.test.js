const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const mongoose = require('mongoose');
const app = require('../app');
const { connectDatabase, disconnectDatabase } = require('../database');
const { Student, Course, Enrollment } = require('../models');

const databaseName = `cis3339_hw1_test_${randomUUID().replaceAll('-', '')}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
let server;
let baseUrl;
let initialized = false;

async function listen() {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function closeServer() {
  if (!server) return;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  server = undefined;
}

async function request(method, path, body, status = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  if (status >= 400) assert.equal(typeof data.error, 'string');
  return data;
}

function student(id = '1001', name = 'John') {
  return { name, id, phone: '555-1234', zip: '77001' };
}

function course(id = 'CIS 3339') {
  return { id, name: 'Enterprise Applications Development' };
}

async function addStudent(id, name) {
  return request('POST', '/api/students', student(id, name), 201);
}

async function addCourse(id) {
  return request('POST', '/api/courses', course(id), 201);
}

async function enroll(studentId = '1001', courseId = 'CIS 3339', status = 201) {
  return request('POST', '/api/enrollments', { studentId, courseId }, status);
}

const coursePath = id => `/api/courses/${encodeURIComponent(id)}`;

describe('Phase 2 API with local MongoDB', { concurrency: false, timeout: 60000 }, () => {
  before(async () => {
    const probe = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
      await probe.connect();
      const { databases } = await probe.db().admin().listDatabases();
      assert.equal(databases.some(database => database.name === databaseName), false);
    } finally {
      await probe.close();
    }
    await connectDatabase(uri);
    initialized = true;
    await listen();
  });

  after(async () => {
    await closeServer();
    if (initialized) {
      if (mongoose.connection.readyState !== 1) await connectDatabase(uri);
      assert.equal(mongoose.connection.db.databaseName, databaseName);
      assert.match(databaseName, /^cis3339_hw1_test_[a-f0-9]{32}$/);
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Enrollment.deleteMany({});
    await Student.deleteMany({});
    await Course.deleteMany({});
  });

  it('initializes empty collections and unique indexes automatically', async () => {
    assert.deepEqual(await request('GET', '/api/students'), []);
    assert.deepEqual(await request('GET', '/api/courses'), []);
    const studentIndexes = await Student.collection.indexes();
    const courseIndexes = await Course.collection.indexes();
    const enrollmentIndexes = await Enrollment.collection.indexes();
    assert.ok(studentIndexes.some(index => index.unique && index.key.id === 1));
    assert.ok(courseIndexes.some(index => index.unique && index.key.id === 1));
    assert.ok(enrollmentIndexes.some(index => index.unique
      && index.key.studentId === 1 && index.key.courseId === 1));
  });

  it('adds, searches, displays, and deletes students', async () => {
    const result = await addStudent();
    assert.equal(result.student.id, '1001');
    assert.equal(result.student.name, 'John');
    await addStudent('1002', 'Jane');
    assert.equal((await request('GET', '/api/students')).length, 2);
    assert.deepEqual((await request('GET', '/api/students?search=jo')).map(row => row.id), ['1001']);
    assert.deepEqual((await request('GET', '/api/students?search=1002')).map(row => row.id), ['1002']);
    assert.deepEqual(await request('GET', '/api/students?search=missing'), []);
    assert.equal((await request('GET', '/api/students/1001')).phone, '555-1234');
    assert.equal((await request('DELETE', '/api/students/1001')).student.id, '1001');
    await request('GET', '/api/students/1001', undefined, 404);
    await request('DELETE', '/api/students/1001', undefined, 404);
    assert.deepEqual((await request('GET', '/api/students')).map(row => row.id), ['1002']);
  });

  it('treats regex characters in a search as literal text', async () => {
    await addStudent('literal', 'A.*[B]');
    await addStudent('other', 'Alice');
    const results = await request('GET', `/api/students?search=${encodeURIComponent('.*[')}`);
    assert.deepEqual(results.map(row => row.id), ['literal']);
  });

  it('rejects invalid records', async () => {
    for (const key of ['name', 'id', 'phone', 'zip']) {
      const value = student();
      delete value[key];
      await request('POST', '/api/students', value, 400);
      await request('POST', '/api/students', { ...student(), [key]: '   ' }, 400);
      await request('POST', '/api/students', { ...student(), [key]: { value: 'bad' } }, 400);
    }
    for (const key of ['name', 'id']) {
      await request('POST', '/api/courses', { ...course(), [key]: '' }, 400);
      await request('POST', '/api/courses', { ...course(), [key]: [] }, 400);
    }
    for (const id of ['.', '..', ' . ', ' .. ']) {
      const studentError = await request('POST', '/api/students', student(id), 400);
      assert.equal(studentError.error, 'Student ID cannot be "." or "..".');
      const courseError = await request('POST', '/api/courses', course(id), 400);
      assert.equal(courseError.error, 'Course ID cannot be "." or "..".');
    }
    await request('POST', '/api/students', null, 400);
    await request('POST', '/api/enrollments', {}, 400);
    assert.equal(await Student.countDocuments(), 0);
    assert.equal(await Course.countDocuments(), 0);
  });

  it('rejects duplicate students and courses, including concurrent requests', async () => {
    const studentResponses = await Promise.all([0, 1].map(() => fetch(`${baseUrl}/api/students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student()),
    })));
    assert.deepEqual(studentResponses.map(response => response.status).sort(), [201, 409]);
    await addCourse();
    await request('POST', '/api/courses', course(), 409);
    assert.equal(await Student.countDocuments(), 1);
    assert.equal(await Course.countDocuments(), 1);
  });

  it('lists courses and returns missing-course errors', async () => {
    await addCourse();
    await addCourse('CIS 3368');
    assert.equal((await request('GET', '/api/courses')).length, 2);
    assert.equal((await request('GET', coursePath('CIS 3339'))).id, 'CIS 3339');
    assert.deepEqual(await request('GET', `${coursePath('CIS 3339')}/students`), []);
    await request('GET', coursePath('missing'), undefined, 404);
    await request('GET', `${coursePath('missing')}/students`, undefined, 404);
    await request('DELETE', coursePath('missing'), undefined, 404);
  });

  it('enrolls existing students, rejects invalid relationships and duplicates, and returns a roster', async () => {
    await addStudent();
    await addStudent('1002', 'Jane');
    await addCourse();
    await enroll('missing', 'CIS 3339', 404);
    await enroll('1001', 'missing', 404);
    const result = await enroll();
    assert.equal(result.enrollment.studentId, '1001');
    assert.equal(result.enrollment.courseId, 'CIS 3339');
    await enroll('1001', 'CIS 3339', 409);
    await enroll('1002');
    const roster = await request('GET', `${coursePath('CIS 3339')}/students`);
    assert.deepEqual(roster.map(row => row.id).sort(), ['1001', '1002']);
    assert.equal(await Enrollment.countDocuments(), 2);
  });

  it('rejects concurrent duplicate enrollments', async () => {
    await addStudent();
    await addCourse();
    const responses = await Promise.all([0, 1].map(() => fetch(`${baseUrl}/api/enrollments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: '1001', courseId: 'CIS 3339' }),
    })));
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
    assert.equal(await Enrollment.countDocuments(), 1);
  });

  it('cascades student deletion without removing another student’s enrollment', async () => {
    await addStudent();
    await addStudent('1002', 'Jane');
    await addCourse();
    await enroll();
    await enroll('1002');
    await request('DELETE', '/api/students/1001');
    assert.equal(await Enrollment.countDocuments({ studentId: '1001' }), 0);
    assert.equal(await Enrollment.countDocuments({ studentId: '1002' }), 1);
    assert.deepEqual((await request('GET', `${coursePath('CIS 3339')}/students`)).map(row => row.id), ['1002']);
  });

  it('cascades course deletion without removing enrollments in another course', async () => {
    await addStudent();
    await addCourse();
    await addCourse('CIS 3368');
    await enroll();
    await enroll('1001', 'CIS 3368');
    await request('DELETE', coursePath('CIS 3339'));
    assert.equal(await Enrollment.countDocuments({ courseId: 'CIS 3339' }), 0);
    assert.equal(await Enrollment.countDocuments({ courseId: 'CIS 3368' }), 1);
    assert.equal(await Student.countDocuments(), 1);
  });

  it('does not leave orphan enrollments when enrollment races with deletion', async () => {
    await addCourse();
    for (let index = 0; index < 8; index++) {
      const id = `race-${index}`;
      await addStudent(id, `Race ${index}`);
      const [enrollment, deletion] = await Promise.all([
        fetch(`${baseUrl}/api/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: id, courseId: 'CIS 3339' }) }),
        fetch(`${baseUrl}/api/students/${id}`, { method: 'DELETE' }),
      ]);
      assert.ok([201, 404].includes(enrollment.status), `Unexpected enrollment status ${enrollment.status}`);
      assert.equal(deletion.status, 200);
      assert.equal(await Enrollment.countDocuments({ studentId: id }), 0);
      assert.equal(await Student.countDocuments({ id }), 0);
    }
  });

  it('does not leave orphan enrollments when enrollment races with course deletion', async () => {
    await addStudent();
    for (let index = 0; index < 8; index++) {
      const id = `course-race-${index}`;
      await addCourse(id);
      const [enrollment, deletion] = await Promise.all([
        fetch(`${baseUrl}/api/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: '1001', courseId: id }) }),
        fetch(`${baseUrl}${coursePath(id)}`, { method: 'DELETE' }),
      ]);
      assert.ok([201, 404].includes(enrollment.status), `Unexpected enrollment status ${enrollment.status}`);
      assert.equal(deletion.status, 200);
      assert.equal(await Enrollment.countDocuments({ courseId: id }), 0);
      assert.equal(await Course.countDocuments({ id }), 0);
    }
  });

  it('returns JSON 503 while disconnected and recovers after reconnecting', async () => {
    await addStudent();
    await disconnectDatabase();
    try {
      await request('GET', '/api/students', undefined, 503);
      await request('POST', '/api/students', student('unavailable'), 503);
    } finally {
      await connectDatabase(uri);
    }
    assert.deepEqual(await request('GET', '/api/health'), { status: 'ok' });
    assert.equal(await Student.countDocuments(), 1);
  });

  it('preserves records across a database disconnect and application restart', async () => {
    await addStudent();
    await addCourse();
    await enroll();
    await closeServer();
    await disconnectDatabase();
    await connectDatabase(uri);
    await listen();
    assert.equal((await request('GET', '/api/students/1001')).name, 'John');
    assert.equal((await request('GET', coursePath('CIS 3339'))).name, course().name);
    assert.deepEqual((await request('GET', `${coursePath('CIS 3339')}/students`)).map(row => row.id), ['1001']);
  });

  it('keeps the Phase 1 endpoints working and rejects ambiguous deletion by name', async () => {
    await request('POST', '/add-student', student(), 201);
    assert.equal((await request('POST', '/find-student', { name: 'John' })).id, '1001');
    await request('POST', '/add-student', student(), 409);
    await request('POST', '/delete-student', { name: 'John' });
    await request('POST', '/find-student', { name: 'John' }, 404);
    await addStudent('2001', 'Same Name');
    await addStudent('2002', 'Same Name');
    await request('POST', '/delete-student', { name: 'Same Name' }, 409);
    assert.equal(await Student.countDocuments(), 2);
    await request('POST', '/delete-student', { id: '2001' });
    assert.equal(await Student.countDocuments(), 1);
  });

  it('returns JSON for malformed requests and unknown routes', async () => {
    const response = await fetch(`${baseUrl}/api/students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken',
    });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
    await request('GET', '/api/unknown', undefined, 404);
  });
});
