const speechToText = require('@google-cloud/speech').v1p1beta1;
const textToSpeech = require('@google-cloud/text-to-speech').v1beta1;

interface LooseObject {
    [key: string]: any
}

export class Speech {
    private encoding: string;
    private sampleRateHertz: Number;
    private ssmlGender: string;
    private tts: any;
    private stt: any;
    private ttsRequest: LooseObject;
    private sttRequest: LooseObject;
      
    constructor() {
        this.encoding = "LINEAR16"; //process.env.SPEECH_ENCODING;
        this.sampleRateHertz = 44100; //parseInt(process.env.SAMPLE_RATE_HERZ);
        this.ssmlGender = "MALE"; //process.env.SSML_GENDER;
        this.setupSpeech();
    }

    setupSpeech(){
        this.tts = new textToSpeech.TextToSpeechClient();
        this.stt = new speechToText.SpeechClient();

        this.ttsRequest = {
          // Select the language and SSML Voice Gender (optional)
          voice: {
            ssmlGender: this.ssmlGender  //  'MALE|FEMALE|NEUTRAL'
          },
          // Select the type of audio encoding
          audioConfig: {
            audioEncoding: this.encoding, //'LINEAR16|MP3|AUDIO_ENCODING_UNSPECIFIED/OGG_OPUS'
          },
          input: null
        };

        this.sttRequest = {
            config: {
              sampleRateHertz: this.sampleRateHertz,
              encoding: this.encoding,
              enableAutomaticPunctuation: true,
              //nableSpeakerDiarization: true,
              //diarizationSpeakerCount: 2,
              useEnhanced: true,
              model: 'default',
              metadata: {
                microphoneDistance: 'NEARFIELD', //MIDFIELD
                interactionType: 'VOICE_SEARCH',
                audioTopic: 'Airport FAQ'
              }
            }

        };
    }

    async speechToText(audio: Buffer, lang: string) {
      try {
        this.sttRequest.config.languageCode = lang;
        this.sttRequest.audio = {
            content: audio,
        };
        const responses = await this.stt.recognize(this.sttRequest);
        const results = responses[0].results[0].alternatives[0];
        return {
          'transcript' : results.transcript,
          'detectLang': lang
        };
      }
      catch (error) {
          console.log('Error in speech to text:', error);
          return {};
      }
    }

    async speechStreamToText(stream: any, lang: string, cb: Function) { 
      this.sttRequest.config.languageCode = lang;
      const recognizeStream = this.stt.streamingRecognize(this.sttRequest)
      .on('data', function(data: any){
        cb(data.results[0].alternatives[0]);
      })
      .on('error', (e: any) => {
        console.log(e);
      })
      .on('end', () => {
        console.log('on end');
      });
    
      stream.pipe(recognizeStream);
      stream.on('end', function() {
          //fileWriter.end();
      });
    };

    async textToSpeech(text: string, lang: string) {
        this.ttsRequest.input = { text };
        this.ttsRequest.voice.languageCode = lang;
        this.setSpeechTweaks(lang);
        // Trying new object
        // sampleRateHertz: 44100
        const request = {
          input: {text: text},
          // Select the language and SSML voice gender (optional)
          voice: {languageCode: lang, ssmlGender: 'FEMALE', sampleRateHertz: 44100},
          // select the type of audio encoding
          audioConfig: {audioEncoding: 'LINEAR16'},
        }
        console.log('tts request:', request);
        //const responses = await this.tts.synthesizeSpeech(this.ttsRequest);
        const [responses] = await this.tts.synthesizeSpeech(request);
        //return responses[0].audioContent;  
        return responses;
    }


    /*
     * The default synthesize settings, are not optimal for every language.
     * In certain languages, we tend to speak faster, or the pitch just sounds
     * a bit off.
     */
    setSpeechTweaks(lang: string){
      if(lang == 'nl-NL'){
        this.ttsRequest.audioConfig.pitch = -6;
        this.ttsRequest.audioConfig.speakingRate = 0.95;
      } else {
        this.ttsRequest.audioConfig.pitch = 0;
        this.ttsRequest.audioConfig.speakingRate = 1;      
      }
    }


}

export let speech = new Speech();