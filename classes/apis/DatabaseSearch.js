
const connection = require('../../db/mysqlConnection');


class DatabaseSearch {

    async search(queryproduct, querybrand) {
        const store = 'TARGET';
        const products = [];
        let result, relevances;

        if (querybrand !== 'any') {
            result = await connection.asyncQuery(`
            SELECT sku, product, brand, section, tags, categories, category_id, aisle, breadcrumb, imageUrl,pieces,amount,units,package,itemkind,
            @rel1:=(MATCH (product) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel1,
            @rel2:=(MATCH (tags) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel2,
            @rel3:=(MATCH (breadcrumb) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel3,
            @rel4:=(MATCH (brand) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel4,
            (@rel1*2)+(@rel2*0.1)+(@rel3*0.1)+(@rel4*1.5) as relevance 
            FROM products
            WHERE store="${store}" AND MATCH (product,brand,tags,breadcrumb) AGAINST (? IN NATURAL LANGUAGE MODE)
            ORDER BY relevance DESC LIMIT 5`, [queryproduct, queryproduct, queryproduct, querybrand, queryproduct]);
        }
        else {
            result = await connection.asyncQuery(`
            SELECT sku, product, brand, section, tags, categories, category_id, aisle, breadcrumb, imageUrl,pieces,amount,units,package,itemkind,
            @rel1:=(MATCH (product) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel1,
            @rel2:=(MATCH (tags) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel2,
            @rel3:=(MATCH (breadcrumb) AGAINST (? IN NATURAL LANGUAGE MODE)) AS rel3,
            (@rel1*2)+(@rel2*0.7)+(@rel3*0.1)+(@rel4*0.2) as relevance 
            FROM products
            WHERE store="${store}" AND MATCH (product,tags,breadcrumb) AGAINST (? IN NATURAL LANGUAGE MODE)
            ORDER BY relevance DESC LIMIT 5`, [queryproduct, queryproduct, queryproduct, queryproduct]);

        }

        for (const res of result) {
            products.push({
                inventorysku: res.sku,
                inventorybrand: res.brand,
                inventoryproduct: res.product,
                inventorysection: res.section,
                storecategory: res.category_id,
                inventorybreadcrumb: res.breadcrumb,
                inventorycategorylist: res.categories,
                storeaisle: res.aisle,
                imageUrl: res.imageUrl,
                pieces :res.pieces,
                amount:res.amount,
                units:res.units,
                package:res.package,
                itemkind:res.itemkind,
                relevance: res.relevance,
                relevances : {
                    product: res.rel1,
                    tags: res.rel2,
                    breadcrumb: res.rel3,
                    brand: res.rel4 || 'N/A',
                }
            })
        }
        return products;


    }




}

module.exports = DatabaseSearch;