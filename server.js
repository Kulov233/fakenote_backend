const https = require("https");
const fs = require("fs");
const bodyParser = require("body-parser");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");

const userApi = require("./api/user");

const config = require("./config/config");

const mongoConnectionURL = 'mongodb://node:sbwzs233@192.168.31.237:23142/?authSource=fakenote';
const databaseName = "fakenote";

mongoose
    .connect(mongoConnectionURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        dbName: databaseName,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(`Error connecting to MongoDB: ${err}`));

const app = express();

// set up bodyParser, which allows us to process POST requests
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb', parameterLimit: 50000 }));
app.use(bodyParser.json({ limit: '50mb' }));

// set up a session, which will persist login data across requests
app.use(
    session({
        secret: config.secret,
        resave: false,
        saveUninitialized: false,
    })
);

// connect user-defined routes
app.use("/api/user", userApi);

// any server errors cause this function to run
app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status === 500) {
        // 500 means Internal Server Error
        console.log("The server errored when processing a request!");
        console.log(err);
    }

    res.status(status);
    res.send({
        status: status,
        message: err.message,
    });
});

const port = 23143;
const serverOptions = {
    key: fs.readFileSync('./certs/ydmsk.xyz.key'), // SSL 私钥
    cert: fs.readFileSync('./certs/ydmsk.xyz_bundle.crt') // SSL 证书
};
const server = https.createServer(serverOptions, app); // 创建 HTTPS 服务器

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});