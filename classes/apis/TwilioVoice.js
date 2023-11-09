
const fs = require('fs');
const axios = require('axios');


const path = require('path');
const projectDir = process.cwd();
const TWILIO_PATH = path.join(projectDir, '/config/twilioapi.json');
const ChatGPT = require(projectDir + '/classes/apis/ChatGPT.js');
let chat = new ChatGPT();
//const Listnr = require("./Listnr");
const { saveProductRequestAsync } = require('./../../db/queries/productRequestQueries');
//let listnr = new Listnr();
console.log(process.env);
let PORT = process.env.APP_PORT;
let hostname = process.env.HOSTNAME;

const mp3Path = 'https://'+hostname+':'+PORT+'/mp3/';
console.log('MP3 PATH',mp3Path);
let GCloud = require(projectDir +'/classes/apis/GCloud.js');
let gc = new GCloud();



class TwilioVoice {
    constructor(callSession) {
        console.log("Twilio voice!")
        this.init();
        this.callSession=callSession;
        this.voice='Elly';
        this.recDict={}
        
        //this.AccessToken = require('twilio').jwt.AccessToken;
    }

    init() {
        this.VoiceResponse = require('twilio').twiml.VoiceResponse;
        this.MessagingResponse = require('twilio').twiml.MessagingResponse;
        this.AccessToken = require('twilio').jwt.AccessToken;
        this.getTwilioToken();
        //this.sendSMSMessage(+525558059015,"Server starting!")

    }

    readConfigFile() {
        let jsonString = fs.readFileSync(TWILIO_PATH);
        let twapi = JSON.parse(jsonString);
        //console.log(twapi);
        return twapi;
    }

    getTwilioToken() {
        const twapi = this.readConfigFile();

        if (twapi !== undefined) {

            const token = new this.AccessToken(
                twapi.accountSid,
                twapi.apiKey,
                twapi.apiSecret,
                { identity: "clerkgpt" }
            );

            this.account_sid = twapi.accountSid;
            this.auth_token = token.toJwt();
            this.tw_token = twapi.authToken;
        }
        else {
            console.log('Unable to get twapi credentials!');

        }
    }
    validToken() {
        if (this.account_sid !== undefined && this.auth_token !== undefined)
            return true;
        else
            return false;
    }

    async processWelcome(req, res,sessionid) {
        const twiml = new this.VoiceResponse();
       //// twiml.play(mp3Path+this.voice+'/hello.mp3');
        
        twiml.play(mp3Path+this.voice+"/"+"listquestion_target.mp3");

        /*setTimeout(()=>
        {
            twiml.play(audio);
        },100);*/
        
        //twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Hi! My name is Ellie. I am your personalized smart store assistant.');
        const customerNumber=req.body.From;
        this.recDict[customerNumber] = { status: "startedsearch" ,products:[],finish:false,asyncFuncs:[],questions:[],speechtotext:null,sessionid:sessionid};
   
        twiml.redirect('/firstrecord');
        res.type('text/xml');
        res.send(twiml.toString());
    }
    confirmRecord(req,res,recordingUrl)
    {
        const twiml = new this.VoiceResponse();
        //twiml.say({ voice: 'Polly.Joanna-Neural' }, 'One moment!');
        twiml.play(mp3Path+this.voice+"/"+"onemoment.mp3");
       // twiml.play(mp3Path+this.voice+'/onemoment.mp3');
        
        twiml.redirect('/process-record?RecordingUrl='+recordingUrl);
        res.type('text/xml');
        res.send(twiml.toString());
    }

    //twilio record starts
    processCallerAudio(req, res, first) {
        const twiml = new this.VoiceResponse();

        //if(!first)
          //   twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Anything else?');
           // twiml.play(mp3Path+this.voice+'/anythingelse.mp3');
       // else
           //twiml.play(mp3Path+this.voice+'/listquestion.mp3');
        //twiml.say({ voice: 'Polly.Joanna-Neural' }, "what are you looking for?, name your list of products and press pound when finished");
        twiml.record({
            fileType: 'wav',
            action: '/record', // This is the URL that Twilio will send the recording to when it's finished
            method: 'POST',
            maxLength: 3600,
            finishOnKey: '#',
            timeout: 0, 
            trim: 'do-not-trim'
            //trim: 'trim-silence'
        });

        res.type('text/xml');
        res.send(twiml.toString());
    }
    

    //Text message
    async processIncomingText(req, res, storeMap) {
        console.log(req.body);
        const twiml = new this.MessagingResponse();

        const customerNumber=req.body.From;
        const storeNumber =req.body.To;
        const { Body, From } = req.body;

        let question = Body;
        console.log("question");
        console.log(question);
        if (question !== undefined) {

              //Start new session
            var sessionid=this.callSession.startSession(customerNumber,storeNumber);
            let resultdict=await storeMap.processOrder(question);
            //this.callSession.addProductList(customerNumber,resultdict.products);
            //Wrap up session
            await storeMap.addStoreDescription(resultdict);
            this.callSession.addResults(customerNumber,resultdict);
            console.log('Responding question!');
            console.log(resultdict.guideddescription);
            //twiml.message(resultdict.guideddescription);
            

            resultdict.storeurl=this.callSession.endSession(customerNumber);
           //var msg =" You can see your products in the store map here: "+ resultdict.storeurl;
            this.sendSMSMessage(customerNumber,resultdict.guideddescription);
            this.callSession.addSessionData(resultdict,sessionid);
            //console.log(colors.blue(resultdict.guideddescription));
            saveProductRequestAsync({ request: question, response:resultdict.guideddescription, isCorrect: 0, source: 'sms', products : resultdict, idSession: sessionid});
            

            //const resultdict = await storeMap.processCustomerRequest(question, 'sms');
           

           

        }
        else {
            console.log('Empty or not readable SMS body');
        }

        res.set('Content-Type', 'text/xml');
        res.send(twiml.toString());
        //res.type('text/xml').send(twiml.toString());
    }

    //After one moment check for results
    async processRecordResult(req, res,numTries,storeMap) {
        const twiml = new this.VoiceResponse();
        //onst rid = req.query.rid
        const customerNumber=req.body.From;

        console.log('***Check processing result***' + customerNumber,'#tries ',numTries);

        if (this.recDict[customerNumber] !== undefined) {
           
            if(this.recDict[customerNumber].finish==true)
            {
            //if (this.recDict[customerNumber].status=="finishedsearch") {
                console.log('**Ready!!**');
                console.log('Current dict:');
                console.log(this.recDict[customerNumber]);
                //twiml.say(recDict[rid].location);
                try{
                        
                    var questions=storeMap.getCustomerQuestions(this.recDict[customerNumber]);
                         
                    console.log('Finished adding store description'); 
                    if(this.recDict[customerNumber].guideddescription!==undefined && this.recDict[customerNumber].guideddescription!=='')
                    {
                       
                            const audioname = await gc.generateAudioFromText(this.recDict[customerNumber].guideddescription);
                            twiml.play(mp3Path+this.voice+'/'+audioname);

                            
                            //twiml.pause({length: 0.5});
                           // twiml.say({ voice: 'Polly.Joanna-Neural'},this.recDict[customerNumber].guideddescription);
                             this.recDict[customerNumber].storeurl=this.callSession.endSession(customerNumber);
                             this.callSession.addSessionData(this.recDict[customerNumber],this.recDict[customerNumber].sessionid);
                             //if(url!==undefined)
                             //{
                            if( this.recDict[customerNumber].items!==undefined && this.recDict[customerNumber].items.length>0 )
                            {
                               // var msg ="You can see your products in the store map here: "+ this.recDict[customerNumber].storeurl;
                                this.sendSMSMessage(customerNumber,this.recDict[customerNumber].guideddescription.replace(/[^a-zA-Z0-9\s]/g, ' '));
                                twiml.play(mp3Path+this.voice+'/'+'textmessage.mp3');
                            }
                             //}
                 

                    }
                    else{
                        console.log('***invalid guided description***');
                        twiml.play(mp3Path+this.voice+"/"+"searcherror.mp3");
                        //twiml.say({ voice: 'Polly.Joanna-Neural' },"I couldnt' find any items in the store");
                    }
                    
                // twiml.say({ voice: 'Polly.Joanna-Neural',speed:'' },this.recDict[customerNumber].guideddescription);
                    //twiml.play(mp3Path+this.voice+'/textmessage.mp3');
                  
                // }
                   //let prods=this.recDict[customerNumber].product
                    
                    saveProductRequestAsync({ request: questions, response:this.recDict[customerNumber].guideddescription, isCorrect: 0, source: 'call', products : this.recDict[customerNumber] , idSession: this.recDict[customerNumber].sessionid});
                    
                    //saveProductRequestAsync({ request: questions, response:this.recDict[customerNumber].guideddescription, is_correct: false, source: 'call' });
                    
                    //twiml.say({ voice: 'Polly.Joanna-Neural' },"Goodbye!");
                    twiml.play(mp3Path+this.voice+'/'+'goodbye.mp3');
                    twiml.hangup();
                    res.type('text/xml');
                    res.send(twiml.toString());
                }
                catch(error)
                {
                    console.log('**Error preparing response**');
                    twiml.play(mp3Path+this.voice+"/"+"searcherror.mp3");
                    //twiml.say({ voice: 'Polly.Joanna-Neural' },"I couldnt' find any items in the store. Goodbye!");
                    console.log(error);
                    res.type('text/xml');
                    res.send(twiml.toString());
                }
    
            }
            else {//Still processing results
                console.log('Not ready! ',numTries);
                //twiml.play(mp3Path+this.voice+'/onemoment.mp3');
                 
                if(numTries%10==0 && numTries>0)//Prevent timeout error
                {
                    //twiml.say({ voice: 'Polly.Joanna-Neural' }, 'please wait');
                    
                    twiml.play(mp3Path+this.voice+'/'+'pleasewait.mp3');
                }

                if(numTries==40)//secs max to wait for search
                {
                    //twiml.say({ voice: 'Polly.Joanna-Neural' },"Sorry, I couldn't complete the search");
                    twiml.play(mp3Path+this.voice+'/'+'speecherror.mp3');
                    //twiml.redirect('/listenproduct');
                    twiml.hangup();
                    res.type('text/xml');
                    res.send(twiml.toString());
                }
                else{              
                    setTimeout(()=>
                    {
                        twiml.redirect('/record-result?numTries='+(numTries+1));
                        //twiml.redirect('/record-result');
                        res.type('text/xml');
                        res.send(twiml.toString());
                    },1000);
                }

            }
        }
        else {
            console.log('Key not found in recdic already removed!');
            twiml.redirect('/listenproduct');
            res.type('text/xml');
            res.send(twiml.toString());
        }



    }

    async executeSearch(customerNumber,querydict,storeMap)
    {
        var resultdict = await storeMap.processCustomerList(querydict);
     
        for(var i=0;i<resultdict.products.length;i++)
        {
            this.recDict[customerNumber].products.push(resultdict.products[i]);
            
            
        }
    }

    finishAddingProducts(req,res,storeMap)
    {
        const twiml = new this.VoiceResponse();
        const customerNumber=req.body.From;
        console.log('Checking async funcs!');
        Promise.all( this.recDict[customerNumber].asyncFuncs).then(async ()=>{
            console.log('***FINISH ADDING PRODUCTS***');
            console.log('Adding store description');
            await storeMap.addStoreDescription(this.recDict[customerNumber]);
            this.callSession.addResults(customerNumber,this.recDict[customerNumber]);
            this.recDict[customerNumber].finish=true; 
            
        });
        
       /* else{
            this.recDict[customerNumber].finish=true; 
        }*/
       
        //Find if customer finished asking for products
        //twiml.say({ voice: 'Polly.Joanna-Neural' },`One moment!`);
        //recDict[customerNumber].location= resultdict.guideddescription;
       
        //twiml.say({ voice: 'Polly.Joanna-Neural' },`I need a few seconds to process your request, please wait`);
        //twiml.play(mp3Path+this.voice+'/'+'fewseconds.mp3');
        twiml.play(mp3Path+this.voice+'/'+'typing.mp3');
        twiml.redirect('/record-result');
        res.type('text/xml');
        res.send(twiml.toString());
    }

    async processSpeechResult(req,res,storeMap,numTries)
    {  
        const twiml = new this.VoiceResponse();
        const customerNumber=req.body.From;
        console.log('speechtotext: ',this.recDict[customerNumber].speechtotext);
        if(this.recDict[customerNumber].speechtotext==null )
        {
            console.log('Waiting for speech result',numTries);

            if(numTries==30)//10 secs max to wait for a transcription
            {
                //twiml.say({ voice: 'Polly.Joanna-Neural' },"Sorry, I couldn't get that clearly. Goodbye!");
                twiml.play(mp3Path+this.voice+'/'+'searcherror.mp3');
                twiml.redirect('/listenproduct');
               // twiml.hangup();
                res.type('text/xml');
                res.send(twiml.toString());
            }
            else{
                setTimeout(()=>{
                    twiml.redirect('/process-record?numTries='+(numTries+1));
                    res.type('text/xml');
                    res.send(twiml.toString());
                },1000);
           }
            
           
           
        }
        else
        {
            if(this.recDict[customerNumber].querydicterror==true)
            {
                twiml.play(mp3Path+this.voice+'/'+'searcherror.mp3');
                twiml.hangup();
                res.type('text/xml');
                res.send(twiml.toString());
                return;
            }

            if(this.recDict[customerNumber].querydict==null)
            {
                console.log('Query dict is null, starting chatGPT 1st query');
                this.recDict[customerNumber].querydict='';
                this.recDict[customerNumber].querydicterror=false;
                const text =this.recDict[customerNumber].speechtotext;
                

                storeMap.generateQueryDict(text).then((querydict)=>{
                   if(!querydict || querydict.length==0 || !Array.isArray(querydict))
                    {
                        this.recDict[customerNumber].querydicterror=true;
                    }
                    else{
                         this.recDict[customerNumber].querydict=querydict;
                    }
                });

                twiml.play(mp3Path+this.voice+'/'+'typing.mp3');

                setTimeout(()=>{
                    twiml.redirect('/process-record?numTries='+(numTries+1));
                    res.type('text/xml');
                    res.send(twiml.toString());
                },1000);
           
                return;

            }
            else if(this.recDict[customerNumber].querydict=='')
            {
                console.log('Query dict empty, waiting for chatgpt to finish');
                if(numTries%10==0 && numTries>0)//Prevent timeout error
                {
              
                    twiml.play(mp3Path+this.voice+'/'+'pleasewait.mp3');
                }
                setTimeout(()=>{
                    twiml.redirect('/process-record?numTries='+(numTries+1));
                    res.type('text/xml');
                    res.send(twiml.toString());
                },1000);
                return;
            }
            else if(this.recDict[customerNumber].querydict!==undefined && this.recDict[customerNumber].querydict.length>0)
            {
                console.log('Query dict is valid! generating TTS');
                var searchingfor='Searching for ';
                for(var k=0;k<this.recDict[customerNumber].querydict.length;k++)
                {
                    if(k>0 && k==this.recDict[customerNumber].querydict.length-1)
                        searchingfor+='and ';
                    searchingfor+=this.recDict[customerNumber].querydict[k].queryproduct+', ';
                }
                const audioname = await gc.generateAudioFromText(searchingfor);
                twiml.play(mp3Path+this.voice+'/'+audioname);
               // twiml.say({ voice: 'Polly.Joanna-Neural' },searchingfor);
                const promise=new Promise(async resolve=>{
                    await this.executeSearch(customerNumber,this.recDict[customerNumber].querydict,storeMap);
                    resolve();
                });
                console.log('Adding async funcs!');
                this.recDict[customerNumber].asyncFuncs.push(promise);
            
                console.log('Redirecting to call result');
                twiml.redirect('/listenproduct');
                res.type('text/xml');
                res.send(twiml.toString());
                return;
            }
             
            else{
                console.log('Query dict has no product, finishing adding');
                this.finishAddingProducts(req,res,storeMap);
            }
        
            /*const text =this.recDict[customerNumber].speechtotext;
           
            var querydict=await storeMap.generateQueryDict(text);
            //this.recDict[customerNumber].processing=true;
            if(querydict!==undefined && querydict.length>0)
            {   
                var searchingfor='Searching for ';
                for(var k=0;k<querydict.length;k++)
                {
                    if(k>0 && k==querydict.length-1)
                        searchingfor+='and ';
                    searchingfor+=querydict[k].queryproduct+', ';
                }
                const audioname = await gc.generateAudioFromText(searchingfor);
                twiml.play(mp3Path+this.voice+'/'+audioname);
               // twiml.say({ voice: 'Polly.Joanna-Neural' },searchingfor);
                const promise=new Promise(async resolve=>{
                    await this.executeSearch(customerNumber,querydict,storeMap);
                    resolve();
                });
                console.log('Adding async funcs!');
                this.recDict[customerNumber].asyncFuncs.push(promise);
            
                console.log('Redirecting to call result');
                twiml.redirect('/listenproduct');
                res.type('text/xml');
                res.send(twiml.toString());

                
            }
            else
            {
                this.finishAddingProducts(req,res,storeMap);
                
            }*/
            
        
        }

    }
    //Twilio record finishes, process request (send provisional one moment...)
    processRecordedAudio(req, res, recordingUrl) {

        console.log('***Started processing record***');
        const twiml = new this.VoiceResponse();
        const customerNumber=req.body.From;
        
        if(recordingUrl==undefined)
        {   
            console.log('No recording to process');
            this.finishAddingProducts(req,res);
            return;
        }
        const rid = recordingUrl.split('/').pop();
        //onst asyncFuncs=[];
        console.log(this.recDict[customerNumber]);
    
        if (this.validToken()) {

            const headers = {
                'Authorization': `Basic ${Buffer.from(`${this.account_sid}:${this.auth_token}`).toString('base64')}`,
            };

            const outputPath = projectDir + '/mp3/audiotwilio' + rid + '.mp3';
            axios.get(recordingUrl, { responseType: 'stream', headers: headers, timeout: 15000 })

                .then((response) => {

                    // Crea un stream escribible para guardar el archivo
                    const fileStream = fs.createWriteStream(outputPath);
                    // Conecta el stream de respuesta al stream del archivo
                    response.data.pipe(fileStream);
                    // Maneja los eventos del stream del archivo

                    fileStream.on('finish', () => {

                        console.log('Twilio recorded file downloaded correctly.');
                        this.recDict[customerNumber].speechtotext=null;
                        this.recDict[customerNumber].querydict=null;
                        chat.whisperFile(outputPath).then(async (result) => {
                          
                            this.recDict[customerNumber].speechtotext=result.text;
                            if(result.text!==undefined && result.text!=='')
                            {
                                this.recDict[customerNumber].questions.push(result.text);
                            }
                            else{
                                this.recDict[customerNumber].speechtotext='';
                            }
                            //let resultdict=await storeMap.processOrder(result.text);
                           
                            /*
                            console.log('Responding question!');
                            console.log(resultdict.guideddescription);*/
                            console.log('***Generating text to speech response***');
                        
                           // recDict[rid] = { status: "finishedsearch", location: resultdict.guideddescription,searchresult:resultdict, mp3Path: null};

                        }).catch(async (error) => {
                            //recDict[customerNumber] = { status: "finishedsearch", location: "Please say it again" };
                            console.log('Error:', 'Error processing speech to text');
                            //twiml.say({ voice: 'Polly.Joanna-Neural' },"I couldn't hear that clearly. Goodbye!");
                            //twiml.hangup();
                            //console.log(error);
                            this.recDict[customerNumber].speechtotext='';
                            
                            //this.finishAddingProducts(req,res);

                        });
                        

                        //twiml.say({ voice: 'Polly.Joanna-Neural' }, 'One moment!');
                        twiml.play(mp3Path+this.voice+'/'+'onemoment.mp3');
                        twiml.redirect('/process-record');
                        res.type('text/xml');
                        res.send(twiml.toString());
                        console.log('Finished whisper call');
                  

                    });

                    fileStream.on('error', (error) => {
                        //recDict[customerNumber] = { status: "finishedsearch", location: "Sorry, I did not understand" };
                        console.log('Error:', 'Error downloading  mp3 file');
                        //this.recDict[customerNumber].speechtotext='';
                       // twiml.say({ voice: 'Polly.Joanna-Neural' },"I couldn't hear that clearly. Goodbye!");
                        twiml.play(mp3Path+this.voice+'/'+'speecherror.mp3');
                        //twiml.say({ voice: 'Polly.Joanna-Neural' },"Goodbye!");
                        twiml.hangup();
                        //twiml.redirect('/listenproduct');
                        res.type('text/xml');
                        res.send(twiml.toString());
                    });
                })

                .catch((error) => {
                   // recDict[customerNumbers] = { status: "finishedsearch", location: "Could you repeat that?" };
                    console.log('Error:', 'Error requesting mp3 file');
                   // this.recDict[customerNumber].speechtotext='';
                    //twiml.say({ voice: 'Polly.Joanna-Neural' },"I couldn't hear that clearly. Goodbye!");
                    twiml.play(mp3Path+this.voice+'/'+'speecherror.mp3');
                    //twiml.redirect('/listenproduct');
                    twiml.hangup();
                    res.type('text/xml');
                    res.send(twiml.toString());
                    
                });
        }
        else{
           // twiml.hangup();
            //twiml.redirect('/listenproduct');
            //twiml.say({ voice: 'Polly.Joanna-Neural' },"I couldn't hear that clearly. Goodbye!");
            twiml.play(mp3Path+this.voice+'/'+'speecherror.mp3');
            twiml.hangup();
            res.type('text/xml');
            res.send(twiml.toString());
           
        }
        //twiml.play(mp3Path+this.voice+'/onemoment.mp3');
        //twiml.redirect('/record-result?rid=' + rid);

   
    }

    sendSMSMessage(number, msg) {
        console.log('Sending sms message');

        const client = require('twilio')(this.account_sid, this.tw_token);

        client.messages
            .create({
                body: msg,
                from: '6196182457',
                to: number
            })
            .then(message => console.log(message.sid))
            .catch((error) => {
                console.error(error);
                // return callback(error);
            });
        /* const twilioClient = context.getTwilioClient();
 
         // Query parameters or values sent in a POST body can be accessed from `event`
         //const from = event.From || '+15017122661';
         const to = number;
         const body = msg;
       
         // Use `messages.create` to generate a message. Be sure to chain with `then`
         // and `catch` to properly handle the promise and call `callback` _after_ the
         // message is sent successfully!
         twilioClient.messages
           .create({ body, to, from })
           .then((message) => {
             console.log('SMS successfully sent');
             console.log(message.sid);
             // Make sure to only call `callback` once everything is finished, and to pass
             // null as the first parameter to signal successful execution.
             return callback(null, `Success! Message SID: ${message.sid}`);
           })
           .catch((error) => {
             console.error(error);
             return callback(error);
           });*/
    }
}


module.exports = TwilioVoice;