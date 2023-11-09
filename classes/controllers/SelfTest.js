
const ChatGPT = require('../apis/ChatGPT.js');
let chat = new ChatGPT();
const CallSession = require('../controllers/CallSession.js');
const StoreMap = require('../controllers/StoreMap.js');
const FastFood = require('../controllers/FastFood.js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const storeMap = new StoreMap(chat);
const storeName = 'target';
storeMap.initStoreMap('../../data/stores/' + storeName + 'locations.json');

const { saveProductRequestAsync, updateProductRequestIsCorrect, getProductRequestFilterBySource, getAllProductRequest } = require('../../db/queries/productRequestQueries');

const fastFood = new FastFood();

const callSession = new CallSession();


function wait(delay) {
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    });
}

class GeneralTest {
    constructor(input, aiResponse, expected) {
        this.input = input;
        this.aiResponse = aiResponse;
        this.expected = expected;
    }

    async test() {
        const USER_DELIMITER = "¿¿¿¿¿";
        const AI_DELIMITER = "#####";

        const systemMsg =
            `
        You will evaluate the quality of an AI assistant.

        The user input will be delimited with ${USER_DELIMITER} characters.
        The AI response will be delimited with ${AI_DELIMITER} characters.

        Evaluate all the steps.
        ${this.expected}


        The output should be a JSON in the next format:
        \`\`\`
        {
            "response": $respose,
            "stepresult": [$stepresul]
            "veredict": $veredict,
            "explanation": $explanation
        }
        \`\`\`

        Where:
        - $response is the AI response.
        - $stepresult is an array with the explanation of each step.
        - $veredict is "PASS" or "FAIL".
        - $explanation is the explanation of why was that the veredict. What rules are passed or failed.

        Double check your veredict.

        Answer with a valid JSON.
        `;

        const query = `

        ${USER_DELIMITER}
        ${this.input}
        ${USER_DELIMITER}

        ${AI_DELIMITER}
        ${this.aiResponse}
        ${AI_DELIMITER}
        `;

        try {
            const result = await chat.runCompletion(query, systemMsg);
            return JSON.parse(result);
        } catch (err) {
            return {
                veredict: "ERROR",
                explanation: err.toString()
            }
        }
    }
}

class StoreSearchTest {
    constructor(input, expected) {
        this.input = input;
        this.expected = `
The AI will look for the product in the store, found and not found are valid results.

Follow these steps to determie if the test is passed or failed.

Step 1: Tell the products the customer wants.
Step 2: If the AI asks any question it fails the test. 
Step 3: If the AI can find the product and doesn't mention the aisle or section fails the test.
Step 4: If the AI can't find the product should mention it.
`;
        if (expected) {
            this.expected += `Step 5: Verify the answer considering that ${expected}".
            `;
            this.userExpected = expected;
        }
        
    }

    async evaluate(response) {
        this.test = new GeneralTest(this.input, response, this.expected);
        const testResult = await this.test.test();
        return testResult;
    }

    async runAndTest(testId) {
        const starTime = + new Date();
        const customerNumber = Math.floor(1000000000 + Math.random() * 9000000000);
        const storeNumber = process.env.TWILIO_STORE_NUMBER;
        const request = this.input;
        const source = testId;

        const sessionid = callSession.startSession(customerNumber, storeNumber);
        const querydict = await storeMap.generateQueryDict(request);
        const resultdict = await storeMap.processCustomerList(querydict);

        await storeMap.addStoreDescription(resultdict);
        callSession.addResults(customerNumber, resultdict);

        resultdict.storeurl = callSession.endSession(customerNumber);
        callSession.addSessionData(resultdict, sessionid);

        const endTime = + new Date();

        const testResult = await this.evaluate(resultdict.guideddescription);
        testResult.requestTime = endTime - starTime;
        testResult.expected = this.userExpected;
        resultdict.test = testResult;
        
        const isCorrect = (testResult.veredict === 'PASS') ? "1" : "0";
        saveProductRequestAsync({ request, response: resultdict.guideddescription, isCorrect, source, products: resultdict, idSession: sessionid });
        console.log(testResult);

        return resultdict;
    }


}

class TestGenerator {
    constructor(testId) {
        this.testId = testId;
    }
    async generate() {
        const delimiter = "######";
        const systemMsg = `
        You are a request generator.
        You will generate multiple text requests.
        Separate each individual request using ${delimiter} characters.
        `;

        const query = `
        
        A customer wants to know the availability and location of products in a Target store.
        Generate requests a customer would ask to a Target clerk.
        
        Generate 10 asking for one specific product mentioning the brand.
        Generate 10 asking for one product without mentining any brand.
        Generate 5 asking for products what most likely wouldn't be found in a target store.
        Generate 25 asking for 2 or more products, mix with brand and without brand.
        
        `;
        const result = await chat.runCompletion(query, systemMsg);

        const textrequests = result.split(delimiter);
        this.requests = [];
        for (const request of textrequests) {
            this.requests.push({
                text: request.trim(),
                expected: null
            })
        }
    }

    async fromFile(filename) {
        const readpromise = new Promise(resolve => {
            let queryList = [];
            const fileName = __dirname + '../../../data/' + filename;
            fs.createReadStream(fileName)
                .pipe(csv(['text','expected']))
                .on('data', (data) => {
                    queryList.push(data);
                })
                .on('end', () => {
                    console.log('#queries: ' + queryList.length);
                    resolve(queryList);
                });
        });
        this.requests = await readpromise;
    }

    async run() {
        const promises = [];
        const resjson = [];
        for (const request of this.requests) {
            const st = new StoreSearchTest(request.text, request.expected);
            await wait(1000);
            const promise = st.runAndTest(this.testId)
            promises.push(promise);
            promise.then(result => {
                resjson.push(result);
            });
        }
        await Promise.all(promises);
        return resjson;
    }

}


setTimeout(async () => {

    const tg = new TestGenerator('AUTOTEST-3');
  //  await tg.fromFile('queries_with_answer.csv');
    await tg.generate();
    tg.run();

}, 1000)

