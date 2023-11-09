

const connection = require('../../db/mysqlConnection.js');
const ChatGPT = require('../apis/ChatGPT.js');
let chat = new ChatGPT();

const querylimit = 20;
const limit = 10;

class DatabaseGenerator {
    async generate() {
        let list = await this.getUntagged(limit*querylimit);
        console.log(list);
        while (list.length > 0) {

            const chunks = chunkArray(list,limit);
            const promises = [];
            for(const chunk of chunks){

                promises.push( new Promise(async (resolve) => {
                    const result = await chat.generator_tags_size(chunk);
                    for(const res of result){
                        let tags = res.tags;
                        if(res.legacyName){
                            tags+=`|${res.legacyName}`;
                        }
                        if(res.genericizedTrademark){
                            tags+=`|${res.genericizedTrademark}`;
                        }
                        if(isNaN(res.amount)){
                            res.amount = res.amount.replace(/[^0-9]/g,"");
                        }
                        try{
                        await connection.asyncQuery('UPDATE products SET `tags`=?, `pieces`=?,`amount`=?,`units`=?,`package`=?,`itemkind`=? WHERE sku=?', [tags,Number(res.pieces),Number(res.amount),res.units,res.package,res.itemkind,res.sku]);
                        }catch(e){
                            console.log(e,res);
                        }
                    }
                    setTimeout(() => {
                        resolve();
                    }, 1000); //cooldown.
                }));
                
                
            }

            await Promise.all(promises);
            
            //list = [];
            list = await this.getUntagged(limit*querylimit);
        }
    }

    async getUntagged(limit) {
        return await connection.asyncQuery('SELECT `sku`,`product`,`brand` FROM `products` WHERE amount IS NULL LIMIT ?', [limit]);

    }

} 

function chunkArray(array, chunkSize) {
    const chunks = [];
    let index = 0;
  
    while (index < array.length) {
      chunks.push(array.slice(index, index + chunkSize));
      index += chunkSize;
    }
  
    return chunks;
  }

const dbgen = new DatabaseGenerator();

dbgen.generate();

module.exports = dbgen;