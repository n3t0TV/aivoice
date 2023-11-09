const connection = require('../mysqlConnection');

module.exports = {
    getStore,
    getStores,
    createStore
};

async function getStore(idStore) {
    console.log("-----getStore-----");

    const queryString = `SELECT * FROM stores WHERE id = ${idStore}`;
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function getStores() {
    console.log("-----getStores-----");

    const queryString = `SELECT * FROM stores`;
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function createStore({ name, address, number, zipcode }) {
    console.log("-----crateStore-----");

    const queryString = `INSERT INTO stores (name, address, number, zipcode) VALUES (
            "${name}",
            "${address}",
            "${number}",
            "${zipcode}"
    )`;
    console.log(queryString);
    connection.asyncQuery(queryString);
}