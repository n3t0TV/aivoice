const connection = require('../../db/mysqlConnection');
const { jsonrepair } = require('jsonrepair');
const mysql = require('mysql2');

module.exports = {
    saveProductRequest,
    getAllProductRequest,
    saveProductRequestAsync,
    updateProductRequestIsCorrect,
    getProductRequestFilterBySource
};

async function saveProductRequest(data) {
    console.log("-----saveProductRequest-----");
    if (data !== undefined && data !== null) {
        console.log("formatedData: ", data);
        const is_correct = data.isCorrect == true ? 1 : 0;
        let queryString = `INSERT INTO productRequests (request, response, is_correct, source, products) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?)`;

        queryString = mysql.format(queryString, [data.request, data.response, is_correct, data.source, JSON.stringify(data.products)]);
        console.log(queryString);
        let response = await connection.asyncQuery(queryString);
        return response;
    }
}

async function saveProductRequestAsync({ isCorrect, source, idSession, products, request, response }) {
    console.log("-----saveProductRequestAsync-----");

    const queryString = `INSERT INTO productRequests (request, response, is_correct, source, products, idSession) 
    VALUES(?,?,?,?,?,?)`;
    console.log(queryString);
    connection.asyncQuery(queryString,[
        request,
        response,
        isCorrect,
        source,
        JSON.stringify(products),
        idSession
    ]);

}

async function getAllProductRequest() {
    console.log("-----getAllProductRequest-----");
    let queryString = `SELECT * FROM productRequests order by id desc`;
    console.log(queryString);
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}

async function getProductRequestFilterBySource(source) {
    console.log("-----getProductRequestFilterBySource-----");

    let queryString = `SELECT * FROM productRequests WHERE source LIKE ? ORDER BY id desc`;
    console.log(queryString);
    queryString = mysql.format(queryString, [`%${source}%`]);
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    // result.forEach(element => {
    //     if (element.products !== null) {
    //         element.products = JSON.parse(element.products);
    //     }
    // });
    return result;
}

async function getAllProductRequest() {
    console.log("-----getAllProductRequest-----");
    let queryString = `SELECT * FROM productRequests order by id desc`;
    console.log(queryString);
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));

    // result.forEach(element => {
    //     if (element.products !== null) {
    //         element.products = JSON.parse((element.products));
    //     }
    // });
    return result;
}


async function updateProductRequestIsCorrect(id, isCorrect) {
    console.log("-----updateProductRequestIsCorrect-----");
    const is_correct = isCorrect == "true" ? 1 : 0;
    let queryString = `UPDATE productRequests SET is_correct = ? where id = ?`;
    console.log(queryString);
    queryString = mysql.format(queryString, [is_correct, id]);
    let result = await connection.asyncQuery(queryString);
    result = Object.values(JSON.parse(JSON.stringify(result)));
    return result;
}