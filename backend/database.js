const mongoose = require('mongoose');
const { Student, Course, Enrollment } = require('./models');

async function connectDatabase(uri) {
    if (!uri) throw new Error('MONGODB_URI is required in backend/.env.');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    for (const model of [Student, Course, Enrollment]) {
        await model.createCollection();
        await model.createIndexes();
    }
}

async function disconnectDatabase() {
    await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
