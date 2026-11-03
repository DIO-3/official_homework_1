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

test('server initializes a new database and preserves records across a process restart', { timeout: 30000 }, async () => {
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
        const request = async (route, body) => {
            const response = await fetch(`http://127.0.0.1:${port}/api/${route}`, body ? {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            } : {});
            assert.equal(response.status, body ? 201 : 200);
            return response.json();
        };
        assert.deepEqual(await request('students'), []);
        await request('students', { id: '1001', name: 'John', phone: '555-1234', zip: '77001' });
        await request('courses', { id: 'CIS 3339', name: 'Enterprise Applications Development' });
        await request('enrollments', { studentId: '1001', courseId: 'CIS 3339' });
        await stop(processInfo);
        processInfo = launch(uri, port);
        await processInfo.ready;
        assert.equal((await request('students/1001')).name, 'John');
        assert.deepEqual((await request('courses/CIS%203339/students')).map(student => student.id), ['1001']);
        assert.equal(await client.db().collection('enrollments').countDocuments(), 1);
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
