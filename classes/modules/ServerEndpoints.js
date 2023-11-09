const express = require('express');

const app = express();
const path = require('path');
const fs = require('fs')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
//const cors = require("cors")  // npm i cors
const currentDir = process.cwd();
const PUBLIC_HTML_ABSOLUTE_PATH = path.join(currentDir, '/front/public_html');
console.log(PUBLIC_HTML_ABSOLUTE_PATH);




app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/mp3', express.static(path.join(currentDir, '/mp3')));

const session = require('express-session');
app.use(session({
    secret: 'thisisthegreatsecretkeyintheworld_',
    resave: false,
    saveUninitialized: true
}));

const protectedPaths = ["/", "/queries"];

const checkSession = (req, res, next) => {
    if (protectedPaths.includes(req.path) && !req.session.authenticated) {
        return res.redirect('/login');
    }
    next();
};

app.use(checkSession);
app.use('/', express.static(PUBLIC_HTML_ABSOLUTE_PATH));
app.use('/queries', express.static(PUBLIC_HTML_ABSOLUTE_PATH + "/queries.html"));

require('dotenv').config();
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;

let PORT = argv.port != undefined ? argv.port : process.env.APP_PORT;
let hostname = process.env.HOSTNAME || 'api.clerkgpt.com';
if (currentDir.includes('/mnt/c') || currentDir.includes('C:')) {
    console.log('Starting localhost!');
    if (PORT == undefined)
        PORT = 3000;
    app.listen(PORT);
    //rime = new Rime();
}
else {

    if (PORT !== undefined && stringToBoolean(process.env.SSL) == false) {
        console.log('Starting Server in Port: ', PORT);
        app.listen(PORT);
    }
    else if (PORT !== undefined && stringToBoolean(process.env.SSL) == true) {
        console.log('Starting Server in Port: ', PORT);
        const httpsServer = require('./HttpsServer.js')(app, PORT, hostname);
    }
    else {
        console.log('Starting SSL serverhost!');
        const httpsServer = require('./HttpsServer.js')(app, 443, hostname);
    }
}

function stringToBoolean(stringValue) {
    switch (stringValue?.toLowerCase()?.trim()) {
        case "true":
        case "yes":
        case "1":
            return true;

        case "false":
        case "no":
        case "0":
        case null:
        case undefined:
            return false;

        default:
            return JSON.parse(stringValue);
    }
}

module.exports = app;


