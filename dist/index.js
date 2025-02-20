import WebSocket from 'ws';
import * as fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
// Classes
// CHROMIUM: Launch a browser instance with certain options/settings.
class Chromium {
    binaryPath;
    port;
    proxyString;
    options;
    profileDir;
    process;
    wsUrl;
    ws;
    constructor(binaryPath, port, profileDir, proxyString, options) {
        this.binaryPath = binaryPath;
        this.port = port;
        this.proxyString = proxyString;
        this.options = options;
        this.profileDir = path.join('/UserDataSaves', profileDir);
        this.process = null;
        this.wsUrl = '';
        this.ws = null;
    }
    // function randomInt(min: number, max: number) {
    //     return Math.floor(Math.random() * (max - min + 1)) + min;
    // }
    async delay(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }
    async launch() {
        if (!fs.existsSync(this.profileDir)) {
            fs.mkdirSync(this.profileDir, { recursive: true });
        }
        let args = [
            `--remote-debugging-port=${this.port}`,
            `--user-data-dir=${this.profileDir}`,
            `--no-first-run`,
            '--remote-allow-origins=*',
        ];
        if (this.options[0] != '') {
            args = args.concat(this.options);
        }
        try {
            this.process = spawn(path.join(this.binaryPath), args, {
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore']
            });
        }
        catch (error) {
            console.log('Could not launch Chrome Instance: ', error);
            return false;
        }
        await this.delay(5000);
        if (await this.connectWS(this.port) != true) {
            throw new Error(`Could NOT connect to Browser ${this.process.pid}`);
        }
        return true;
    }
    async connectWS(port) {
        let tryCount = 1;
        while (tryCount < 10) {
            try {
                const response = await new Promise((resolve, reject) => {
                    http.get(`http://localhost:${port}/json`, (res) => {
                        let data = '';
                        res.on('data', (chunk) => data += chunk);
                        res.on('end', () => resolve(JSON.parse(data)));
                    }).on('error', reject);
                });
                const page = response.find((page) => page.type === 'page');
                if (page) {
                    this.wsUrl = page.webSocketDebuggerUrl;
                    this.ws = new WebSocket(this.wsUrl);
                    await new Promise((resolve, reject) => {
                        this.ws.addEventListener('open', () => {
                            console.log('CONNECTED to Browser');
                            resolve(true);
                        });
                        this.ws.addEventListener('error', (error) => {
                            reject(error);
                        });
                    });
                    return true;
                }
            }
            catch (error) {
                console.log(`Browser ${this.process.pid} connection failure #${tryCount}`);
                tryCount++;
                await this.delay(1000);
            }
        }
        return false;
    }
    async send(method, params) {
        return new Promise((resolve, reject) => {
            const message = JSON.stringify({ id: 1, method, params });
            this.ws.send(message);
            const listener = (data) => {
                const response = JSON.parse(data);
                if (response.id === 1) {
                    this.ws.removeListener('message', listener);
                    resolve(response);
                }
            };
            this.ws.on('message', listener);
        });
    }
    async goto(url) {
        console.log(`Navigating to ${url}`);
        await this.send('Page.enable', {});
        await this.send('Network.enable', {});
        await this.send('Page.navigate', { url });
        // Wait for the page to finish loading
        return new Promise((resolve, reject) => {
            const listener = (data) => {
                const event = JSON.parse(data);
                if (event.method === 'Page.loadEventFired') {
                    this.ws.removeListener('message', listener);
                    // add delay?
                    this.delay(2000).then(resolve);
                }
                else if (event.method === 'Inspector.detached') {
                    this.ws.removeListener('message', listener);
                }
            };
            this.ws.on('message', listener);
        });
    }
    async executeScript(script) {
    }
    async close() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.process) {
            this.process.kill();
        }
    }
}
// BROWSER: This is the main class. This is the object the user will use
// to create browser instances and call functions from other classes.
class Browser {
    _browser;
    _binaryPath;
    _port;
    _proxyString;
    _options;
    _profileDir;
    constructor(binaryPath, port, profileDir, proxyString, options) {
        this._browser = null;
        this._binaryPath = binaryPath;
        this._port = port;
        this._profileDir = profileDir;
        this._proxyString = proxyString;
        this._options = options;
    }
    randomInt(lowerBound, upperBound) {
    }
    async delay(milliseconds) {
    }
    async start() {
        // check to see if the chromiu browser executable exists in the given folder. If not throw error
        if (fs.existsSync(this._binaryPath) == false) {
            throw new Error(`No Chromium binary found in path: ${this._binaryPath}.`);
        }
        // if this._browser is still null, then we create the browser object and launch the browser instance
        if (this._browser == null) {
            this._browser = new Chromium(this._binaryPath, this._port, this._profileDir, this._proxyString, this._options);
            // We call the launch() function. If it does not return true, it has failed to launch successfully and we throw an error.
            if (await this._browser.launch() != true) {
                throw new Error('Browser failed to launch successfully');
            }
        }
        // return the current value so we know that the browser instance is live
        return this._browser;
    }
    async stop() {
        if (this._browser) {
            await this._browser.close();
            this._browser = null;
        }
    }
}
// KEYBOARD STROKES
// MOUSE CLICKS
// module.exports = { Browser };
export default Browser;
