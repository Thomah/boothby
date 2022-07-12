const { Pool } = require('pg');
require('./liquibase.js');
const logger = require('../logger.js');

const pool = new Pool()

exports.waitForLiquibase = async function (callback) {
    try {
        let res = await exports.query('SELECT locked FROM databasechangeloglock', []);
        if (res.rowCount === 1 && res.rows[0].locked) {
            setTimeout(() => exports.waitForLiquibase(callback), 1000);
        } else {
            res = await exports.query('SELECT COUNT(id) AS nb_changelog FROM databasechangelog', []);
            if (res.rowCount === 1 && res.rows[0].nb_changelog != 19) {
                logger.log(res.rows[0].nb_changelog + ' changelog has been executed so far');
                setTimeout(() => exports.waitForLiquibase(callback), 1000);
            } else {
                callback();
            }
        }
    } catch (err) {
        logger.error(err);
        setTimeout(() => exports.waitForLiquibase(callback), 1000);
    }
}

exports.query = async function (text, params) {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if(res === undefined) {
        logger.log('Executed query : "' + text + '"\n - Duration : ' + duration + '\n - Nb results : 0');
    } else {
        logger.log('Executed query : "' + text + '"\n - Duration : ' + duration + '\n - Nb results : ' + res.rowCount);
    }
    return res
};

exports.querySync = function (text, params, callback) {
    const start = Date.now()
    return pool.query(text, params, (err, res) => {
        const duration = Date.now() - start
        if(res === undefined) {
            logger.log('Executed query : "' + text + '"\n - Duration : ' + duration + '\n - Nb results : 0');
        } else {
            logger.log('Executed query : "' + text + '"\n - Duration : ' + duration + '\n - Nb results : ' + res.rowCount);
        }
        if(callback) {
            callback(err, res)
        }
    })
};

exports.getClient = async function () {
    const client = await pool.connect()
    const query = client.query
    const release = client.release
    // set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        logger.error('A client has been checked out for more than 5 seconds!')
        logger.error(`The last executed query on this client was: ${client.lastQuery}`)
    }, 5000)
    // monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
        client.lastQuery = args
        return query.apply(client, args)
    }
    client.release = () => {
        // clear our timeout
        clearTimeout(timeout)
        // set the methods back to their old un-monkey-patched version
        client.query = query
        client.release = release
        return release.apply(client)
    }
    return client
};