
const fs = require('fs');
const projectDir = process.cwd();
const ChatGPT = require(projectDir + '/classes/apis/ChatGPT.js');
let chat = new ChatGPT();

class FastFood{
    constructor(){

    }

    async inputQuery(sms_order){
        const result = await chat.wendys_input(sms_order);
        return result;
    }

    
}

module.exports = FastFood;