const connection = require('../../db/mysqlConnection');

module.exports = {
    saveProductsAsync
};

async function saveProductsAsync(data) {

    try {
        console.log("-----saveProductRequestAsync-----");
        let query = `INSERT INTO products (sku, product, brand, categories, store, breadcrumb) VALUES `;
        let productInsert = '';
        data.forEach(element => {
            productInsert += `('${element.id}', '${element.productName}', '${element.brand}', '${element.categories}' , '${element.store}', '${element.breadcrumb}'),`;
        });

        //remove last coma
        productInsert = productInsert.slice(0, -1);
        var queryString = `${query} ${productInsert};`;
   
        let result = await connection.asyncQuery(queryString);
        result = Object.values(JSON.parse(JSON.stringify(result)));
        return result;
    } catch (error) {
        console.log(error);
        console.log("LAQUERY WEA: ", queryString);
    }

}