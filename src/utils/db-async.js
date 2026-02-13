// IMPORT getDB instead of db
const { getDB } = require('../database');

const all = (query, params = []) => {
    return new Promise((resolve, reject) => {
        // ALWAYS CALL getDB() inside the function to get the current active connection
        getDB().all(query, params, (err, rows) => {
            if(err) reject(err);
            else resolve(rows);
        })
    })
}

const get = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDB().get(query, params, (err, row) => {
            if(err) reject(err);
            else resolve(row);
        })
    })
}

const run = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDB().run(query, params, function(err) {
            if(err) reject(err);
            else resolve(this);
        })
    })
}

module.exports = { all, get, run };