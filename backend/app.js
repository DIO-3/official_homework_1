const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { Student, Course, Enrollment } = require('./models');
const services = require('./services');
const { httpError, requiredText } = require('./validation');

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));
const router = express.Router();
router.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) return next(httpError(503, 'Database unavailable. Please try again shortly.'));
    next();
});
router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.get('/students', async (req, res) => {
    let filter = {};
    if (req.query.search !== undefined && req.query.search !== '') {
        const search = requiredText(req.query.search, 'Search');
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter = { $or: [{ name: new RegExp(escaped, 'i') }, { id: new RegExp(escaped, 'i') }] };
    }
    res.json(await Student.find(filter).sort({ name: 1, id: 1 }).lean());
});
router.get('/students/:id', async (req, res) => res.json(await services.findStudent(req.params.id)));
router.post('/students', async (req, res) => {
    res.status(201).json({ message: 'Student added successfully.', student: await services.addStudent(req.body) });
});
router.delete('/students/:id', async (req, res) => {
    res.json({ message: 'Student deleted successfully.', student: await services.deleteStudent(req.params.id) });
});

router.get('/courses', async (req, res) => res.json(await Course.find().sort({ id: 1 }).lean()));
router.get('/courses/:id', async (req, res) => res.json(await services.findCourse(req.params.id)));
router.post('/courses', async (req, res) => {
    res.status(201).json({ message: 'Course added successfully.', course: await services.addCourse(req.body) });
});
router.delete('/courses/:id', async (req, res) => {
    res.json({ message: 'Course deleted successfully.', course: await services.deleteCourse(req.params.id) });
});
router.get('/courses/:id/students', async (req, res) => {
    const course = await services.findCourse(req.params.id);
    const enrollments = await Enrollment.find({ courseId: course.id }).lean();
    res.json(await Student.find({ id: { $in: enrollments.map(item => item.studentId) } }).sort({ name: 1, id: 1 }).lean());
});
router.post('/enrollments', async (req, res) => {
    res.status(201).json({ message: 'Student enrolled successfully.', enrollment: await services.addEnrollment(req.body) });
});

// Keep the Phase 1 student page working.
router.post('/find-student', async (req, res) => {
    const name = requiredText(req.body?.name, 'Student name');
    const student = await Student.findOne({ name }).sort({ id: 1 }).lean();
    if (!student) throw httpError(404, 'Student not found.');
    res.json(student);
});
router.post('/add-student', async (req, res) => {
    res.status(201).json({ message: 'Student added successfully.', student: await services.addStudent(req.body) });
});
router.post('/delete-student', async (req, res) => {
    const student = req.body?.id !== undefined
        ? await services.deleteStudent(req.body.id)
        : await services.deleteStudentByName(req.body?.name);
    res.json({ message: 'Student deleted successfully.', student });
});

app.use('/api', router, (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((req, res, next) => {
    const legacyPaths = ['/find-student', '/add-student', '/delete-student'];
    if (req.method === 'POST' && legacyPaths.includes(req.path)) return router(req, res, next);
    next();
});

const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath, { index: false, redirect: false }));
// Let Vue handle its page routes after a refresh.
app.get(['/', '/students', '/courses', '/enrollments'], (req, res, next) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendPath, 'index.html'), error => {
        if (!error) return;
        if (error.code === 'ENOENT') {
            return res.status(503).json({ error: 'Frontend build missing. Run npm run build from the project root.' });
        }
        next(error);
    });
});
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === 11000) {
        const fields = Object.keys(error.keyPattern || {});
        const message = fields.includes('studentId')
            ? 'This student is already enrolled in this course.'
            : 'That ID already exists.';
        return res.status(409).json({ error: message });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid record. Check the required fields and their lengths.' });
    }
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
    if (error.status === 503 || mongoose.connection.readyState !== 1 || /Mongo(Network|ServerSelection)|MongooseServerSelection/.test(error.name)) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    console.error('Request failed:', error.name);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
});

module.exports = app;
