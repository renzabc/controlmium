import Browser from "./index.js";


function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}


let test = async () => {
    const instance = new Browser(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        randomInt(1001, 1999),
        './Profile 1/Default', '',
        [
            '--disable-accelerated-2d-canvas',
            `--window-size=540,760`,
            `--window-position=0,0`
        ]
    )

    let url = 'https://www.yahoo.com'
    
    let browser = await instance.start() // starts a browser instance with the object properties above

    
    await browser.goto(url) // navigates the browser page to the URL
    // await browser.getCoordinatesbyID()
    // await browser.getCoordinatesbyID()
    // await browser.moveMouse()
    // await browser.clickMouse()
    // await browser.type()
    console.log('passed: ', browser)
    
    await instance.stop() // closes the browser and kills the process
}


test().catch(console.error)






