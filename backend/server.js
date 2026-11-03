const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./database');

async function start() {
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
    await connectDatabase(process.env.MONGODB_URI);
    const server = await new Promise((resolve, reject) => {
        const listener = app.listen(port, '127.0.0.1', () => resolve(listener));
        listener.once('error', reject);
    });
    console.log(`Server is running on http://localhost:${port}`);
    let closing = false;
    async function shutdown() {
        if (closing) return;
        closing = true;
        server.close(async () => {
            await disconnectDatabase();
            process.exit(0);
        });
    }
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

start().catch(async (error) => {
    const message = error.code === 'EADDRINUSE' ? 'The configured port is already in use.'
        : 'Check backend/.env, local MongoDB, and the configured port.';
    console.error(`Server could not start. ${message}`);
    await disconnectDatabase();
    process.exitCode = 1;
});
