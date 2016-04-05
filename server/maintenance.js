var logger = require("./logger");
var storage = require("./storage");
var async = require("async");
var moment = require("moment");

exports.info = function(client_id, onfinished)
{
    logger.info("maintenance call info for client " + client_id);

    var db = storage.getDatabase();

    //last aggregated datapoint
    var aggregationpoints = db.collection('aggregationpoints');
    var datapoints = db.collection('datapoints');
    var systemlog = db.collection('systemlog');

    async.series
    ({
        lastAggregatedDatapoint: function(cb)
        {
            aggregationpoints.find({ client_id: client_id }, { sort: [['to', -1]], limit : 1 }).toArray(function(err, docs)
            {
                return cb(err, docs);
            });
        },
        // --------------------------------------------------------------------------
        firstDatapoint: function(cb)
        {
            datapoints.find({ client_id: client_id }, { sort: [['created', 1]], limit : 1 }).toArray(function(err, docs)
            {
                return cb(err, docs);
            });
        },
        // --------------------------------------------------------------------------
        aggregationCount: function(cb)
        {
            aggregationpoints.count(function(err, count)
            {
                return cb(err, count);
            });
        },
        // --------------------------------------------------------------------------
        datapointCount: function(cb)
        {
            datapoints.count(function(err, count)
            {
                return cb(err, count);
            });
        },
        // --------------------------------------------------------------------------
        logCount: function(cb)
        {
            systemlog.count(function(err, count)
            {
                return cb(err, count);
            });
        },
        // --------------------------------------------------------------------------
        firstLog: function(cb)
        {
            systemlog.find({}, { sort: [['created', 1]], limit : 1 }).toArray(function(err, docs)
            {
                return cb(err, docs);
            });
        },
        // --------------------------------------------------------------------------
        systemLog: function(cb)
        {
            //fetch all log entries with either global scope or client scope for the current client
            systemlog.find({ $or: [ {
                clientname: client_id
            }, {
                globalscope: true
            }]}, {
                sort: [['created', -1]],
                limit : 20
            }).toArray(function(err, docs)
            {
                return cb(err, docs);
            });
        }
    },
    function(err, results)
    {
        if (err)
        {
            return onfinished(err);
        }

        var retval = [];

        //----------------------------------------------------

        var lastAgg = results.lastAggregatedDatapoint[0];

        if (lastAgg)
        {
            retval.push({
                type: "Last Aggregated Datapoint",
                time: moment(lastAgg.created).format("DD.MM. HH:mm"),
                text: "For end time " + moment(lastAgg.to).format("DD.MM. HH:mm") + " and client '" + lastAgg.client_id  + "'"
            });
        }
        else
        {
            retval.push({
                type: "Last Aggregated Datapoint",
                time: moment().format("DD.MM. HH:mm"),
                text: "No aggregated datapoint yet"
            });
        }

        //----------------------------------------------------

        var firstDatapoint = results.firstDatapoint[0];

        retval.push({
            type: "First Datapoint",
            time: moment(firstDatapoint.created).format("DD.MM. HH:mm"),
            text: "For data type '" + firstDatapoint.type + "' and client '" + firstDatapoint.client_id + "'"
        });

        //----------------------------------------------------

        var aggCount = results.aggregationCount;

        retval.push({
            type: "Aggregated Datapoint Count",
            time: moment().format("DD.MM. HH:mm"),
            text: aggCount + " aggregated datapoints total in database"
        });

        //----------------------------------------------------

        var dpCount = results.datapointCount;

        retval.push({
            type: "Datapoint Count",
            time: moment().format("DD.MM. HH:mm"),
            text: dpCount + " datapoints total in database"
        });

        //----------------------------------------------------

        var firstLog = results.firstLog[0];

        if (firstLog)
        {
            retval.push({
                type: "First Log Entry",
                time: moment(firstLog.created).format("DD.MM. HH:mm"),
                text: results.logCount + " logs total in database"
            });
        }
        else
        {
            retval.push({
                type: "First Log Entry",
                time: moment().format("DD.MM. HH:mm"),
                text: "Log Entries empty"
            });
        }

        //----------------------------------------------------

        var syslog = [];

        results.systemLog.forEach(function(s)
        {
           syslog.push({
                created: moment(s.created).format("DD.MM. HH:mm"),
                loglevel: s.loglevel,
                message: s.message,
                globalscope: s.globalscope,
                clientname: s.clientname
           });
        });

        return onfinished(null, retval, syslog);
    });
};