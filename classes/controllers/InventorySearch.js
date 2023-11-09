const fs = require('fs');
//const Fuse = require('fuse.js');
//const { NlpManager  } = require('node-nlp');
const projectDir = process.cwd();

//const Target = require(projectDir + '/classes/apis/Target.js');

//const {similarity} = require('@nlpjs/similarity');
const DatabaseSearch = require('../apis/DatabaseSearch');
const dbs = new DatabaseSearch();


class InventorySearch
{
    constructor(zipcode)
    {
        this.distThresh=1;
        //this.nlpmanager = new NlpManager({ languages: ['en'] });
        this.allBrands=[];
        this.allSections=[];
        //this.targetSearch = new Target(zipcode);
    }

    
    async evalProductDatabase(querydict)
    {
        var resultEntry= Object.assign({}, resultEntry, querydict);      
        if(querydict.queryproduct!==undefined && querydict.queryproduct!=='')
        {
            console.log('Searching for product...');
     
            const result = await dbs.search(querydict.queryproduct,querydict.querybrand);
            resultEntry.found = result;
        }
        else{
           
            resultEntry.found=[];
        }
        return resultEntry;
    }



}

module.exports =  InventorySearch;