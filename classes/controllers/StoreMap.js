
const fs = require('fs');
const CallSession = require('./CallSession');
const projectDir = process.cwd();
// const ChatGPT = require(projectDir + '/classes/apis/ChatGPT.js');
// let chat = new ChatGPT();

const InventorySearch = require(projectDir + '/classes/controllers/InventorySearch.js');
const { saveProductRequestAsync } = require('./../../db/queries/productRequestQueries');

const { getPlanogramProductBySku, getNeighborsByPosition } = require('./../../db/queries/planogramQueries');

class StoreMap {
    constructor(chat) {
        this.chat = chat;
        //this.invSearch=undefined;

    }

    initStoreMap(storeFile) {

        //this.loadStoreDescriptor(projectDir+storeFile);
        this.storelocation = {
            "address": "555 Showers Dr",
            "city": "Mountain View",
            "state": "California",
            "zipcode": "94040",
            "store_name": "Mountain View",
            "store_id": "322",
        };
        this.invSearch = new InventorySearch(this.storelocation.zipcode);
    }



    async generateQueryDict(question) {
        console.log(question)

        if (question !== undefined && question !== '') {
            let querylist = await this.chat.generateProductList(question, undefined)
            return querylist;
        }
        else {
            return undefined;
        }

    }

    async processCustomerList(querylist) {

        var resultEntry = {};
        var asyncFuncs = [];

        //querydict.question=question;
        console.log('Query list result:');
        console.log(querylist);

        if (this.invSearch !== undefined) {
            var productList = [];
            for (var i = 0; i < querylist.length; i++) {
                const promise = new Promise(async resolve => {
                    //const resultEntry = await this.invSearch.evalProductTarget(querylist[i]);
                    const resultEntry = await this.invSearch.evalProductDatabase(querylist[i]);


                    productList.push(resultEntry);
                    console.log(resultEntry);
                    resolve();

                });


                asyncFuncs.push(promise);
            }

            await Promise.all(asyncFuncs);


            resultEntry.products = productList;
            resultEntry.guideddescription = "";
            console.log("All products have been searched.");

        }

        return resultEntry;
    }



    getCustomerQuestions(dict) {
        var allquestions = ''
        if (dict.questions !== undefined) {
            for (var i = 0; i < dict.questions.length; i++) {
                allquestions += dict.questions[i] + '. ';
            }
        }

        return allquestions;
    }

    breadcrumbFromSku(found, sku) {

        for (var item of found) {
            if (String(item.inventorysku) == String(sku)) {
                return [item.inventorybreadcrumb, item.storeaisle];
            }
        }
        //Return 1st best match (suggested sku N/A or '')

        return ['', ''];

    }

    groupItemsBy(key, itemarray) {
        var groupdict = {}
        for (var item of itemarray) {
            var groupkey = item[key];
            if (groupdict[groupkey] == undefined)
                groupdict[groupkey] = [];
            groupdict[groupkey].push(item);
        }

        return groupdict;
    }

    async generateListedResult(dict) {
        var itemdesc = '';
        var querytype, querykind, productnumber, queryproduct = '';
        var itembreadcrumb = '', itemaisle = '';
        var itemresults = [], item;
        console.log('------------------------------------');

        for (var i in dict.products) {
            //clean all values
            itemdesc = '';
            querytype = '';
            querykind = '';
            productnumber = '';
            queryproduct = '';
            itembreadcrumb = '';
            itemaisle = '';
            item = undefined;
            queryproduct = dict.products[i].queryproduct;
            querytype = dict.products[i].querytype;
            querykind = dict.products[i].querykind;
            productnumber = dict.products[i].productnumber;
            console.log('# ', productnumber, ' ', queryproduct);

            //prodindex=parseInt(item.productnumber)
            for (var itemresult of dict.items) {

                if (String(itemresult.productnumber) == String(productnumber) && itemresult.veredict !== 'notfound') {
                    console.log('MATCH!!');
                    item = itemresult;
                    break;
                }
            }

            console.log('------------------------------------');
            // console.log(prodindex,dict.products[prodindex].querytype);
            dict.products[i].foundsku = '';
            if (item !== undefined) {


                console.log('Matched product querytype: ', querytype);

                var foundarray = dict.products[i].found;

                console.log('Found array: ',foundarray);
                console.log('Sku ',item.sku);
               
                [itembreadcrumb,itemaisle]=this.breadcrumbFromSku(foundarray,item.sku)
           
                if(querytype=='nobrand' || querytype=='nonspecific' || querytype==undefined)
                {
                    if(item.veredict=='notfound' || itembreadcrumb=='' || item.relevance<50)
                    {
                        itemdesc=`I couldn't find any ${item.queryproduct} in our store.`
                    }
                    else {
                        //Generic aisle/section description only not exact item match!
                        dict.products[i].foundsku = item.sku;
                        itemdesc = `I found ${queryproduct} in aisle ${itemaisle} in the ${itembreadcrumb} section.`;

                    }
                }
                else
                {
                    if(item.veredict=='notfound' || itembreadcrumb=='' || item.relevance<50)
                    {
                        itemdesc=`I couldn't find any ${queryproduct} in our store.`
                    }
                    else {
                        dict.products[i].foundsku = item.sku;
                        itemdesc = `I found ${queryproduct} in aisle ${itemaisle} in the ${itembreadcrumb} section `;
                        //Add planogram detailed sku information HERE!

                        const planogramProduct = await getPlanogramProductBySku({ storeId: 1, sku: item.sku });
                        console.log(planogramProduct);

                        if(planogramProduct !== undefined)
                        {
                            let shelfNumber = this.shelfNumberToPosition(planogramProduct.shelf);
                            itemdesc += `in the ${shelfNumber} shelf from top to bottom`;
                            itemresults.push({ storeaisle: itemaisle, breadcrumb: itembreadcrumb, queryproduct: queryproduct, itemdesc: itemdesc });
    
                        }
                        else
                        {
                            itemresults.push({ storeaisle: itemaisle, breadcrumb: itembreadcrumb, queryproduct: queryproduct, itemdesc: itemdesc });
                        }
                    }
                }
            }
            else {
                // itemdesc=`I couldn't process the request for ${dict.products[i].queryproduct}`;
                itemdesc = `I couldn't find any ${queryproduct} in our store.`
                itemresults.push({ storeaisle: itemaisle, breadcrumb: itembreadcrumb, queryproduct: queryproduct, itemdesc: itemdesc });
            }
        }

        var finalList = '';

        if (itemresults.length > 0) {

            var storedict = this.groupItemsBy('storeaisle', itemresults);
            for (var aisle of Object.keys(storedict)) {
                var aisleitems = storedict[aisle];
                var breadcrumbdict = this.groupItemsBy('breadcrumb', aisleitems);
                for (var section of Object.keys(breadcrumbdict)) {
                    var sectionitems = breadcrumbdict[section];
                    for (item of sectionitems) {
                        finalList += item.itemdesc + " ";
                    }
                }
            }
        }
        else {
            finalList = `I couldn't complete your request`;
        }

        return finalList;
        //Ordenar itemresults por (storeaise y breadcrumb)
    }

    shelfNumberToPosition(number) {
        const positions = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

        if (number >= 1 && number <= positions.length) {
            return positions[number - 1];
        }

        return "";
    }

    async addStoreDescription(dict) {
        console.log('Dict used for description: ');
        console.log(dict);
        dict.storelocation = this.storelocation;
        if (dict.guideddescription == undefined || dict.guideddescription == '') {
            const result = await this.chat.veredictAnalysis(dict.products);
            dict.items = result.items;
            dict.guideddescription = await this.generateListedResult(dict);
            // const result = await chat.fullResultAnalysis(dict.products);
            //sdict.guideddescription=result.desc;

        }

    }



}

module.exports = StoreMap;