var socketApi = require('./socketApi');
var logger = require('./logger');

exports.getSocketType = function(socket)
{
    if (socket.handshake.query.mode === "ui" && exports.getClientId(socket))
    {
        return "ui";
    }

    if (socket.handshake.query.mode === "client" && exports.getClientName(socket))
    {
        return "client";
    }

    return false;
};

//ui socket
exports.getClientId = function(socket)
{
    if (socket.handshake.query.mode === "ui" && socket.handshake.query.client)
    {
        return socket.handshake.query.client;
    }

    return false;
};

//client socket
exports.getClientName = function(socket)
{
    if (!socket)
    {
        return false;
    }

    if (socket.handshake.query.mode === "client" && socket.handshake.query.client_name)
    {
        return socket.handshake.query.client_name;
    }

    return false;
};

exports.getUiSocketsByClientSocket = function(clientSocket)
{
    var responseUiSockets = [];

    socketApi.getSockets().forEach(function(s)
    {
        if (exports.getSocketType(s) === "ui" && exports.getClientId(s) === exports.getClientName(clientSocket))
        {
            responseUiSockets.push(s);
        }
    });

    return responseUiSockets;
};

exports.getClientSocketByUiSocket = function(uiSocket, dataReceived)
{
    var forClient = exports.getClientId(uiSocket);
    var responseClientSocket = null;

    socketApi.getSockets().forEach(function(s)
    {
        if (exports.getSocketType(s) === "client" && forClient === exports.getClientName(s))
        {
            //logger.info(`found listening client socket: ${s.id}!`);
            responseClientSocket = s;
            return;
        }
    });

    if (!responseClientSocket)
    {
        return {
            error: "disconnect"
        };
    }

    var uiPassword = dataReceived && dataReceived.password;
    var clientPassword = responseClientSocket.handshake.query.password;

    if (uiPassword !== clientPassword)
    {
        logger.error("client socket found, password wrong!");

        return {
            error: "wrongpassword",
            socket: responseClientSocket
        };
    }

    return {
        socket: responseClientSocket
    };
};

exports.getClientSocketByClientName = function(clientName)
{
    if (!clientName)
    {
        return false;
    }

    var responseClientSocket = null;

    socketApi.getSockets().forEach(function(s)
    {
        if (exports.getSocketType(s) === "client" && exports.getClientName(s) === clientName)
        {
            logger.info(`found listening client socket for name ${clientName}: ${s.id}!`);
            responseClientSocket = s;
            return;
        }
    });

    return responseClientSocket;
};

exports.httpAuth = function(res, password, clientName, justReturn)
{
    var clientSocket = exports.getClientSocketByClientName(clientName);

    if (!clientSocket)
    {
        if (justReturn) return false;
        return res.status(404).send('Client "' + clientName + '" not found.');
    }

    var clientPassword = clientSocket.handshake.query.password;
    if (password !== clientPassword)
    {
        if (justReturn) return false;
        return res.status(401).send('Wrong password for "' + clientName + '".');
    }

    return true;
};

exports.apiAuth = function(res, token, clientName, justReturn)
{
    var clientSocket = exports.getClientSocketByClientName(clientName);

    if (!clientSocket)
    {
        if (justReturn) return false;
        return res.status(404).send('Client "' + clientName + '" not found.');
    }

    var apitoken = clientSocket.handshake.query.apitoken;

    if (!apitoken)
    {
        return res.status(401).send('API access disabled for "' + clientName + '".');
    }

    if (token !== apitoken)
    {
        if (justReturn) return false;
        return res.status(401).send('Wrong token for "' + clientName + '".');
    }

    return true;
};