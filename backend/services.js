const { Student, Course, Enrollment } = require('./models');
const { httpError, requiredText, studentFields, courseFields } = require('./validation');

let pendingWrite = Promise.resolve();

// Keep enrollment checks and deletes together on standalone MongoDB.
function write(action) {
    const result = pendingWrite.then(action);
    pendingWrite = result.catch(() => {});
    return result;
}

async function findStudent(id) {
    const student = await Student.findOne({ id: requiredText(id, 'Student ID', 64) }).lean();
    if (!student) throw httpError(404, 'Student not found.');
    return student;
}

async function findCourse(id) {
    const course = await Course.findOne({ id: requiredText(id, 'Course ID', 64) }).lean();
    if (!course) throw httpError(404, 'Course not found.');
    return course;
}

function addStudent(body) {
    const values = studentFields(body);
    return write(() => Student.create(values));
}

function addCourse(body) {
    const values = courseFields(body);
    return write(() => Course.create(values));
}

async function removeStudentRecord(student) {
    await Enrollment.deleteMany({ studentId: student.id });
    await Student.deleteOne({ _id: student._id });
    return student;
}

function deleteStudent(id) {
    return write(async () => removeStudentRecord(await findStudent(id)));
}

function deleteStudentByName(name) {
    const value = requiredText(name, 'Student name');
    return write(async () => {
        const students = await Student.find({ name: value }).limit(2).lean();
        if (!students.length) throw httpError(404, 'Student not found.');
        if (students.length > 1) throw httpError(409, 'More than one student has this name. Delete by student ID.');
        return removeStudentRecord(students[0]);
    });
}

function deleteCourse(id) {
    return write(async () => {
        const course = await findCourse(id);
        await Enrollment.deleteMany({ courseId: course.id });
        await Course.deleteOne({ _id: course._id });
        return course;
    });
}

function addEnrollment(body) {
    const studentId = requiredText(body?.studentId, 'Student ID', 64);
    const courseId = requiredText(body?.courseId, 'Course ID', 64);
    return write(async () => {
        await findStudent(studentId);
        await findCourse(courseId);
        return Enrollment.create({ studentId, courseId });
    });
}

module.exports = { findStudent, findCourse, addStudent, addCourse, deleteStudent, deleteStudentByName, deleteCourse, addEnrollment };
