import { StoreMap } from "../StoreMap/StoreMap.js";


class MapApp {

    constructor(request) {
        this.request = request;
    }

    async loadData() {
        const response = await fetch(`storedata?id=${this.request}`);
        const data = await response.json();
        this.sessionData = data.sessionData;
        this.storeId = this.sessionData.storelocation.store_id;
        this.mapdata = data.mapdata;
    }

    async ondocumentReady() {
        await this.loadData();
        this.generateMap();
    }

    generateMap() {
        this.storeMap = new StoreMap(this.storeId, this.mapdata);
        this.storeMap.render($('#map-container'));
        this.parseProducts();
        this.listProducts();
    }

    parseProducts() {
        this.queryproducts = {};
        this.productBySku = {};
        for (const product of this.sessionData.products) {
            this.queryproducts[product.queryproduct] = product;
            for (const foundProduct of product.found) {
                this.productBySku[foundProduct.inventorysku] = foundProduct;
            }
        }

        this.locations = {};
        for (const item of this.sessionData.items) {
            if (!item.sku) continue;

            const query = this.queryproducts[item.queryproduct];
            const product = this.productBySku[item.sku];
            if (
                (query.querytype == "nobrand" && item.veredict == "samekind") ||
                (query.querytype == "nonspecific" && item.veredict == "samekind") ||
                (query.querytype == "nonspecific" && item.veredict == "sameitem") ||
                (query.querytype == "specific" && item.veredict == "sameitem") ||
                (query.querytype == "nobrand" && item.veredict == "sameitem")  
                
            ) {
                if (!this.locations[product.storeaisle]) {
                    this.locations[product.storeaisle] = [];
                    this.storeMap.activate(product.storeaisle,this.scrollToAisle.bind(this,product.storeaisle));
                }


                this.locations[product.storeaisle].push({
                    queryproduct: item.queryproduct,
                    veredict: item.veredict,
                    querytype: query.querytype,
                    inventoryproduct: product.inventoryproduct,
                    imageUrl: product.imageUrl
                });
            } else {
                console.log(query.querytype, item.veredict)
            }

        }

        console.log(this.locations);

    }
    scrollToAisle(aisleId){

        const locationDiv = this.locationDivs[aisleId];
        const container = $('#result-container');
        const divOffset = locationDiv.offset().top;
        const containerOffset = container.offset().top;
      
      
        const relativePosition = divOffset - containerOffset;

        container.scrollTop(relativePosition);
    }
    listProducts() {
        this.locationDivs = {};

        for (const aisleId of Object.keys(this.locations)) {
            const location = this.locations[aisleId];
            const locationDiv = $('<div>').addClass('location-div').appendTo('#result-container');
            locationDiv.append(`<h2>${aisleId}</h2>`);
            locationDiv.click(()=>{
                this.storeMap.scrollTo(aisleId);
            });
            this.locationDivs[aisleId] = locationDiv;
            const productTable = $('<table>').addClass('product-table').appendTo(locationDiv);
            const body = $('<tbodyh>').appendTo(productTable);

            for(const product of location){
                const tr = $('<tr>').appendTo(body);
                const tdImg = $('<td>').addClass('td-img').appendTo(tr);
                const tdText = $('<td>').addClass('td-text').appendTo(tr);


                if(product.querytype === 'specific'){
                    tdImg.html(`<img src="${product.imageUrl}" class="product-img img-specific" alt="${product.inventoryproduct}">`);
                    tdText.html(`${product.inventoryproduct}`);
                }else{
                    tdImg.html(`<img src="${product.imageUrl}" class="product-img img-nonspecific" alt="${product.queryproduct}">`);
                    tdText.html(`Options for ${product.queryproduct}`);
                }

            }

        }
    }


    onresize() {
        this.storeMap.render($('#map-container'));
        console.log('resize');
    }

}

const request = window.location.hash.substring(1);
const mapApp = new MapApp(request);
window.mapApp = mapApp;//for debugging

$(document).ready(mapApp.ondocumentReady.bind(mapApp));
$(window).on('resize', mapApp.onresize.bind(mapApp));