const { Pool } = require('pg');
const { config } = require('dotenv');

const bcrypt = require('bcrypt');
const Crypto = require('crypto');

var cron = require('node-cron');

config();

const initializeTable = `
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL NOT NULL PRIMARY KEY,
    email VARCHAR NOT NULL,
    troopnum VARCHAR NOT NULL,
    activity VARCHAR NOT NULL,
    scouter_cook BOOLEAN,
    scout_cook BOOLEAN
);

CREATE TABLE IF NOT EXISTS admin (
    id SERIAL NOT NULL PRIMARY KEY,
    email VARCHAR NOT NULL,
    pass VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS logins (
    id SERIAL NOT NULL PRIMARY KEY,
    key VARCHAR NOT NULL,
    admin VARCHAR NOT NULL,
    expires TIMESTAMP NOT NULL
);
`;

const addRegistrationQuery = "INSERT INTO registrations (email, troopnum, activity, scouter_cook, scout_cook) VALUES ($1, $2, $3, $4, $5);";

const pool= new Pool({
  user: process.env.DATABASE_USER,
  host: 'localhost',
  max: 20,
  idleTimeoutMillis: 30000,
  database: process.env.DATABASE,
  password: process.env.DATABASE_PASSWORD
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
})

async function checkExists (troopnum) {
    client = await pool.connect();
    let ret = false;
    try {
        const results = await client.query("SELECT * FROM registrations WHERE troopnum = $1;", [troopnum]);
        console.log("Query results: " + results.rows);
        if (results.rows.length >= 1) {
            ret = true;
        }
    } catch(err) {
        console.error(err);
        ret = undefined;
    } finally {
        client.release();
    }

    return ret;
}

async function addRegistration (email, troop, activity, acoff, kcoff) {
    // 200: success
    // 409: troop already exists
    // 500: misc. other error

    client = await pool.connect();
    let bad = false;

    if (checkExists(troop)) {
        return 409;
    }

    try {
        await client.query(addRegistrationQuery, [email, troop, activity, acoff, kcoff]);
    } catch (err) {
        console.log("Whoopsies! There was an error adding a registration.\n" + err.stack);
        bad = true;
    } finally {
        client.release();
        if (bad) {
            return 500;
        } else {
            return 200;
        }
    }
    
}

async function getRegistrations () {
    client = await pool.connect();
    res = await client.query('SELECT * FROM registrations');
    client.release();
    return res.rows;
}


async function cullOldLogins () {
    // Remove expired login tokens to keep the database's memory usage down.
    let client = await pool.connect();
    let logins = await client.query("DELETE FROM Logins WHERE expires < CURRENT_TIMESTAMP");
    client.release();
}

async function initialize () {
    pool.connect((err, client, done) => {
        if (err) throw err;
        client.query(initializeTable, (err, res) => {
            done();
            if (err) {
                console.error(err);
                return;
            }
        });
    });

    cron.schedule('*/1 * * * *', () => {
        cullOldLogins();
    });

    console.log('Database initialized');
}

async function takedown () {
    console.log('Destroying database connection...');
    await pool.end();
    console.log("Database connection destroyed.");
}


/*
######################
##    ADMIN STUFF   ##
######################
*/

async function check_api_key (key) {
    // Returns whether or not the API key is correct.
    // `key` should be a hash.
    let server_key = "Pansarvarnskanon II";
    if (await bcrypt.compare(server_key, key)) {
        return true;
    }
    console.log("Oops! It didn't match.");
    return false;
}

async function check_login_key (key) {
    // Returns: user id || NULL
    client = await pool.connect();

    let res;
    try {
        res = await client.query("SELECT * FROM logins WHERE key = $1 AND expires >= now()", [key]);
    } catch(err) {
        console.log("Encountered error when checking signin key:\n" + err.stack);
    } finally {
        await client.release();
    }

    if (res.rows.length > 0) {
        return 200;
    } else {
        return 401;
    }
}

async function login (email, pass) {
    const client = await pool.connect();
    let res = 401;
    let token = "THIS IS NOT A VALID TOKEN";
    try {
        const db_entries = await client.query("SELECT * FROM admin WHERE email = $1", [email]);
        if (db_entries.rows.length == 1) {
            const hash_brown = db_entries.rows[0].pass;
            const valid = await bcrypt.compare(pass, hash_brown);
            if (valid) {
                res = 201;
                token = Crypto
                    .randomBytes(256)
                    .toString('base64')
                    .slice(0, 256);
                let expires = Date.now();
                await client.query("INSERT INTO logins (key, admin, expires) VALUES ($1, $2, now()::timestamp + '30 minutes'::interval)", [token, email]);
            } else {
                res = 401;
            }
        } else if (db_entries.rows.length > 1) {
            console.error("ERROR ERROR ERROR: THERE ARE MULTIPLE ADMIN ACCOUNTS WITH THE SAME EMAIL!!!");
            console.error("Error: lp0 on fire");
            res = 500;
        }
    } catch(err) {
        console.error("Encountered error when processing login request: " + err.stack);
        res = 500;  // Any sort of error happening causes the login process to abort.
    } finally {
        client.release();
    }

    return [res, token];
}

async function delTroop (id) {
    const client = await pool.connect();
    let res = 200;

    try {
        await client.query("DELETE FROM registrations WHERE id=$1", [id]);
    } catch(err) {
        console.error("Error when deleting registration: " + err.stack);
        res = 500;
    } finally {
        client.release();
    }

    return res;
}


module.exports.initialize = initialize;
module.exports.getRegistrations = getRegistrations;
module.exports.addRegistration = addRegistration;
module.exports.checkExists = checkExists;
module.exports.check_api_key = check_api_key;
module.exports.check_login_key = check_login_key;
module.exports.login = login;
module.exports.delTroop = delTroop;