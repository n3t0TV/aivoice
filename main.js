const app =require('./classes/modules/ServerEndpoints.js');
const TwilioVoice = require('./classes/apis/TwilioVoice.js');
const StoreMap = require('./classes/controllers/StoreMap.js');
const FastFood = require('./classes/controllers/FastFood.js');


const fs = require('fs');
const path = require('path');
const csv = require('csv-parser')
const { resolve } = require('path');
const fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(fileUpload());

const projectDir = process.cwd();
const ChatGPT = require(projectDir + '/classes/apis/ChatGPT.js');
let chat = new ChatGPT();

const SmsSession = require('./classes/controllers/SmsSession.js');
const smsSession = new SmsSession();;

let storeMap = new StoreMap(chat);
const fastFood = new FastFood();
let GCloud = require(projectDir +'/classes/apis/GCloud.js');
let gc = new GCloud();


var storeName ='target';
storeMap.initStoreMap('/data/stores/'+storeName+'locations.json');
//storeMap.loadStoreInventory(storeName);

const CallSession = require('./classes/controllers/CallSession.js');
const callSession = new CallSession();
//const Crawler = require('./classes/controllers/Crawler.js');

const { getStore, getStores, createStore} = require('./db/queries/storeQueries');
const { saveProductRequestAsync, updateProductRequestIsCorrect, getProductRequestFilterBySource, getAllProductRequest} = require('./db/queries/productRequestQueries');



let twVoice = new TwilioVoice(callSession);
//let recDict={};

var bodyParser = require('body-parser');

// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

const session = require('express-session');
app.use(session({
  secret: '$YOUR_SESSION_SECRET_WORD',
  resave: false,
  saveUninitialized: true
}));

const validateSession = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    // User is authenticated and session is valid
    next(); // Proceed to the next middleware or route handler
  } else {
    // User is not authenticated or session has expired
    //res.redirect('/login');
    res.status(401).send('Unauthorized'); // Respond with 401 Unauthorized status
  }
};

async function searchProductList(customerNumber,storeNumber,question,source)
{
  //Start new session
  var sessionid=callSession.startSession(customerNumber,storeNumber);

  var querydict = await storeMap.generateQueryDict(question)
  var resultdict =  await storeMap.processCustomerList(querydict);

  //callSession.addProductList|(customerNumber,resultdict.products);
  //Wrap up session
  await storeMap.addStoreDescription(resultdict);
 
  callSession.addResults(customerNumber,resultdict);

  resultdict.storeurl=callSession.endSession(customerNumber);
  callSession.addSessionData(resultdict,sessionid);
  //console.log(colors.blue(resultdic||11111111111|t.guideddescription));
  // saveProductRequestAsync({ request: question, response: resultdict.guideddescription, is_correct: false, source:source  });
  console.log('Save products result:');
  //console.log({ request: question, response: resultdict.guideddescription, is_correct: false, source: source, products: resultdict });
  saveProductRequestAsync({ request: question, response: resultdict.guideddescription, isCorrect: 0, source: source, products: resultdict , idSession: sessionid});
 

  return resultdict;
}
app.get("/ask", validateSession, async function (req, res)
{
  var customerNumber = Math.floor(1000000000 + Math.random() * 9000000000);
  var storeNumber= process.env.TWILIO_STORE_NUMBER;
  var question =req.query.question;
  console.log('Retail speaker!!',question);


  if(question!==undefined && storeMap!==undefined)
  {
    var resultdict=await searchProductList(customerNumber,storeNumber,question,'webpage');
    //console.log(location);
    res.status(200).json({location:resultdict});
  }
  else
  {
    res.status(401).json({message: 'Operation failed to execute', status: 401});
  }
});

app.get("/sms-ask", validateSession, async function (req, res)
{
  var storeNumber= process.env.TWILIO_STORE_NUMBER;
  var question = req.query.question;
  var customerNumber = req.query.customerNumber;
  console.log('SMS',question);

  if(question!== undefined && storeMap!== undefined && customerNumber!== undefined )
  {
    if(!smsSession.SMS_ORDERS[customerNumber]){
      smsSession.startSmsSession({customerNumber: customerNumber, twilioNum: storeNumber});
    }

    const sms_order = smsSession.SMS_ORDERS[customerNumber];

    sms_order.conversation.push({
      role: "Customer",
      message: question
    })
    console.log('Input query:');  
    const result = await fastFood.inputQuery(sms_order);

    sms_order.conversation.push({
      role: "Wendy's employee",
      message: result.response
    });


    if(sms_order.finished)
    {
      smsSession.endSession(customerNumber);
      console.log('session finished');
    }
    res.status(200).json({location:result});
  }
  else
  {
    res.status(401).json({message: 'Operation failed to execute', status: 401});
  }
});




app.get("/eval", async function (req, res)
{
    console.log('Evaluating');
    console.log(req.query.evaluation);
    console.log(req.query.question);
    console.log(req.query.answer);

    // saveProductRequestAsync({ request: req.query.question, response: req.query.answer, is_correct: req.query.evaluation, source: 'webpage' });
});




app.post("/completed", async function (req, res)
{
    console.log("***Completed callback***");
  //This one uses twilio speech to text, not used
    //twVoice.processCallRequest(req,res,storeMap);
   

});

app.post("/listenproduct", async function (req, res)
{
  console.log("***Processing next product!***");
  
  setTimeout(()=>{
    twVoice.finishAddingProducts(req,res,storeMap);
  },1000);
  
  //twVoice.processCallerAudio(req,res,false);

});

app.post("/firstrecord", async function (req, res)
{
  console.log("***Processing next product!***");
  twVoice.processCallerAudio(req,res,true);
  
});


app.post("/voice", async function (req, res)
{
  console.log("***Incoming voice call!***");
  
  //console.log(req.body);
  var sessionid=callSession.startSession(req.body.From,req.body.Called);
  twVoice.processWelcome(req,res,sessionid);

  
  //twVoice.processIncomingCall(req,res);

});


app.post("/voicestatus", async function (req, res)
{
  console.log("***Voice status event! Call ended***");
  /*var url=callSession.endSession(req.body.From);
  if(url!==undefined)
  {
    var msg ="You can see your products in the store map here: "+url;
    //if(url.includes("dev"))
    //{
      twVoice.sendSMSMessage(req.body.From,msg);
    //}
  }*/
  /*const twiml = new twVoice.MessagingResponse();
  twiml.message();
  res.set('Content-Type', 'text/xml');
  res.send(twiml.toString());*/

  
  //console.log(req.body.From);
 
  //twVoice.processIncomingCall(req,res);

});

app.post('/process-record', (req, res) => {
  //const recordingUrl = req.query.RecordingUrl;

  //const audiourl = 'https://api.twilio.com/2010-04-01/Accounts/AC65694a9e8832269415b6c75ac825aca6/Recordings/RE431b50be7f47d565c6d7e5344fe07c7b';
  
  var numTries=0;
  if(req.query.numTries!==undefined)
  {
    
    numTries=parseInt(req.query.numTries);
  }

  twVoice.processSpeechResult(req,res,storeMap,numTries);
  //twVoice.processRecordedAudio(req,res, recordingUrl,storeMap); 
  // Aquí puedes descargar la grabación y almacenarla en tu sistema de archivos o en un servicio de almacenamiento en la nube.
});



app.post('/record', (req, res) => {
  const recordingUrl = req.body.RecordingUrl;

  //const audiourl = 'https://api.twilio.com/2010-04-01/Accounts/AC65694a9e8832269415b6c75ac825aca6/Recordings/RE431b50be7f47d565c6d7e5344fe07c7b';

  console.log('***Recorded call***')
  console.log(recordingUrl);
  setTimeout(()=>{
     //twVoice.confirmRecord(req,res,recordingUrl);
     twVoice.processRecordedAudio(req,res, recordingUrl);
  },1000);
 /* setTimeout(()=>{
    twVoice.processRecordedAudio(req,res, recordingUrl,storeMap);
  },1000);*/
 
  // Aquí puedes descargar la grabación y almacenarla en tu sistema de archivos o en un servicio de almacenamiento en la nube.

});


app.post('/sms', async (req, res) => {

  console.log('***SMS***');

  twVoice.processIncomingText(req,res,storeMap);


});

app.post('/record-result', (req, res) => {
  console.log('**Record result**');
  console.log(req.body.From);
  var numTries=0;
  if(req.query.numTries!==undefined)
  {
    
    numTries=parseInt(req.query.numTries);
  }

  twVoice.processRecordResult(req,res,numTries,storeMap);
});

app.get("/storemap", async function (req, res)
{
    console.log('Store map for session id:');
    console.log(req.query.id);

    var result = callSession.productFromId(req.query.id);
    console.log(result);
    res.send(result);

});

app.get("/storedata", async function (req, res)
{
    console.log('Store map for session id:');
    console.log(req.query.id);

    const result = {};
    result.sessionData = callSession.productFromId(req.query.id);
    console.log(result.sessionData);
    if(!result.sessionData.storelocation) return res.send(result);

    result.mapdata = JSON.parse(fs.readFileSync(path.resolve(`./data/maps/${result.sessionData.storelocation.store_id}.json`)));     //here we have to load the map of the current request.
    
    console.log(result);
    res.send(result);


});

function wait(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}

async function testQueryList(queryList,res)
{

  // deleteProductRequestTestData();
  console.log('****Testing csv queries**');
  var customerNumber= Math.floor(1000000000 + Math.random() * 9000000000);
  var storeNumber= process.env.TWILIO_STORE_NUMBER;
  var numbatch =20;
  var asyncFuncs=[];
  

  var resjson=[];
    //Start new session
  var testName='test-rc-1-5-3r';

  for(var i=0;i<queryList.length;i++)
  {

    var question = queryList[i];
    if(question!==undefined && question!=='')
    {
      
      const promise=new Promise(async resolve=>{
          let resultdict= await searchProductList(customerNumber,storeNumber,question,testName);
          resjson.push(resultdict);
          resolve();

       });

     
      asyncFuncs.push(promise);
      //ar resultdict=await searchProductList(customerNumber,storeNumber,question,testName);
      //resjson.push(resultdict);
 
      //duplicated
      //saveProductRequestAsync({ request: question, response: resultdict.guideddescription, is_correct: false, source: 'test', products : resultdict.products});
    }
    if((i%numbatch==0 && i>0) || i==(queryList.length-1))
    {
      console.log('**Finished batch: ',i);
      await Promise.all(asyncFuncs);
      await wait(5000);
      asyncFuncs=[];

    }
  }
  //Wrap up session
 
  //var order=callSession.orderList[sessionid];
     //Sections array file
  //let jsonStr = JSON.stringify(order,null,2);
  res.send(resjson);

  /*fs.writeFile(__dirname+'/front/public_html/json/testresults.json', jsonStr, (err) => {
      if (err) throw err;
      console.log('Json written to file');
      
  });*/
  
}
app.get("/runtest", async function (req, res)
{
  var queryList=[];
  const csvfile='queries2.csv';
  const fileName=__dirname+'/data/'+csvfile;
  fs.createReadStream(fileName)
  .pipe(csv())
  .on('data', (data) => {
      const query = data['Query'];
      //const section = data['Cookies'];
      queryList.push(query);

  })
  .on('end', () => {
      console.log('#queries: '+queryList.length);
     // console.log('#sections: '+sections.length);
    
      testQueryList(queryList,res);
      
  });    
});


app.get("/api/getStore", async function (req, res) {
  console.log('getStore: ', req.query.storeId);
  try {
      const foundStore = await getStore(req.query.storeId);
      console.log(foundStore);
      res.status(200).json(foundStore);
  } catch (error) {
      res.status(401).json({ message: 'Operation failed to execute', status: 401 });
  }
});

app.get("/api/getAllStores", async function (req, res) {
  console.log('getAllStores');
  try {
      const foundStores = await getStores();
      console.log(foundStores);
      res.status(200).json(foundStores);
  } catch (error) {
      console.log(error);
      res.status(401).json({ message: 'Operation failed to execute', status: 401 });
  }
});

app.post("/api/saveStore", validateSession, async function (req, res) {
  console.log('saveStore: ', req.body);
  try {
      await createStore(req.body);
      res.status(201).json({ message: 'store created', status: 201 });
  } catch (error) {
      res.status(401).json({ message: 'Operation failed to execute', status: 401 });
  }
});

app.get("/api/queries", validateSession, async function (req, res) {
  console.log('getAllStores');
  try {
      var foundQueries;
      if(req.query.source !== null && req.query.source !== undefined)
      {
          //filter table by source 
          foundQueries = await getProductRequestFilterBySource(req.query.source);
          console.log(foundQueries);
      }
      else
      {
          foundQueries = await getAllProductRequest();
          console.log(foundQueries);
      }
      res.status(200).json(foundQueries);
  } catch (error) {
    console.log(error);
      res.status(401).json({ message: 'Operation failed to execute', status: 401 });
  }
});

app.put("/api/isCorrect/:id", async function (req, res) {
  console.log('isCorrect: ', req.body);
  try {
      const id = req.params.id;
      await updateProductRequestIsCorrect(id, req.body.isCorrect);
      res.status(200).json({ message: 'productRequest updated', status: 200 });
  } catch (error) {
      res.status(401).json({ message: 'Operation failed to execute', status: 401 });
  }
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/front/public_html/login.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Perform authentication logic here
  // For simplicity, we'll assume the username is "admin" and the password is "password"

  if (username === 'software' && password === 'Tortoise2023.') {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    } else {
      res.redirect('/login');
    }
  });
});


