const connection = require('../mysqlConnection');
const mysql = require('mysql2');
module.exports = {
    saveOrderList,
    saveOrderListAsync
};


// table orderLists
// customerNumber
// storeNumber
// storelocation
// items
// datetime
// products
// storemap


async function saveOrderList({ idSession, customerNumber, storeNumber, products, storemap }) {
    console.log("-----saveOrderList-----");

    let queryString = `INSERT INTO orderLists (idSession, customerNumber, storeNumber, products, storemap) VALUES(?,?,?,?,?)`;
    console.log(queryString);

    queryString = mysql.format(queryString, [idSession, customerNumber, storeNumber, products, storemap]);
    let response = await connection.asyncQuery(queryString);
    return response;
}

async function saveOrderListAsync({ idSession, customerNumber, storeNumber, products, storemap }) {
    console.log("-----saveOrderListAsync-----");

    let queryString = `INSERT INTO orderLists (idSession, customerNumber, storeNumber, products, storemap) VALUES(?,?,?,?,?)`;

    console.log(queryString);
    queryString = mysql.format(queryString, [idSession, customerNumber, storeNumber, products, storemap]);
    connection.asyncQuery(queryString);
}