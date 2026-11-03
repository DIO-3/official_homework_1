const mongoose = require('mongoose');

const text = (maxLength) => ({ type: String, required: true, trim: true, maxlength: maxLength });
const options = { versionKey: false, id: false, bufferCommands: false, autoCreate: false, autoIndex: false };

const studentSchema = new mongoose.Schema({
    name: text(200),
    id: text(64),
    phone: text(40),
    zip: text(20),
}, options);
studentSchema.index({ id: 1 }, { unique: true });

const courseSchema = new mongoose.Schema({ id: text(64), name: text(200) }, options);
courseSchema.index({ id: 1 }, { unique: true });

const enrollmentSchema = new mongoose.Schema({
    studentId: text(64),
    courseId: text(64),
}, options);
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ courseId: 1 });

module.exports = {
    Student: mongoose.model('Student', studentSchema),
    Course: mongoose.model('Course', courseSchema),
    Enrollment: mongoose.model('Enrollment', enrollmentSchema),
};
