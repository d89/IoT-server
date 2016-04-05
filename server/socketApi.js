var io = require('socket.io')();
var middleware = require('socketio-wildcard')();
var logger = require('./logger');
var sockethelper = require('./sockethelper');
var storage = require('./storage');
var clientApi = require('./clientApi');
var uiApi = require('./uiApi');

io.use(middleware);

io.on('connection', function(socket)
{
    logger.info(`new connection ${socket.id} from ${socket.client.conn.remoteAddress}`);

    var socketType = null;

    switch (sockethelper.getSocketType(socket))
    {
        case "ui":
            socketType = "ui";
            var clientId = sockethelper.getClientId(socket);

            if (!clientId)
            {
                logger.error("invalid client id for ui socket.");
                socket.disconnect();
                return;
            }

            logger.info(`... is UI connection for ${clientId}`);
            break;
        case "client":
            socketType = "client";

            var clientName = sockethelper.getClientName(socket);

            if (!clientName)
            {
                logger.error("invalid client id for client socket.");
                socket.disconnect();
                return;
            }

            var newConnection = `... is client connection ${clientName}`;
            logger.info(newConnection);
            storage.logEntry("info", newConnection, clientName);
            break;
        default:
            logger.error("... is invalid connection", socket.handshake);
            socket.disconnect();
    }

    if (!socketType)
    {
        socket.disconnect();
        return;
    }

    //###########################################################################

    socketType === "ui" && socket.on('*', function(msg)
    {
        //-------------------------------------------------------------------------------------

        var eventType = msg.data[0];
        var payload = msg.data[1];
        var respFunc = msg.data[2];

        var resp = sockethelper.getClientSocketByUiSocket(socket, payload);

        if (resp.error)
        {
            console.error("could not find client for ui: " + resp.error);

            if (respFunc)
            {
                respFunc(resp.error);

                if (resp.error === "wrongpassword")
                {
                    console.error("disconnecting from ui socket - wrong password!");
                    socket.disconnect();
                }
            }

            return;
        }

        uiApi[eventType](resp.socket, payload, respFunc);
    });

    //###########################################################################

    //disconnect can not be caught by the "catch all" handler
    socketType === "client" && socket.on("disconnect", function(msg, resp)
    {
        sockethelper.getUiSocketsByClientSocket(socket).forEach(function(uiSocket)
        {
            uiSocket.emit("client-disconnected", {
                id: socket.id
            });
        });

        logger.info(`socket ${socket.id} disconnected: ${msg}`);
    });

    socketType === "client" && socket.on('*', function(msg)
    {
        var eventType = msg.data[0];
        var payload = msg.data[1];
        var respFunc = msg.data[2];

        clientApi[eventType](socket, payload, respFunc);
    });
});

exports.listen = function(server, ssl_object)
{
    io = io.listen(server, ssl_object);
};

exports.getSockets = function()
{
    var sockets = io.sockets.sockets;
    var socks = [];

    //is array
    if ("length" in io.sockets.sockets)
    {
        return io.sockets.sockets;
    }

    //is object
    Object.keys(io.sockets.sockets).forEach(function(s)
    {
        var sock = io.sockets.sockets[s];
        socks.push(sock);
    });

    return socks;
};