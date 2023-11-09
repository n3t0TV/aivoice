import { StoreMap } from "./StoreMap.js";

async function loadCSV(){
    const csv = await (await fetch('./aisles.csv')).text();
    window.csv = csv;
    const rows = csv.split("\n");
    for(const row of rows){
        const values = row.split("\t");
        if(data[values[1]])
        data[values[1]].section = values[2];
    }
}

async function loadLayout(){
    const response = await fetch('./testLayout.json');
    const data = await response.json(); 
    return data;
}

async function ondocumentReady(){

    const layout = await loadLayout();
    window.StoreMap = new StoreMap('mv',layout);
    window.StoreMap.render($('#map-container'));
}



$( document ).ready(ondocumentReady);

$(window).on('resize', () => {


});