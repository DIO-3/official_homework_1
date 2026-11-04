const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');
const { MongoClient } = require('mongoose').mongo;

const serverFile = path.join(__dirname, '../server.js');

async function freePort() {
    const listener = net.createServer().listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    return port;
}

function launch(uri, port) {
    const child = spawn(process.execPath, [serverFile], {
        cwd: os.tmpdir(),
        env: { ...process.env, MONGODB_URI: uri, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const exit = once(child, 'exit');
    const ready = new Promise((resolve, reject) => {
        child.stdout.on('data', data => {
            if (String(data).includes('Server is running')) resolve();
        });
        child.once('error', reject);
        child.once('exit', code => reject(new Error(`Server exited ${code}: ${output}`)));
    });
    ready.catch(() => {});
    return { child, exit, ready, output: () => output };
}

async function stop(processInfo) {
    if (!processInfo || processInfo.child.exitCode !== null) return;
    processInfo.child.kill('SIGTERM');
    await processInfo.exit;
}

test('production server serves routes, enforces integrity, and preserves records across restart', { timeout: 30000 }, async () => {
    const databaseName = `cis3339_hw1_startup_${randomUUID().replaceAll('-', '')}`;
    const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    const port = await freePort();
    let processInfo;
    try {
        await client.connect();
        const { databases } = await client.db().admin().listDatabases();
        assert.ok(!databases.some(database => database.name === databaseName));
        processInfo = launch(uri, port);
        await processInfo.ready;
        const baseUrl = `http://127.0.0.1:${port}`;
        const request = async (route, body, status = body ? 201 : 200, method = body ? 'POST' : 'GET') => {
            const response = await fetch(`${baseUrl}/api/${route}`, {
                method,
                ...(body === undefined ? {} : {
                    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                }),
            });
            assert.equal(response.status, status, `${method} ${route}`);
            assert.match(response.headers.get('content-type'), /application\/json/);
            const result = await response.json();
            if (status >= 400) assert.equal(typeof result.error, 'string');
            return result;
        };
        let indexHtml;
        for (const route of ['/', '/students', '/courses', '/enrollments']) {
            const response = await fetch(`${baseUrl}${route}`, { headers: { Accept: 'text/html' } });
            assert.equal(response.status, 200, `Refresh ${route}`);
            assert.match(response.headers.get('content-type'), /text\/html/);
            const html = await response.text();
            assert.match(html, /id="app"/);
            assert.doesNotMatch(html, /\/@vite\/client|\/src\/main\.js/);
            if (indexHtml === undefined) indexHtml = html;
            else assert.equal(html, indexHtml);
        }
        const assets = [...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g)].map(match => match[1]);
        assert.ok(assets.some(asset => asset.endsWith('.js')), 'Built JavaScript must be referenced');
        assert.ok(assets.some(asset => asset.endsWith('.css')), 'Built CSS must be referenced');
        for (const asset of assets) {
            const response = await fetch(`${baseUrl}${asset}`);
            assert.equal(response.status, 200, asset);
            assert.match(response.headers.get('content-type'), asset.endsWith('.js') ? /javascript/ : /text\/css/);
            assert.ok((await response.text()).length > 0, `${asset} must not be empty`);
        }
        for (const route of ['/assets/missing.js', '/api/unknown', '/api/students/missing']) {
            const response = await fetch(`${baseUrl}${route}`, { headers: { Accept: 'text/html' } });
            assert.equal(response.status, 404, route);
            assert.match(response.headers.get('content-type'), /application\/json/);
            assert.equal(typeof (await response.json()).error, 'string');
        }

        const john = { id: '1001', name: 'John', phone: '555-1234', zip: '77001' };
        const jane = { id: '1002', name: 'Jane', phone: '555-5678', zip: '77002' };
        const course = { id: 'CIS 3339', name: 'Enterprise Applications Development' };
        const secondCourse = { id: 'CIS 3368', name: 'Advanced Object-Oriented Programming' };
        const enrollment = { studentId: john.id, courseId: course.id };
        assert.deepEqual(await request('students'), []);
        assert.deepEqual(await request('courses'), []);
        await request('students', john);
        await request('students', jane);
        await request('students', john, 409);
        await request('students', { ...john, id: 'bad', name: '' }, 400);
        await request('courses', course);
        await request('courses', secondCourse);
        await request('courses', course, 409);
        assert.equal((await request('courses')).length, 2);
        assert.deepEqual((await request('students?search=jo')).map(student => student.id), ['1001']);
        await request('enrollments', enrollment);
        await request('enrollments', enrollment, 409);
        await request('enrollments', { ...enrollment, studentId: 'missing' }, 404);
        await request('enrollments', { ...enrollment, courseId: 'missing' }, 404);
        await request('enrollments', { studentId: jane.id, courseId: course.id });
        await request('enrollments', { studentId: jane.id, courseId: secondCourse.id });
        assert.deepEqual((await request('courses/CIS%203339/students')).map(student => student.id).sort(), ['1001', '1002']);
        await stop(processInfo);
        assert.doesNotMatch(processInfo.output(), /Request failed|Server could not start|Warning:/);
        processInfo = launch(uri, port);
        await processInfo.ready;
        assert.equal((await request('students/1001')).name, 'John');
        assert.deepEqual((await request('courses/CIS%203339/students')).map(student => student.id).sort(), ['1001', '1002']);
        assert.equal(await client.db().collection('enrollments').countDocuments(), 3);
        const refreshedPage = await fetch(`${baseUrl}/enrollments`, { headers: { Accept: 'text/html' } });
        assert.equal(refreshedPage.status, 200);
        assert.equal(await refreshedPage.text(), indexHtml);

        await request('students/1001', undefined, 200, 'DELETE');
        await request('students/1001', undefined, 404);
        assert.equal(await client.db().collection('enrollments').countDocuments({ studentId: john.id }), 0);
        assert.deepEqual((await request('courses/CIS%203339/students')).map(student => student.id), ['1002']);
        await request('courses/CIS%203339', undefined, 200, 'DELETE');
        await request('courses/CIS%203339', undefined, 404);
        assert.equal(await client.db().collection('enrollments').countDocuments({ courseId: course.id }), 0);
        assert.deepEqual((await request('courses/CIS%203368/students')).map(student => student.id), ['1002']);
        assert.equal(await client.db().collection('enrollments').countDocuments(), 1);
        assert.doesNotMatch(processInfo.output(), /Request failed|Server could not start|Warning:/);
    } finally {
        await stop(processInfo);
        assert.match(databaseName, /^cis3339_hw1_startup_[a-f0-9]{32}$/);
        await client.db(databaseName).dropDatabase();
        await client.close();
    }
});

test('startup fails clearly when local MongoDB cannot be reached', { timeout: 15000 }, async () => {
    const processInfo = launch('mongodb://127.0.0.1:1/cis3339_unreachable', await freePort());
    try {
        const [code] = await processInfo.exit;
        assert.equal(code, 1);
        assert.match(processInfo.output(), /Server could not start/);
        assert.match(processInfo.output(), /local MongoDB/);
        assert.doesNotMatch(processInfo.output(), /Server is running/);
    } finally {
        await stop(processInfo);
    }
});
