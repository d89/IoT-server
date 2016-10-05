//---------------------------------------------------------------------------
//dependencies
var logger = require("./logger");
var sockethelper = require("./sockethelper");
var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var app = express();
var config = require('./config');
var upload = multer({ dest: config.mediaBasePath });
var storage = require('./storage');
var video = require('./video');
var uiApi = require('./uiApi');
var socketApi = require('./socketApi');
var async = require('async');
var glob = require('glob');
var path = require('path');

//config
const port = config.port;

//---------------------------------------------------------------------------
let server = null;

if (!config.useSSL)
{
    const http = require('http');
    server = http.createServer(app).listen(port, function()
    {
        logger.info(`listening on http://0.0.0.0:${port}`);
    });
    socketApi.listen(server);
} else {
    const https = require('https');

    const privateKey = fs.readFileSync(config.sslPrivateKeyPath);
    const certificate = fs.readFileSync(config.sslCertificate);
    const ssl_object = {
        key: privateKey,
        cert: certificate
    };

    if (config.sslCa && fs.existsSync(config.sslCa))
    {
        ssl_object.ca = [ fs.readFileSync(config.sslCa) ];
    }

    server = https.createServer(ssl_object, app).listen(port, function()
    {
        logger.info(`listening on https://0.0.0.0:${port}`);
    });
    socketApi.listen(server, ssl_object);
}

//-----------------------------------------------------------------

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {

    if (req.url.indexOf("worker.js") !== -1)
    {
        res.set('Service-Worker-Allowed', '/');
    }

    if (req.url.indexOf("manifest.json") !== -1)
    {
        res.set('Content-Type', 'application/manifest+json');
    }

    return next();
});

app.use(express.static('../dist', {
    index: "templates/index.html"
}));

app.post('/putvideo', upload.single('vid'), function(req, res)
{
    //auth
    if (true !== sockethelper.httpAuth(res, req.body.password, req.body.client))
    {
        req.file && fs.unlinkSync(req.file.path);
        return logger.error("web auth failed");
    }

    if (!req.file)
    {
        var msg = "no file uploaded";
        logger.status(500).send(msg);
        return res.end(msg);
    }

    var clientNameHashed = crypto.createHash('md5').update(req.body.client).digest('hex');
    var targetName = req.file.originalname + "-" + clientNameHashed;

    video.moveVideo(req.file.path, targetName, function(err, msg)
    {
        if (err)
        {
            logger.error(err);
            return res.status(500).send(err);
        }

        logger.info(msg);
        return res.end(msg);
    });
});

app.get('/video/:videofile', function(req, res)
{
    if (true !== sockethelper.httpAuth(res, req.query.password, req.query.client))
    {
        return logger.error("web auth failed");
    }

    var videofile = req.params.videofile;
    var clientNameHashed = crypto.createHash('md5').update(req.query.client).digest('hex');

    //in videoName:  video-20160220-152355
    //on filesystem: video-20160220-152355.mp4-ac66844e53bc30cfbb02a422a8290980.mp4
    var videoName = config.mediaBasePath + "/" + videofile + ".mp4-" + clientNameHashed + ".mp4";

    if (!fs.existsSync(videoName))
    {
        return res.end("no matching video");
    }

    logger.info("Loading video " + videofile);
    res.sendFile(videoName);
});

app.post('/videos/get', function(req, res)
{
    if (true !== sockethelper.httpAuth(res, req.body.password, req.body.client))
    {
        return logger.error("web auth failed");
    }

    var videos = [];

    var clientNameHashed = crypto.createHash('md5').update(req.body.client).digest('hex');

    return glob(config.mediaBasePath + "/video-*-" + clientNameHashed + ".mp4", {}, function(err, files)
    {
        if (err)
        {
            res.end("[]");
            return logger.error("error grepping: " + err);
        }

        var sortedFiles = files.sort(function(a, b)
        {
            return fs.statSync(a).mtime.getTime() - fs.statSync(b).mtime.getTime();
        });

        sortedFiles.forEach(function(v)
        {
            videos.push(path.basename(v).split(".")[0]);
        });

        res.end(JSON.stringify(videos.reverse()));
    });
});

app.post('/pushtoken', function(req, res)
{
    var token = req.body.tkn;
    var clientName = req.body.client;

    //auth
    if (true !== sockethelper.httpAuth(res, req.body.password, clientName))
    {
        return logger.error("web auth failed");
    }

    storage.savePushToken(clientName, token, false, function(err, resp)
    {
        if (err)
        {
            logger.error("could not store push token", err);
        }
        else
        {
            logger.info("saved push tokens: " + resp);
        }

        return res.end();
    });
});

app.post('/push', function(req, res)
{
    var clientData = req.body.client;
    var response = { message: "" };
    var respond = function(res, msg)
    {
        response.message = msg;
        return res.end(JSON.stringify(response));
    };

    //---------------------------------------------

    try {
        clientData = JSON.parse(clientData);

        if (Object.keys(clientData).length === 0)
        {
            return respond(res, "No client registered");
        }
    } catch (err) {
        logger.error("push parsing for ", clientData, err);
        return respond(res, "Invalid request");
    }

    //---------------------------------------------

    logger.info("received push request for", clientData);

    var callbacks = [];

    //password validation and callback construction for every client
    for (var clientName in clientData)
    {
        var clientPassword = clientData[clientName].password;

        if (true === sockethelper.httpAuth(res, clientPassword, clientName, true))
        {
            console.log("adding success callback for " + clientName);

            (function(c)
            {
                callbacks.push(function(cb)
                {
                    storage.dailySummary(c, cb);
                });
            }(clientName));
        }
        else
        {
            (function(c)
            {
                callbacks.push(function(cb)
                {
                    cb(null, "No connection for client " + c);
                });
            }(clientName));
        }
    }

    async.parallel(callbacks, function(err, data)
    {
        //only one error callback is being executed.
        if (err)
        {
            return respond(res, "Received error aggregating push information: " + err);
        }

        //all the succeeding callbacks are packed together in "data"
        data = data.join("---\n");

        return respond(res, data);
    });
});

app.get('/clients/get', function(req, res)
{
    var clients = [];

    socketApi.getSockets().forEach(function(s)
    {
        if (sockethelper.getSocketType(s) === "client")
        {
            clients.push
            ({
                id: s.id,
                address: s.client.conn.remoteAddress,
                client_name: sockethelper.getClientName(s),
                connected_at: s.handshake.query.connected_at
            });
        }
    });

    res.end(JSON.stringify(clients));
});

//-----------------------------------------------------------------

app.post('/api/:client?/:command?', function(req, res)
{
    if (!req.body.apitoken)
    {
        return res.status(401).end("missing api token.");
    }

    var client = req.params.client;

    if (!client)
    {
        return res.status(404).end("invalid api request, missing client name.");
    }

    var command = req.params.command;

    if (!command)
    {
        return res.status(404).end("invalid api request, missing command.");
    }

    var clientSocket = sockethelper.getClientSocketByClientName(client);

    if (!clientSocket)
    {
        return res.status(404).end("client " + client + " not found.");
    }

    var apitoken = crypto.createHash('sha512').update(req.body.apitoken).digest('hex');

    if (true !== sockethelper.apiAuth(res, apitoken, client))
    {
        return logger.error("invalid apitoken for " + client);
    }

    if (!(command in uiApi))
    {
        return res.status(404).end("unknown command " + command);
    }

    var params = req.body;

    uiApi[command](clientSocket, params, function(err, resp)
    {
        console.log("got", err, resp);

        if (err)
        {
            if (typeof err == "object")
            {
                try {
                    err = JSON.stringify(err, null, 4);
                } catch (e) {}
            }

            err = err.toString();

            return res.status(400).end(err);
        }

        if (typeof resp == "object")
        {
            try {
                resp = JSON.stringify(resp, null, 4);
            } catch (e) {}
        }

        resp = resp.toString();

        return res.status(200).end(resp);
    });
});

//---------------------------------------------------------------------------
