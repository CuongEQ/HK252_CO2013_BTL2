const app = require('./app');
const pool = require('./config/db');

const PORT = Number(process.env.PORT || 4000);

async function startServer() {
    try {
        await pool.query('SELECT 1');
        app.listen(PORT, () => {
            console.log(`Backend is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
