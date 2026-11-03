function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

function requiredText(value, field, maxLength = 200) {
    if (typeof value !== 'string' || !value.trim()) {
        throw httpError(400, `${field} must be a nonempty string.`);
    }
    const result = value.trim();
    if (result.length > maxLength) throw httpError(400, `${field} must be ${maxLength} characters or fewer.`);
    return result;
}

function studentFields(body) {
    return {
        name: requiredText(body?.name, 'Name'),
        id: requiredText(body?.id, 'Student ID', 64),
        phone: requiredText(body?.phone, 'Phone', 40),
        zip: requiredText(body?.zip, 'ZIP code', 20),
    };
}

function courseFields(body) {
    return { id: requiredText(body?.id, 'Course ID', 64), name: requiredText(body?.name, 'Course name') };
}

module.exports = { httpError, requiredText, studentFields, courseFields };
