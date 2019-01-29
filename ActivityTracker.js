const ioHook = require('iohook');
const monitor = require('active-window');
const request = require('request');
const config = require('./config');
const browserHistory = require('./node-browser-history');

module.exports = class ActivityTracker {
    constructor(userId) {
        this.activeWindowList = [];
        this.lastAwinObj = {};
        this.lastAwinObj.title = '';
        this.lastAwinObj.app = '';

        this.idleFrameStartTime = this.getDateTime(new Date);
        this.totalSeconds = 0;
        this._usreId = userId;
        this.startIdleTime = false;
        // If user idle more than 3 min, then calculate idle time 
        this.maxIdleTime = 30;
        setInterval(() => this.setTime(), 1000);
    }

    isBrowser(appName) {
        return appName === "chrome" || appName === "firefox" || appName === "opera";
    }

    getLatestURLS(browserName) {
        if (browserName === "chrome") {
            console.log("Chrome tab clicked");
            return browserHistory.getChromeHistory(10);
        } else if (browserName === "firefox") {
            return browserHistory.getFirefoxHistory(10);
        }
    }

    matchURL(urls, title, hasDoubleByte) {
        console.log(title);
        console.log(title.includes("\\u"));
        if (hasDoubleByte) {
            for (const url of urls) {
                //console.log(url.title);
                if (url.title.includes(title)) {
                    console.log("URL matched!!!");
                    console.log("URL: " + url.url);
                    return url.url;
                }
            }
        } else if (title.includes("\\u")) {
            // console.log('title: ' + title.split("\\")[0]);
            for (const url of urls) {
                //console.log(url.title);
                if (url.title.includes(title.split("\\")[0])) {
                    console.log("URL matched!!!");
                    console.log("URL: " + url.url);
                    return url.url;
                }
            }
        } else {
            for (const url of urls) {
                //console.log(url.title);
                if (title.includes(url.title)) {
                    console.log("URL matched!!!");
                    console.log("URL: " + url.url);
                    return url.url;
                }
            }
        }
        console.log("URL not found");
        return "";
    }

    doubleByteCheck(str) {
        for (var i = 0, n = str.length; i < n; i++) {
            if (str.charCodeAt(i) > 255) {
                return {
                    hasDoubleByte: true,
                    pos: i
                };
            }
        }
        return {
            hasDoubleByte: false
        };
    }


    setTime() {
        ++this.totalSeconds;

        if (this.totalSeconds > this.maxIdleTime && !this.startIdleTime) {
            this.eventHandler();
        }
    }

    resetIdleTimer() {
        this.idleFrameStartTime = this.getDateTime(new Date);
        this.totalSeconds = 0;
    }

    eventHandler(event) {
        if (this.totalSeconds > this.maxIdleTime && !this.startIdleTime) {
            this.closeLastActiveWindow(new Date);
            this.startIdleTime = true;
        } else if (this.startIdleTime) {
            this.resetIdleTimer();
            this.createNewActiveWindow(this.lastAwinObj, new Date);
            this.startIdleTime = false;
        }
    }


    callApi(appdata) {
        var userActivity = {};
        userActivity.appData = appdata;
        userActivity.idleTime = [];
        userActivity.userId = this._usreId;
        // userActivity.date = this.getDateTime(new Date(),'dateonly');

        console.log('Api called ... ');
        console.dir(userActivity);
        if (this.isBrowser(userActivity.appData.app)) {
            console.log(userActivity.appData);
            console.log(userActivity.appData.title);
            // solve unicode issue
            let jsonStr = JSON.stringify(userActivity.appData).split('"')[7];
            let doubleByteCheck = this.doubleByteCheck(userActivity.appData.title);
            if (doubleByteCheck.hasDoubleByte) {
            //    console.log("Has uni code");
                userActivity.appData.title = userActivity.appData.title.slice(0, doubleByteCheck.pos);
            //    console.log(userActivity.appData.title);
            } else if (jsonStr.includes("\\u")) {
                userActivity.appData.title = jsonStr;
            }
        //    console.log(this.getLatestURLS(userActivity.appData.app));
            console.log("userActivity.appData.title: " + userActivity.appData.title);
            //console.log(this.getLatestURLS(userActivity.appData.app).length);
            const matchingURL = this.matchURL(
                this.getLatestURLS(userActivity.appData.app),
                userActivity.appData.title,
                doubleByteCheck.hasDoubleByte);
            if (matchingURL !== "") {
                userActivity.appData.title = matchingURL;
            }
        }
        request({
            url: config.dataDumpUrl,
            method: "POST",
            json: true, // <--Very important!!!
            body: this.enctypt(JSON.stringify(userActivity))
        }, function (error, response, body) {
            // console.dir(response);
            // console.dir(error);
            // console.dir(body);
        });

    }

    twoDigit(i) {
        return (+i < 10) ? "0" + i : i;
    }

    getDateTime(today, type = null) {
        let date = today.getFullYear() + '-' + this.twoDigit(today.getMonth() + 1) + '-' + this.twoDigit(today.getDate());
        return type == 'dateonly' ? date : today.getTime();
    }

    createNewActiveWindow(awin, today) {
        awin.start = this.getDateTime(today);
        awin.end = this.getDateTime(today);
        this.activeWindowList.push(awin);
    }

    closeLastActiveWindow(today) {
        // As previous window finished 1 sec before, so 2nd param is 1
        // previous -1 logic is removed
        this.activeWindowList[this.activeWindowList.length - 1].end = this.getDateTime(today);
        this.activeWindowList[this.activeWindowList.length - 1].app;
        this.callApi(this.activeWindowList.pop());
        this.activeWindowList = [];
    }

    callback(awin) {
        try {
            if (this.lastAwinObj.title !== awin.title && !this.startIdleTime) {

                var today = new Date();
                if (this.activeWindowList.length > 0) {
                    this.closeLastActiveWindow(today);
                }
                this.createNewActiveWindow(awin, today);
                // console.dir( JSON.stringify( activeWindowList ) );
            }

            this.lastAwinObj = awin;
        } catch (err) {
            console.log(err);
        }
    }

    start() {

        ioHook.start();
        ioHook.on('mouseclick', event => this.eventHandler(event));
        ioHook.on('keypress', event => this.eventHandler(event));
        ioHook.on('mousewheel', event => this.eventHandler(event));
        ioHook.on('mousemove', event => this.eventHandler(event));
        monitor.getActiveWindow(event => this.callback(event), -1, 1);
    }

    enctypt(text) {
        var crypto = require('crypto');
        var key = '00000000000000000000000000000000'; //replace with your key
        var iv = '0000000000000000'; //replace with your IV
        var cipher = crypto.createCipheriv('aes256', key, iv)
        var crypted = cipher.update(text, 'utf8', 'base64')
        crypted += cipher.final('base64');
        return crypted;
    }
}