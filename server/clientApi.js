var sockethelper = require('./sockethelper');
var storage = require('./storage');
var logger = require('./logger');
var push = require('./push');
var mail = require('./mail');

var clientApi =
{
    'client:iftttupdate': function(clientSocket, msg, resp)
    {
        msg.client_id = sockethelper.getClientName(clientSocket);

        sockethelper.getUiSocketsByClientSocket(clientSocket).forEach(function(uiSocket)
        {
            uiSocket.emit("iftttupdate", msg);
        });
    },
    'client:data': function(clientSocket, msg, resp)
    {
        msg.client_id = sockethelper.getClientName(clientSocket);

        var capabilities = JSON.parse(clientSocket.handshake.query.capabilities)
        var type = msg.type;

        var sendToUi = function(socket, msg)
        {
            sockethelper.getUiSocketsByClientSocket(socket).forEach(function(uiSocket)
            {
                uiSocket.emit("dataupdate", msg);
            });

            //logger.info("data update for ui", msg);
        };

        //only persist data that is also shown in charts. So don't store the current time
        //for example, that is only there for the ifttt "current value" info

        var isContained = false;

        capabilities.sensors.forEach(function(cap)
        {
            if (cap.name === type)
            {
                isContained = true;
            }
        });

        if (!isContained)
        {
            //console.log("did not store " + type);
            return sendToUi(clientSocket, msg);
        }

        var persistClientData = function(msg, cb)
        {
            //logger.info("got from client", msg);

            if (!("type" in msg) || !("data" in msg) || !("client_id" in msg) || !("created" in msg))
            {
                return cb("malformatted message", msg);
            }

            var data = msg.data;

            storage.persistDataPoint(msg.type, data, msg.client_id, msg.created, function(err, msg)
            {
                if (err)
                    return cb(err);

                return cb(null, `extracted ${msg.type}: ${data}`);
            });
        };

        persistClientData(msg, function(err, resp)
        {
            if (err)
            {
                logger.error("could not store data point: ", err, msg);
                return;
            }

            return sendToUi(clientSocket, msg);
        });
    },
    //-------------------------------------------------------------------------------------
    'client:youtube-download': function(clientSocket, msg, resp)
    {
        sockethelper.getUiSocketsByClientSocket(clientSocket).forEach(function(uiSocket)
        {
            uiSocket.emit("youtube-download", msg);
        });
    },
    //-------------------------------------------------------------------------------------
    'client:push': function(clientSocket, msg, resp)
    {
        var clientName = sockethelper.getClientName(clientSocket);

        push.push(clientName, function(err, msg)
        {
            resp(err, msg);
        });
    },
    //-------------------------------------------------------------------------------------
    'client:mail': function(clientSocket, msg, resp)
    {
        mail.mail(msg.to, msg.subject, msg.text, resp);
    },
    //-------------------------------------------------------------------------------------
    'client:live-stream': function(clientSocket, msg, resp)
    {
        logger.info("got image from client @ " + msg.date);
        //pipe stream to waiting ui

        var uiSockets = sockethelper.getUiSocketsByClientSocket(clientSocket);

        if (uiSockets.length === 0)
        {
            resp({
                received: false
            });

            return logger.info(`no waiting ui client for stream`);
        }

        logger.info("confirming stream to client");

        resp({
            received: true
        });

        uiSockets.forEach(function(uiSocket)
        {
            uiSocket.emit('cam-stream', {
                date: msg.date,
                now: msg.now,
                image: msg.image
            });
        });
    }
};

module.exports = clientApi;