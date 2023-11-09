const { saveOrderListAsync } = require('./../../db/queries/orderListQueries');


class CallSession
{
    constructor()
    {
        this.sessionDict={};
        
       // this.redisClient = redis.createClient();
        //(async () => { await this.redisClient.connect(); })();
        this.orderList={};
        //this.loadOrders();
       
    }

   
    

    generateToken() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let token = "";
        for (let i = 0; i < 6; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      }
      

    startSession(customerNumber,twilioNum)
    {
        console.log("Started: ",customerNumber);
        var token =this.generateToken();
        this.sessionDict[customerNumber]={status:"started",products:[],id:token,storeNumber:twilioNum};
        return token;
    }
    addSessionData(dict,id)
    {
        if(this.orderList[id]!==undefined)
        {
            dict.customerNumber=this.orderList[id].customerNumber;
            dict.storeNumber=this.orderList[id].storeNumber;
            dict.storeurl=this.orderList[id].storemap;
            dict.datetime=this.orderList[id].datetime;
            dict.sessionid=id;
        }
        else{
            console.log("Order id not found");
        }
    }

    endSession(customerNumber)
    {
        console.log("Ended: ",customerNumber);

        if(this.sessionDict[customerNumber]!==undefined)
        {
            this.sessionDict[customerNumber].status="ended";
            this.logProducts(customerNumber);
          
            let hostname = process.env.HOSTNAME || 'api.clerkgpt.com';

            let url=`https://${hostname}/storemap.html#${this.sessionDict[customerNumber].id}`;
            const currentDate = new Date();
            const day = String(currentDate.getDate()).padStart(2, '0');
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const year = String(currentDate.getFullYear());
            const hours = String(currentDate.getHours()).padStart(2, '0');
            const minutes = String(currentDate.getMinutes()).padStart(2, '0');
            const seconds = String(currentDate.getSeconds()).padStart(2, '0');

            const formattedDate = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
            const formattedDateMysql = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            // var arreglo = this.sessionDict[customerNumber].products;

            // for (var i = 0; i < arreglo.length; i++) {
            //     var objeto = arreglo[i];
                
            //     // Recorrer cada propiedad del objeto
            //     for (var propiedad in objeto) {
            //       if (objeto.hasOwnProperty(propiedad)) {
            //         // Verificar si el valor de la propiedad es una cadena
            //         if (typeof objeto[propiedad] === 'string') {
            //           // Reemplazar el carácter '"' por una cadena vacía
            //           objeto[propiedad] = objeto[propiedad].replace(/"/g, '');
            //         }
            //       }
            //     }
            //   }


            // let tmp = datetime.split("-");
            // datatime = tmp[1] + "-" + tmp[0] + "-" + tmp[2];

            this.orderList[this.sessionDict[customerNumber].id] = {
                idSession : this.sessionDict[customerNumber].id,
                customerNumber:customerNumber,
                storeNumber:this.sessionDict[customerNumber].storeNumber,
                storelocation:this.sessionDict[customerNumber].storelocation,
                items:this.sessionDict[customerNumber].items,
                // datetime:formattedDate,
                products: JSON.stringify(this.sessionDict[customerNumber].products).replace(/'/g, ''),
                storemap:url
            };
           // console.log(this.orderList);
            //this.saveOrderList();

            //saveOrderListAsync(this.orderList[this.sessionDict[customerNumber].id]);
    
            console.log('MAP URL: ',url);
            return url;
        }
        else
        {
            return undefined;
        }
        
    }
    addProduct(customerNumber,productEntry)
    {
        if(productEntry!==undefined && productEntry.inventorysku!==undefined && productEntry.inventorysku!==-1)
        {
            
            if(this.sessionDict[customerNumber]!==undefined && this.sessionDict[customerNumber].status=="started")
            {
                console.log('Adding product to num: ',customerNumber);
                this.sessionDict[customerNumber].products.push(productEntry);
            }
            else{
                console.log('Call is not started',customerNumber);
            }
        }
        else{
            console.log('Search didn;t return a specific product');
            this.sessionDict[customerNumber].products.push(productEntry);
        }
    }
    addProductList(customerNumber,productList)
    {
        if(productList!==undefined)
        {
            for(var i=0;i<productList.length;i++)
            {
                this.sessionDict[customerNumber].products.push(productList[i]);
            }
        }
        else{
            console.log('Unable to process product list');
        }
    }
    addResults(customerNumber,resultdict){
        console.log(this.sessionDict[customerNumber],resultdict)
        Object.assign(this.sessionDict[customerNumber],resultdict);
    }
    logProducts(customerNumber)
    {
        var products = this.sessionDict[customerNumber].products;
        if(products!==undefined)
        {
            console.log('Product summary:');
            for(var i=0;i<products.length;i++)
            {
                console.log(products[i]);
            }
        }
      
    }
    productFromId(id)
    {
        var response={};
        if(id!==undefined)
        {
            if(this.orderList[id]){
            response=this.orderList[id];
            }
        }

        return response;
    }

    productListFromKey(num)
    {
        if(this.sessionDict[num]!==undefined)
        {
            return this.sessionDict[num].products;
        }
        else{
            return [];
        }
    }
}

module.exports =  CallSession;