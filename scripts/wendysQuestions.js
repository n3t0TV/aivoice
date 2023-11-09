const fs = require('fs');
var correctedPath = (__dirname + '/../classes/apis/ChatGPT.js').replace(/\\/g, '/'); //that's that
const ChatGPT = require(correctedPath);
let chat = new ChatGPT();

const jsonfile = '/wendysquestions.json';
const responseFile = 'wendysquestionsResponses.json';

function saveJsonFile(fileName, jsonObject) {
    //Sections array file
    let jsonStr = JSON.stringify(jsonObject, null, 2);

    fs.writeFile(fileName, jsonStr, (err) => {
        if (err) throw err;
        console.log('Json written to file');
    });
}

function processQuestions(questions) {
    let questionsResponse = [];

    questions.forEach(async (question, index) => {
        console.log("INDEX: ", index, "QUESTION: ", question.sentence);

        questionsResponse[index] = {
            input: question,
            output: null
        }

        let sentence = `a customer goes to wendy's and says: " ${question.sentence} ". extract the sentences and classify them in the next 4 categories:
            "menu": question about the menu.
            "order" requesting items.
            "end" :  is finishing the order.
            "other" : everything else.
            
            Return me the valid json in the next format: {"sentence" : the sentence that you recibe, "catergory" : the result category}.
        `

        let response = await chat.runCompletion(sentence);

        try {
            response = cleanJson(response);
            questionsResponse[index].output = JSON.parse(response);
            console.log(questionsResponse[index]);
        }
        catch (error) {
            questionsResponse[index].output = "error";
            console.log(error);
        }

    });

    var interval = setInterval(() => {
        let isFinished = questionsResponse.find(obj => obj.output === null);
        if (isFinished == undefined) {
            clearInterval(interval);
            saveJsonFile(__dirname + '/../data/stores/' + responseFile, questionsResponse);
        }
    }, 10000);
}

function cleanJson(json) {
    return json.substring(json.indexOf("{"), json.indexOf("}") + 1)
}


setTimeout(() => {
    //Process CSV and generate json file with product alt names and sections file
    //let data = fs.readFileSync(__dirname+'/../data/walmartproducts.json');
    //let inventory = JSON.parse(data);//Start with inventory in file

    //let inventory=[];//start with a clear inventory
    //processInventoryCSV(__dirname+'/../data/stores/'+csvfile,inventory);

    let data = fs.readFileSync(__dirname + '/../data/stores/' + jsonfile);
    let questions = JSON.parse(data);
    // processInventoryBrandsCSV(__dirname+'/../data/stores/walmartproducts.csv',inventory);
    processQuestions(questions);


}, 1000);

