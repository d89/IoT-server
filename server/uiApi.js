var logger = require('./logger');
var sockethelper = require('./sockethelper');
var storage = require('./storage');
var maintenance = require('./maintenance');
var moment = require('moment');

var uiApi =
{
    //-------------------------------------------------------------------------------------
    'ui:get-socket-info': function (clientSocket, msg, resp)
    {
        logger.info("getting client socket info");

        var capabilities = JSON.parse(clientSocket.handshake.query.capabilities) || [];

        resp(null, {
            capabilities: capabilities,
            client_name: clientSocket.handshake.query.client_name,
            connected_at: clientSocket.handshake.query.connected_at
        });
    },
    //-------------------------------------------------------------------------------------
    'ui:maintenance-info': function (clientSocket, msg, resp)
    {
        //logger.info("getting system maintenance info");

        var client_id = sockethelper.getClientName(clientSocket);

        return maintenance.info(client_id, function (err, infotext, syslogEntries)
        {
            var errResponse = function (err) {
                logger.error(err);
                return resp(err);
            };

            if (err) {
                return errResponse(err);
            }

            var data = {
                start: msg.start
            };

            var request = {
                mode: "log"
            };

            clientSocket.emit("maintenance", request, function (err, logResponse) {
                if (err) {
                    return errResponse(err);
                }

                return resp(err, infotext, syslogEntries, logResponse);
            });
        });
    },
    //-------------------------------------------------------------------------------------
    'ui:data-count': function (clientSocket, msg, resp)
    {
        logger.info("getting data count");

        var client_id = sockethelper.getClientName(clientSocket);

        storage.getLastCount(client_id, function (err, count) {

            if (err)
                return resp(err);

            resp(null, {
                count: count
            });
        })
    },
    //-------------------------------------------------------------------------------------
    'ui:start-stop-stream': function (clientSocket, msg, resp)
    {

        logger.info("ui request to start/stop streaming", msg);

        //start or stop stream?
        var data = {
            start: msg.start
        };

        clientSocket.emit('start-stop-stream', data, function(err, msg)
        {
            if (err)
            {
                return resp({
                    error: err
                });
            }

            return resp(null, {
                message: msg
            });
        });
    },
    //-------------------------------------------------------------------------------------
    'ui:full': function (clientSocket, msg, resp)
    {
        //logger.info("full request from ui: ", msg);

        var type = msg.type;

        var client_id = sockethelper.getClientName(clientSocket);

        storage.getDataPoints(type, client_id, function (err, data) {
            if (err) {
                logger.error("could not get data points", err);
                return resp(err);
            }

            //logger.info("data", data);

            var datapoints = [];

            for (var i = 0; i < data.length; i++) {
                datapoints.push({
                    id: data[i]._id,
                    data: data[i].data,
                    type: data[i].type,
                    created: data[i].created
                });
            }

            resp(null, datapoints);
        });
    },
    //-------------------------------------------------------------------------------------
    'ui:aggregation': function (clientSocket, query, resp)
    {
        var start = moment(query.start);
        var end = moment(query.end);
        var interval = query.interval;
        var skipcache = query.skipcache;

        logger.info("aggregation request from ui from " + start + " to " + end + " in interval", interval);

        var client_id = sockethelper.getClientName(clientSocket);
        var client_capabilities = JSON.parse(clientSocket.handshake.query.capabilities) || [];
        var progressFunc = function(socket)
        {
            return function(progress) {
                //logger.info("setting progress " + progress);
                socket.emit('progress', { progress: progress });
            }
        };

        storage.aggregation(start, end, interval, client_capabilities.sensors, client_id, skipcache, progressFunc(clientSocket), function (err, dps) {
            //logger.info("responding to last hour request", dps);
            resp(null, dps);
        });
    },
    //-------------------------------------------------------------------------------------
    'ui:execute-actor': function (clientSocket, msg, resp)
    {
        if (!("actor" in msg) || !("method" in msg))
        {
            return resp({
                error: "specify both actor and method"
            });
        }

        var request = {
            actor: msg.actor,
            method: msg.method,
            params: msg.params || []
        };

        clientSocket.emit("execute-actor", request, function(err, msg)
        {
            if (err)
            {
                return resp({
                    error: err
                });
            }

            return resp(null, {
                message: msg
            });
        });
    },
    //-------------------------------------------------------------------------------------
    'ui:maintenance': function (clientSocket, msg, resp)
    {
        clientSocket.emit("maintenance", msg, resp);
    },
    //-------------------------------------------------------------------------------------
    'ui:scenario': function (clientSocket, msg, resp)
    {
        clientSocket.emit("scenario", msg, resp);
    },
    //-------------------------------------------------------------------------------------
    'ui:audio': function (clientSocket, msg, resp)
    {
        msg.mode = msg.mode || "list";

        if (msg.mode === "list")
        {
            clientSocket.emit("audio", { mode: "list" }, resp);
        }
        else if (msg.mode === "delete")
        {
            clientSocket.emit("audio", { mode: "delete", file: msg.file }, function(err, msg)
            {
                if (err)
                {
                    return resp({
                        error: err
                    });
                }

                return resp(null, {
                    message: msg
                });
            });
        }
    },
    //-------------------------------------------------------------------------------------
    'ui:ifttt': function (clientSocket, msg, resp)
    {

        var request = {};

        if (msg.mode === "conditionlist")
        {
            request.mode = "conditionlist";
        }
        else if (msg.mode === "testconditions")
        {
            request.mode = "testconditions";
            request.testconditions = msg.testconditions || [];
        }
        else if (msg.mode === "saveconditions")
        {
            request.mode = "saveconditions";
            var conds = [];

            msg.conditions = msg.conditions || [];

            msg.conditions.forEach(function(c)
            {
                conds.push({
                    isActive: c.isActive,
                    conditiontext: c.conditiontext,
                    id: c.id
                });
            });

            request.conditions = conds;

            logger.info("setting conditions", request.conditions);
        }
        else if (msg.mode == "availableoptions")
        {
            request.mode = "availableoptions";
        }

        logger.info("sending ifttt request to client", request);

        clientSocket.emit("ifttt", request, function(err, data)
        {
            //logger.info("got ifttt answer", err, data);
            resp(err, data);
        });
    }
};

module.exports = uiApi;