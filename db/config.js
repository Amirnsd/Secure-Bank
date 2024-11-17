
require('dotenv').config();
const sql = require('mssql');


const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        trustedConnection: true,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

async function connectDB() {
    try {
        let pool = await sql.connect(config);
        console.log("Connected to database!");
        return pool;
    } catch (err) {
        console.log('Database connection error:', err);
        throw err;
    }
}

module.exports = { connectDB };
