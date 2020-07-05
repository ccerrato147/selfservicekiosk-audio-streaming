/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as dotenv from 'dotenv';
import { dialogflow } from './dialogflow';
import { speech } from './speech';
import { translate } from './translate';
import * as socketIo from 'socket.io';
import * as path from 'path';
import * as http from 'http';
import * as express from 'express';
import * as cors from 'cors';
import * as sourceMapSupport from 'source-map-support';
import * as fs from 'fs';
import * as util from 'util';

const ss = require('socket.io-stream');

dotenv.config();
sourceMapSupport.install();

export class App {
    public static readonly PORT:number = parseInt(process.env.PORT) || 8080;
    private app: express.Application;
    private server: http.Server;
    private io: SocketIO.Server;
    public socketClient: SocketIO.Server;
    public baseLang: string;
    
    constructor() {
        this.createApp();
        this.createServer();
        this.sockets();
        this.listen();

        this.baseLang = process.env.LANGUAGE_CODE;

        speech.textToSpeech("hoy hay 7 discrepancias de ventas total, 5 activas, 1 en demora", 'es-ES').then(this.saveWavFile);
        speech.textToSpeech("Listo. Este es el proceso 'Cuadre de Ventas Diarias'", 'es-ES').then(this.saveWavFile);
        speech.textToSpeech("Bienvenido Carlos", 'es-ES').then(this.saveWavFile);
    }

    async saveWavFile(response: any){
        const writeFile = util.promisify(fs.writeFile);
        let fileName = 'output '+ Date.now() +'.wav';
        await writeFile(fileName, response.audioContent, 'binary');
    }

    private createApp(): void {
        this.app = express();
        this.app.use(cors());
        //this.app.set('trust proxy', true);
  
        /* this.app.use(function(req: any, res: any, next: any) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

            if (req.secure) {
                // request was via https, so do no special handling
                next();
            } else {
                if(req.headers.host != 'localhost:' + App.PORT && req.headers.host != process.env.EXTERNAL_IP){
                    // request was via http, so redirect to https
                    res.redirect('https://' + req.headers.host + req.url)
                } else {
                    next();
                }
            }
        }); */
        //this.app.use('/', express.static(path.join(__dirname, '../dist/public')));
    }

    private createServer(): void {
        this.server = http.createServer(this.app);
    }

    private sockets(): void {
        this.io = socketIo(this.server);
    }

    // private bufferToBase64(buf: Float32Array): String {
    //     var binstr = Array.prototype.map.call(buf, (ch: any) => {
    //         return String.fromCharCode(ch);
    //     }).join('');
    //     return btoa(binstr);
    // }

    async listen() {
        let NewSocket = socketIo({
            transports: ['websocket'],
        });
        NewSocket.attach(8080);
        NewSocket.on('connection', (socket) => {
            socket.on('stt', (speechAudio) => {
                speech.speechToText( Buffer.from(speechAudio.audio, 'base64'), process.env.LANGUAGE_CODE).then(async (result) => {
                    console.log("Audio", result.transcript);
                    // Match the intent
                    const intentMatch = await dialogflow.detectIntent(result.transcript);
                    socket.emit('response', { intentMatch } );
                    /* speech.textToSpeech(intentMatch.FULFILLMENT_TEXT, 'es-ES').then(async (response: any) => {
                            const writeFile = util.promisify(fs.writeFile);
                            let fileName = 'output '+ Date.now() +'.wav';
                            await writeFile(fileName, response.audioContent, 'binary');
                            console.log('Audio content written to file: ' + fileName);
                            let base64: String = Buffer.from(response.audioContent, 'binary').toString('base64');
                            socket.emit('ResponseBase64', { intentMatch, base64 } );
                        }).catch((e: any) => { console.log(e); }) */
                });
            });

            socket.on('beep', function(){
                console.log("beep received!");
                socket.emit('boop');
            });
        });
    }
}

export let app = new App();
