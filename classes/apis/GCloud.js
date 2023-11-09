const textToSpeech = require('@google-cloud/text-to-speech');
//const vision = require('@google-cloud/vision');
const axios = require('axios');
const path= require('path');
const fs = require("fs");
const util = require('util');
const projectDir = process.cwd();

class GCloud {
    constructor() {
        console.log('Constructor Gcloud');
        this.voice='Elly';
        process.env['GOOGLE_APPLICATION_CREDENTIALS']=projectDir + '/config/gcloud.json';
       /* fs.readFile(projectDir + '/config/gcloud.json', 'utf8', (err, data) => {
            if (err) {
                console.log(err.message);
                return;
            }
            let configJson = JSON.parse(data);
            process.env['GOOGLE_APPLICATION_CREDENTIALS'] = configJson.private_key_id;
            */
            //this.apiKey = configJson.private_key_id;
           // console.log(this.apiKey);
            this.client = new textToSpeech.TextToSpeechClient();
            //console.log(client);
           // this.listVoices();
           //this.generateAudioFromText("Welcome to Target!! How can I help you today?");
           // this.generateDefaultMessages();
       // });
       
        


    }

    async listVoices()
    {
        const [result] = await this.client.listVoices({});
        const voices = result.voices;

        console.log('Voices:');
        voices.forEach(voice => {
            console.log(`Name: ${voice.name}`);
            console.log(`  SSML Voice Gender: ${voice.ssmlGender}`);
            console.log(`  Natural Sample Rate Hertz: ${voice.naturalSampleRateHertz}`);
            console.log('  Supported languages:');
            voice.languageCodes.forEach(languageCode => {
                console.log(`    ${languageCode}`);
        });
        });
    }
    generateDefaultMessages()
    {
        this.generateAudioFromText("Hello! Welcome to Target. What products can I help you find today? Press pound when finished.","listquestion_target.mp3");

        this.generateAudioFromText("One moment!","onemoment.mp3");

        this.generateAudioFromText("You'll receive a text messsage with the location of your products","textmessage.mp3");

        this.generateAudioFromText("Goodbye!","goodbye.mp3");

        this.generateAudioFromText("I could not hear you clearly, please try again!","speecherror.mp3");

        this.generateAudioFromText("I did not find any products","searcherror.mp3");
        
        this.generateAudioFromText("Please wait","pleasewait.mp3");

        this.generateAudioFromText("One moment please!","fewseconds.mp3");

    }


    async generateAudioFromText(text,name)
    {
        var outputFile;
        
        console.log('Generating mp3 audio...');
        if(name!==undefined)
            outputFile=projectDir+"/front/public_html/mp3/"+this.voice+"/"+name;
        else
        {
            name="tts-"+Date.now()+"-"+Math.floor(Math.random() * 900000) + 100000+".mp3";
            outputFile=projectDir+"/front/public_html/mp3/"+this.voice+"/"+name;
        }

        if(text!==undefined && text!='')
        {
            
            const request = {
                input: {text: text},
               // voice: {languageCode: 'en-US', ssmlGender: 'FEMALE'},
                voice:{name:"en-US-Neural2-G",languageCode: 'en-US',ssmlGender: 'FEMALE'},
                audioConfig: {audioEncoding: 'MP3'},
            
            };
            const [response] = await this.client.synthesizeSpeech(request);
            const writeFile = util.promisify(fs.writeFile);
            await writeFile(outputFile, response.audioContent, 'binary');
            console.log(`Audio content written to file: ${outputFile}`);

            
        }
        return name;

       
    }

    

 
}

module.exports = GCloud;





