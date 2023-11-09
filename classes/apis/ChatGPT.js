const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const csvtojson = require('csvtojson');
const { jsonrepair } = require('jsonrepair');
const { wendys, Order, wendysCommander } = require('../apis/Wendys.js');
const { Console } = require("console");
const { kill } = require("process");


class ChatGPT
{
    constructor()
    {
        console.log('Constructor chatgpt');
        this.ready=false;
        this.initAPI();
    }

    //Initialices API with keys
    initAPI() {
        const projectDir = process.cwd();
        console.log(projectDir);
        fs.readFile(projectDir + '/config/openapi.json', 'utf8', (err, data) => {
            if (err) {
                console.log(err.message);
                return;
            }
            let configJson = JSON.parse(data);
            this.apiKey = configJson.OPENAI_API_KEY;
            const configuration = new Configuration({
                apiKey: configJson.OPENAI_API_KEY,
                organization: configJson.OPENAI_ORGANIZATION_ID
            });
            this.openai = new OpenAIApi(configuration);
            this.ready=true;
            //console.log('Open AI ready!!');
        });
    }

    //Uses openai API to ask a question and receive a response
    async runCompletion(msg,system) {

        if(this.ready)
        {
            let completion, text;

            const keywordArray = [];

            const messages = [ { role: "user", content: msg }];
            if(system){
                messages.unshift({ role: "system", content: system });
            }
            console.log('mesages:',messages);
            completion = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages,
                temperature:0.2
            }).then((response) => {

                text = response.data.choices[0].message.content;

            })
                .catch(err => {
                    console.log(err.message);
                    text = "";
                });

            return text;
        }
        else{
            return "";
        }
    }

    //Uses openai API to ask a question and receive a response
    async runCompletionWithMessages(messages) {

        if(this.ready)
        {
            let completion, text;

            const keywordArray = [];

            completion = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages,
                temperature:0.2
            }).then((response) => {

                text = response.data.choices[0].message.content;

            })
                .catch(err => {
                    console.log(err.message);
                    text = "";
                });

            return text;
        }
        else{
            return "";
        }
    }

    removeDuplicatesByKey(arr, key) {
        const uniqueItems = {};
        console.log('---Cleaning duplicated query items---');
        arr.forEach(item => {
          const keyValue = item[key];
      
          if (!uniqueItems[keyValue]) {
            uniqueItems[keyValue] = item;
          }
        });
      
        return Object.values(uniqueItems);
      }

    async generateProductList(customerQuestion)
    {
        var querylist=[];
        if(customerQuestion!==undefined && customerQuestion!=="")
        {
            
            const system= ``;
            const sentence = 

            `
            This is a request that a customer makes to a clerk in a target store asking for items: 
            "${customerQuestion}"

            Classify the items in the following query types:
                "specific" - Specific item with brand.
                "nobrand" - Specific item with no brand
                "nonspecific" - Non specific item with no brand
                "N/A" - Not looking for an item

            Bring the result in a JSON array with the following structure 
            \`[{"item":item, queryproduct:"", querykind:"", "brand":brand,"category":category}]\` where:
                1. item: name of the item.
                2. queryproduct: the query to use in the database search, include brand.
                3. querykind: what kind of item is most likely the customer is looking for.
                4. brand: brand of the item, "any" if the customer is not specifing a brand
                3. querytype: specific, nobrand, nonspecific, N/A
                If the query has no items respond an empty array.
                
            Consider that: a legacy name or a genericized trademark should be considered the same as the official brand, correct it if needed.
            Do not add additional items, just what the customer is looking for. Return only a valid JSON.    
            `

            let answer = await this.runCompletion(sentence,system);

            console.log('--chat gpt result--');
            console.log('***GTP category ANSWER: '+answer+'***');

            try{
               
                if(answer!=='' && answer!==undefined)
                {

                    let parsedanswer = jsonrepair(answer.replace(/^\s*[^[]*/, "").trim());
                    console.log(parsedanswer);
                    var resultlist=JSON.parse(parsedanswer);
                    if(!Array.isArray(resultlist))
                    {
                        console.log('Not an array');
                        resultlist=[JSON.parse(parsedanswer)];
                    }
                    console.log('Array parsed!',resultlist);
                    for(var product of resultlist)
                    {
                        
                        if(product.item!=='N/A' && product.item!=='' &&  product.item!==undefined)
                        {
                            querylist.push({
                                item:(product.item || '').trim().replace(/['"]/g,""),
                                queryproduct:(product.queryproduct || '').trim().replace(/['"]/g,""),
                                querykind: (product.querykind || '').trim().replace(/['"]/g,""),
                                querytype:(product.querytype || '').trim().replace(/['"]/g,""),
                                querybrand:(product.brand || '').trim().replace(/['"]/g,""),
                                customerQuestion });

                        }
                        
                    }
                    querylist=this.removeDuplicatesByKey(querylist,'queryproduct');
                    if(querylist==null || querylist==undefined || querylist=='')
                        querylist=[];
                }
              
            }
            catch(err)
            {
                console.log(err);
                querylist=[];
            }
        }
        return querylist;
    }

    contieneCaracteresIngles(cadena) {
        const regex = /[\u0041-\u005A\u0061-\u007A]/;
        return regex.test(cadena);
    }

    async whisperFile(filePath) {

        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append("model", "whisper-1");
            formData.append("file", fs.createReadStream(filePath));
            //formData.append("language","english");

            axios.post("https://api.openai.com/v1/audio/transcriptions", formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    }
                })
                .then((response) => {

                    console.log(response.data);
                    if (this.contieneCaracteresIngles(response.data)) {
                        resolve(response.data);
                    }
                    else {
                        reject(new Error('Invalid foreign characters'));
                    }
                })
                .catch((error) => {
                    console.log(error);
                    reject(new Error('Unable to transcript'));
                });
        });
    }

    async anyBrandQuery(products){
        console.log('Any Brand product search...');
        const failvalue={items:[],skus:{}};
        const skus = {};
        let question = `
        A customer asked a clerk for: "${products[0].customerQuestion}"
        
        `;
        var options=['A','B','C','D','E'];
       
        for(const product of products){
            question +=`The clerk looked in the database for "${product.queryproduct}" and the result was the next table:
            \nproductnumber|option|queryproduct|querykind|databasesku|databaseproduct\n`
            
            var k=0;
            for(const item of product.found){
                question += `${product.productnumber}"|"${options[k]}"|"${product.item}"|"${product.querykind}"|"${item.inventorysku}"|"${item.inventoryproduct}"\n`
                skus[item.inventorysku] = item;
                failvalue.items.push({
                    queryproduct:product.item,
                    querykind: product.querykind,
                    veredict: "notfound",
                    explanation: "javascript veredict"
                });
                k++;
            }

            question += `
                Choose the best match for "${product.queryproduct}" considering the customer said: "${products[0].customerQuestion}".\n\n
            `;
           
       
        }


        if(Object.keys(skus).length < 1) return failvalue;

     question += `

        Ennumerate each product results in a CSV table with the next headers:
        "productnumber": product number
        "queryproduct":query field.
        "querykind": querykind field.
        "resultkind": item kind for the best match if it is "found".
        "sku":databasesku only if "veredict" is "found" or "N/A" if it is not found.
        "result":databaseproduct only if "veredict" is "found" or "N/A" if it is not found.
        "veredict": "samekind" or "notfound".
        "explanation": explain briefly the "veredict".
        
        Keep only the best match for each queryproduct. Only one per queryproduct.
        Set veredict to "notfound" if the best match item is clearly for a different use to the use requested by the customer

        "veredict" can be:
        1.- "samekind": the result is a valid option for what the client is looking for.
        2.- "notfound": the result is not a valid option for what the client is looking for.

      
        Only respond with the CSV:
        Separator: ,
        Escape: "
        Line: \\n
        `;

        console.log(question);
        const response = await this.runCompletion(question);
        console.log(response);
        try{
            const itemArray=await csvtojson().fromString(response);
            return{
                items:itemArray,
                skus
            };
        }
        catch(err)
        {
            return{
                items:[],
                skus
            }; 
        }
    }

    async brandedQuery(products){
        console.log('Branded product search...');
        const failvalue={items:[],skus:{}};
        const skus = {};
        let question = `
        A customer asked a clerk for: "${products[0].customerQuestion}"
        
        `;
        var options=['A','B','C','D','E'];
        
        for(const product of products){

            question += `
            A customer is searching for:"${product.queryproduct}" of  "${product.querybrand}" brand   which is a ${product.querykind}
            `;
            question +=`The clerk looked in the database and the results are in this table:
            \n productnumber|option|queryproduct|querybrand|querykind|databasesku|databaseproduct|databasebrand\n`
            var k=0;
            for(const item of product.found){
                question += `${product.productnumber}"|"${options[k]}"|"${product.item}"|"${product.querybrand}"|"${product.querykind}"|"${item.inventorysku}"|"${item.inventoryproduct}"|"${item.inventorybrand}"\n`
                skus[item.inventorysku] = item;
                failvalue.items.push({
                    queryproduct:product.item,
                    querybrand: product.querybrand,
                    veredict: "notfound",
                    explanation: "javascript veredict"
                });
                k++;
            }

            question += `
                 Choose the best match for "${product.queryproduct}" considering the customer said: "${products[0].customerQuestion}".\n\n
            `;
          
        }

        if(Object.keys(skus).length < 1) return failvalue;


     question += `

        Consider that: a legacy name or a genericized trademark should be considered the same as the official brand.
        
        Ennumerate each product results in a CSV table with the next headers:
        "productnumber": product number.
        "option": best match option or "N/A" if there aren't good matches.
        "queryproduct":query field.
        "querykind": querykind field.
        "querybrand": querybrand field.
        "resultbrand": databasebrand for the best match if it is "found" or "N/A" if it is not found.
        "sku":databasesku if it is "found" or "N/A" if it is not found.
        "result":databaseproduct if it is "found" or "N/A" if it is not found.
        "veredict": "sameitem" or "notfound".
        "explanation": explain briefly the "veredict".
        
        Keep only the best match for each queryproduct. Only one per queryproduct.
        Set veredict to "notfound" if the best match item is clearly for a different use to the use requested by the customer
        Set veredict to "notfound" if the item is from a different brand.
     
        A legacy name or a genericized trademark should be considered the same brand.
        The databasebrand must match the querybrand brand tolerant to minor grammatical differences.
        
    
        "veredict" can be:
        1.- "sameitem": the result is a valid option for what the client is looking for. 
        2.- "notfound": the result is not a valid option for what the client is looking for.
           

        Only respond with the CSV:
        Separator: ,
        Escape: "
        Line: \\n
        `;

        /*
        1.- "sameitem": Same product name and same brand. 
        2.- "notfound": Different product name or different brand. 
        */
        //Agregar item kind para la comparacion (retomar tres casos exact match, same kind y not found)
        //Usar letras A B C D E para match de found con item

        console.log(question);
        const response = await this.runCompletion(question);
        console.log(response);

        try{
            const itemArray=await csvtojson().fromString(response);
            return{
                items:itemArray,
                skus
            };
        }
        catch(err)
        {
            return{
                items:[],
                skus
            }; 
        }

    }

    async veredictAnalysis(products){
        if(products.length < 1)  return {
            desc: "I couldn't complete your request",
            items: []
        }

        
        let answer, foundProducts = 0;
        let items = [];
        const skus = {};
        let anybrandProducts = [];
        let brandedProducts = [];

        var productnumber=1;
        for(const product of products){
            product.productnumber=productnumber;
            if(product.querybrand === 'any'){
                anybrandProducts.push(product);
            }else{
                brandedProducts.push(product);
            }
            productnumber++;
        }   
        
        console.log("any brand:", anybrandProducts.length);
        console.log("branded:", brandedProducts.length);
        var asyncFuncs=[]

        if(anybrandProducts.length > 0){
            const promise=new Promise(async resolve=>{
                    const anybrandResult =  await this.anyBrandQuery(anybrandProducts);
                    items.push(...anybrandResult.items);
                    Object.assign(skus,anybrandResult.skus);
                    resolve();
            });
            asyncFuncs.push(promise);
          
        }

        if(brandedProducts.length > 0){
            const promise=new Promise(async resolve=>{
                const brandedResult = await this.brandedQuery(brandedProducts);
                items.push(...brandedResult.items);
                Object.assign(skus,brandedResult.skus);
                resolve();
            });
            asyncFuncs.push(promise);
        }

        if(!items){
            return {
                desc: "An error has occurred",
                items: []
            };
        }
        await Promise.all(asyncFuncs);

        if(products.length == 1)//Make sure all results point to the only product (chatgpt sometimes changes this to secuential numbers if only 1 product)
        {
            for(var itemresult of items)
            {
                itemresult.productnumber=1;
            }
        } 

        return {
            desc: "Items were found",
            items: items
        };

    }


    /*async fullResultAnalysis(products,items){
       
       
        ///---------------------------------------------------------------------- second query 

        let wantedList = '';
        for(const product of products){
            wantedList += `${product.queryproduct}, `;
        }


        const items_brief = items.map(obj => ({ ...obj }));
        for(const item of items_brief){
            delete item.explanation;
            delete item.found;
            delete item.comparison;
            if(skus[item.sku] && item.sku){
                item.aisle = skus[item.sku].storeaisle;
                item.breadcrumb = skus[item.sku].inventorybreadcrumb
            }
            if(item.veredict !=="sameitem" && item.veredict !=="samekind"){
                delete item.sku;
                delete item.result;
                delete item.resultkind;
                delete item.brand;
                delete item.brandcomparison;
            }
            if(item.querybrand =="any" || !item.querybrand ){
                delete item.resultkind;
                delete item.brand;
                delete item.result;
                delete item.brandcomparison;
            }
            if(item.veredict =="notfound"){
                delete item.resultkind;
                delete item.brand;
                delete item.brandcomparison;
            }
        }

        const question = `

        A customer asked a clerk: "${products[0].customerQuestion}"

        The clerk looked for the wanted items in the AI powered database:
        ${wantedList}
        
        This were the best results:

        \`\`\`
            ${JSON.stringify(items_brief)}
        \`\`\`

        
        Make a sentence in first person singular describing the location for each wanted item: "${wantedList}".

        Follow all the next rules:
        1. Honor the database veredict "sameitem", "samekind", "notfound".
        3. Don't list all the result items.
        4. Do not include size or weight information. 
        5. If the customer wants an specific brand don't offer them another brand.
        6. If the customer didn't ask for an specific brand DONT't list the options, just say that there are options.
        7. Don't offer further assistance.
        8. Respond in first person singular.

        Consider the customer might used a legacy name or a genericized trademark feel free to correct it.
        Don't ask questions. Don't offer further assistance.

        `;
        console.log(question);
        answer = await this.runCompletion(question);
        return {
            desc: answer,
            items
        };
    }*/
    async wendysOrderToHumanScript(orderJson)
    {
        let sentence = `you are Wendy from Wendy's, take this json and convert it in a human order confirmation script including the total amount and without say the ids:
         "${orderJson}".`;

        let answer = await this.runCompletion(sentence);
        return answer;
    }

    async wendys_input(sms_order)
    {
        const performance = [];

        let conversationText = '' ;
        for(const message of sms_order.conversation){
            conversationText += `\n${message.role}: "${message.message}" \n`;
        }

        const fullSummary = JSON.parse(jsonrepair(await this.wendys_conversation_summary(conversationText,performance)));
        
        let apiInfo = '';
        
        if(fullSummary.questionsAboutMenu && fullSummary.inquiry.length > 0){
            apiInfo += await this.wendys_lookup(fullSummary.inquiry,performance);
        }
        
        if(fullSummary.order.length > 0 && (fullSummary.isClosed || fullSummary.questionsAboutOrder)){
            const order = await this.wendys_order(fullSummary.order,performance);
            sms_order.order = order;
        }else{
            sms_order.order = new Order(wendys);
        }
        

        let result = await this.wendys_output(fullSummary, conversationText,apiInfo,sms_order,performance);
  
        sms_order.finished = fullSummary.isClosed;
  
        result.summary = fullSummary;
        result.performance = performance;
        result.totalTime = 0;
        for(const perf of performance){
            result.totalTime += perf.duration/1000;
        }
      
        return result;
    }

    async wendys_lookup(items,performance){
        let query = `=
        
        We want to get information of the next items:
        ${items.join(', ')}

        Create a CSV with the required items:
        \`\`\`
        itemId|itemName
        \`\`\`
        No headers
        Separator: |
        Linebreak: \\n

        Answer only with a valid CSV.
        .`;

        const messages = [        
            { role: "user", content: `This is Wendy's Combos menu:\n${wendys.listMenuCSV()}` },
            { role: "user", content: `This are sides and drinks options:\n${wendys.listSidesAndDrinksCSV()}` },
            { role: "user", content: query }
        ];
    // console.log(messages);
        console.log(query);
        const startTime = process.hrtime();
        let answer = await this.runCompletionWithMessages(messages);
        const endTime = process.hrtime(startTime);
        performance.push({
            query: 'item lookup',
            duration: endTime[0] * 1000 + endTime[1] / 1000000
        });

        const lookupItems = await csvtojson({
            delimiter:'|',
            noheader: false,
            headers: ['itemId','itemName']
        }).fromString(answer);
        console.log(lookupItems);
        let result = '';
        const withDescription = lookupItems.length <= 4;
        for(const lookupItem of lookupItems){
            result += wendys.getInfoGPT(lookupItem.itemId,withDescription);
        }
        return result;
    }

    
    async wendys_order(items,performance){
        let query = `=
        
        Create a CSV asking for the next Wendy's items:
        ${items.join(', ')}

        Make the CSV in this format:
        \`\`\`
        itemType|itemName|itemId
        \`\`\`
        No headers
        Separator: |
        Linebreak: \\n

        itemType can be "combo", "side", "drink" or "clarification"
        If you are not sure what exact item the customer wants use "clarification".

        Answer only with a valid CSV.
        .`;

        const messages = [        
            { role: "user", content: `This is Wendy's Combos menu:\n${wendys.listMenuCSV()}` },
            { role: "user", content: `This are sides and drinks options:\n${wendys.listSidesAndDrinksCSV()}` },
            { role: "user", content: query }
        ];

        console.log(query);
        const startTime = process.hrtime();
        let answer = await this.runCompletionWithMessages(messages);
        const endTime = process.hrtime(startTime);
        performance.push({
            query: 'add to order',
            duration: endTime[0] * 1000 + endTime[1] / 1000000
        });

        const orderItems = await csvtojson({
            delimiter:'|',
            noheader: true,
            headers: ['itemType','itemName','itemId']
        }).fromString(answer);
        console.log('order items',orderItems);
        const order = new Order(wendys);
        order.clarifications = [];
        for(const item of orderItems){
            switch(item.itemType){
                case 'combo':
                    order.addCombo(item.itemId);
                    break;
                case 'side':
                    order.addSide(item.itemId);
                    break;
                case 'drink':
                    order.addDrink(item.itemId);
                    break;      
                case 'clarification':
                    order.clarifications.push(item.itemName)
                    break;
            }
        }
        return order;
    }


    async wendys_conversation_summary(conversationText,performance){
        
        console.log('get conversation summary');

        const query = `
            This is a SMS conversation between a customer and a Wendy's employee:
            \`\`\`
            ${conversationText}
            \`\`\`
            
            Make a json with the following structure:
            \`\`\`
            {"
                "inquiry": [], // specifc items the customer wants to know more information in the last message, do not add kind of items just specific.
                "order": [], // item list with only confirmed items, if the customer wants more than one of one item, repeat that item.
                "questionsAboutMenu": questionsAboutMenu, // true or false, if the customer has questions about menu in the last message.
                "questionsAboutOrder": questionsAboutOrder, // true or false, if the customer has questions about current order in the last message.
                "isClosed": isClosed // true or false, if the customer confirmed that it is the complete order.
            }
            \`\`\`
            Respond only a valid JSON, there could  be empty arrays.
            `;
        const startTime = process.hrtime();
        const answer = await this.runCompletion(query);
        const endTime = process.hrtime(startTime);
        performance.push({
            query: 'summary',
            duration: endTime[0] * 1000 + endTime[1] / 1000000
        })
        return answer;
    }

    async wendys_output(fullSummary, converstaionText,apiInfo, sms_order,performance)
    {
        const orderExport = sms_order.order.export()
        
        let query = `
            You are Wendy's employee.
            This a SMS conversation between a customer and a Wendy's ordering service: 
            \`\`\`
            ${converstaionText}
            \`\`\`

            Respond the last message. Use provided information, do not use placeholders. Do not send links.
            Do not make up data you don't have. Don't list more than 7 options, if necessary, ask the customer to specify their request. 
         .`;

         if(orderExport.length > 0){
            query +=`
            This is the current order registered in the system.:
            \`\`\`
            ${JSON.stringify(orderExport)}
            \`\`\`
            `
         }

         if(sms_order.order.clarifications && sms_order.order.clarifications.length > 0 ){
            query +=`
            You need to ask the costumer details about the next products so you can give a proper answer:
            \`\`\`
            ${sms_order.order.clarifications.join(', ')}
            \`\`\`
            `;
         }

         if(fullSummary.isClosed){
            query +=`
                The customer said that's it, say the total and thank the customer. Do not offer further assistance.
            `;
         }else{
            query +=`
            Offer further assistance.
            `;
         }

         if(apiInfo.length > 0){
            query +=`
            This information could be useful to generate the response:
            \`\`\`
            ${apiInfo}
            \`\`\`
            .`;
         }

         const messages = [];
         if(fullSummary.questionsAboutMenu || fullSummary.questionsAboutOrder){
            messages.push( { role: "user", content: `This is Wendy's Combos menu:\n${wendys.listMenuCSV()}` }),
            messages.push( { role: "user", content: `This are sides and drinks options:\n${wendys.listSidesAndDrinksCSV()}` })
         }
         messages.push({ role: "user", content: query });
        //console.log(messages);
        console.log(query);
        const startTime = process.hrtime();
        let answer = await this.runCompletionWithMessages(messages);
        const endTime = process.hrtime(startTime);
        performance.push({
            query: 'output',
            duration: endTime[0] * 1000 + endTime[1] / 1000000
        })

        console.log("*** CHAT GPT *** --- Wendy's output");
        
        let result  = {};
        try{    
            result.response = answer.replace(/Wendy's Employee:/ig,'').replace(/Wendy's Ordering Service:/ig,'').replace(/(^"|"$)/g, '');
            result.conversation = sms_order.conversation;
            result.order = sms_order.order.export();
        }catch(e){
            console.log(e,answer);
        }
        
        return result;
    }

    async generator_tags_size(list){

        let productlist = 'sku;product;brand';
        for(const row of list){
            productlist+=`\n${row.sku};"${row.product}";"${row.brand}"`;
        }


        let query = `
        This is a supermarket products list.
        \`\`\`
        ${productlist}
        \`\`\`

        Per each product:

        Step 0:{delimiter}
        If you know the brand changed its name get the legacy name:<Uncle Ben's for Ben's Original>.
        Determine if there are genericized trademarks:<Coke for Coca Cola>.

        Step 1:{delimiter}
        Generate 10 tags, use | as separator. 
        The tags must include what a common user would use to look for that product.

        Step 3:{delimiter}
        Extract the pieces count, pieces:<pcs>, count:<ct> or pack:<pk> 
        If it is not a pack with multiple pieces use 1.

        Step 4:{delimiter}
        Extract the amount and units for size:<inches,feet,L,M,S>, volume:<oz,fl oz,gal,L> or weight:<oz,lbs,kg>.
        Do not multiply or divide, use the values mentioned.
        If there are not amount or units use 1 and the item name
        
        Step 5:{delimiter}
        Get the type of package:<bag,box,bottle,can> if is not explicit keep it blank.

        Step 6:{delimiter}
        For itemkind say what kind of item is most likely looking for a customer that wants that product.

   
        Step 7:{delimiter}
        create a CSV table with this columns:
        \`\`\`
        sku;product;legacyName;genericizedTrademark;tags;pieces;amount;units;package;itemkind
        \`\`\`

        Step 8:{delimiter} 
        Include headers
        quote: "
        Delimiter: ;
        Linebreak: \\n

        Step 9:{delimiter}
        Use only numbers for pieces
        Use only number for amount
        Do not abreviate the units
        

        Step 10:{delimiter}
        Answer only a valid CSV.
        `;
       // console.log(query);
        console.log('Generating with GPT --------***---***---');
        let answer = await this.runCompletion(query);


        const resultJSON = await csvtojson({
            delimiter:';',
            noheader: false,
            headers: ['sku','product','legacyName','genericizedTrademark','tags','pieces','amount','units','package','itemkind']
        }).fromString(answer);

        console.log(resultJSON);
        return resultJSON;
    }

}

module.exports = ChatGPT;





