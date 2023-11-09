const connection = require('../mysqlConnection');
const mysql = require('mysql2');

module.exports = {
    getPlanogramProductsByStore,
    createPlanogramProduct,
    getPlanogramProductBySku,
    getPlanogramProductsByPosition,
    getPlanogramProductsByShelf,
    getNeighborsByPosition
};

async function getPlanogramProductsByStore(storeId) {
    console.log("-----getPlanogramProductsByStore-----");

    let queryString = `SELECT * FROM planogram WHERE storeId = ?`;
    queryString = mysql.format(queryString, [storeId]);

    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function getPlanogramProductBySku({ storeId, sku }) {
    console.log("-----getPlanogramProductsByStore-----");

    let queryString = `SELECT * FROM planogram WHERE storeId = ? AND sku = ?`;
    queryString = mysql.format(queryString, [storeId, sku]);

    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result[0];
}

async function getNeighborsByPosition({ storeId, shelf, position }) {
    console.log("-----getNeighborsByPosition-----");

    let queryString = `SELECT * FROM planogram
    JOIN products on planogram.sku = products.sku
    WHERE planogram.storeId = ?
    AND planogram.shelf = ?
    AND planogram.position = ? 
    OR  planogram.position = ?`;

    queryString = mysql.format(queryString, [storeId, shelf, position - 1, position + 1]);
   
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function getPlanogramProductsByPosition({ storeId, position }) {
    console.log("-----getPlanogramProductsByStore-----");

    let queryString = `SELECT * FROM planogram WHERE storeId = ? AND position = ?`;
    queryString = mysql.format(queryString, [storeId, position]);

    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function getPlanogramProductsByShelf({ storeId, shelf }) {
    console.log("-----getPlanogramProductsByStore-----");

    let queryString = `SELECT * FROM planogram WHERE storeId = ? AND shelf = ?`;
    queryString = mysql.format(queryString, [storeId, shelf]);
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function createPlanogramProduct({ sku, shelf, position, storeId }) {
    console.log("-----createPlanogramProduct-----");

    let queryString = `INSERT INTO planogram (sku, shelf, position, storeId) VALUES (?, ?, ?, ?)`;
    queryString = mysql.format(queryString, [sku, shelf, position, storeId]);
    console.log(queryString);
    connection.asyncQuery(queryString);
}