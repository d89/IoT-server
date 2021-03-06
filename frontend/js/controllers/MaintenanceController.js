IoT.controller('IoTMaintenanceCtrl', function ($scope, $rootScope, $timeout, $compile, $routeParams, $location, constant, SocketFactory)
{
    //-----------------------------------------------------

    $rootScope.showLogout = true;

    $rootScope.sidebar =
    {
        "Sensor Data":
        [{
            title: "Dashboard",
            href: "#dashboard/" + $routeParams.client_id
        },
        {
            title: "History",
            href: "#history/" + $routeParams.client_id
        }],
        "Actions":
        [{
            title: "Action",
            href: "#action/" + $routeParams.client_id
        },
        {
            title: "Scenario",
            href: "#scenario/" + $routeParams.client_id,
        },
        {
            title: "If This, Then That",
            href: "#ifttt/" + $routeParams.client_id
        },
        {
            title: "Maintenance",
            href: "#maintenance/" + $routeParams.client_id,
            active: true
        },
        {
            title: "Video",
            href: "#video/" + $routeParams.client_id
        },
        {
            title: "Audio",
            href: "#audio/" + $routeParams.client_id
        }],
        "Device Overview":
        [{
            title: "Connected Devices",
            href: "#index"
        }]
    };

    //-----------------------------------------------------

    $scope.restart = function()
    {
        console.log("restart!");

        var restart = {
            mode: "restart"
        };

        SocketFactory.send("ui:maintenance", restart);
    };

    $scope.shutdown = function()
    {
        console.log("shutdown!");

        var shutdown = {
            mode: "shutdown"
        };

        SocketFactory.send("ui:maintenance", shutdown);
    };

    $scope.clearLogs = function()
    {
        console.log("clearing logs!");

        var clearlogs = {
            mode: "clearlogs"
        };

        SocketFactory.send("ui:maintenance", clearlogs, function()
        {
            window.location.reload();
        });
    };

    $scope.checkUpdate = function()
    {
        console.log("checking for update!");

        SocketFactory.send("ui:maintenance", {
            mode: "updatechanges"
        }, function(err, resp)
        {
            if (err) {
                $scope.updateCheckText = "Error: " + err;
            } else {
                $scope.updateCheckText = resp;

                if ($scope.updateCheckText.indexOf("An Update Is Available") !== -1)
                {
                    $scope.updateAvailable = true;
                }
            }

            //loaded
            setTimeout(function()
            {
                $(".update.block-opt-refresh").removeClass("block-opt-refresh");
            }, 300);
        });
    };

    $scope.updateLog = function()
    {
        SocketFactory.send("ui:maintenance", {
            mode: "updatelog"
        }, function(err, resp)
        {
            if (err)
                $scope.updateCheckText = err;
            else
                $scope.updateCheckText = resp;
        });
    };

    $scope.performUpdate = function()
    {
        if (!window.confirm("Do you really want to execute the update? Your Raspberry will disconnect and reconnect after the update."))
        {
            return;
        }

        $(".update").addClass("block-opt-refresh");

        $scope.updateCheckText = "Triggering Update, please wait.";
        $scope.updateAvailable = false;

        SocketFactory.send("ui:maintenance", {
            mode: "update"
        }, function(err, resp)
        {
            //should not respond, disconnect is expected
            if (err)
                SocketFactory.callLifecycleCallback("functional_error", "Could not execute update: " + err);
            else
                SocketFactory.callLifecycleCallback("functional_error", "Update responded: " + resp);
        });
    };

    $scope.getMaintenanceInfo = function()
    {
        console.log("fetching maintenance info");

        SocketFactory.send('ui:maintenance-info', {}, function(err, infotext, syslogentries, logfileText)
        {
            if (!err)
            {
                $scope.infotext = infotext;

                $scope.logfile = [];

                logfileText.forEach(function(l)
                {
                    var logEntry = {};

                    logEntry.loglevel = l.level;

                    switch (logEntry.loglevel)
                    {
                        case "info":
                            logEntry.icon = "fa fa-info-circle";
                            break;
                        case "warn":
                        case "error":
                            logEntry.icon = "fa fa-warning";
                            break;
                         default:
                             logEntry.icon = "si si-question";
                    }

                    logEntry.message = l.message;
                    logEntry.created = moment(l.timestamp).format("DD.MM. HH:mm:ss");

                    $scope.logfile.push(logEntry);
                });

                syslogentries.forEach(function(s)
                {
                    switch (s.loglevel)
                    {
                        case "info":
                            s.icon = "fa fa-info-circle";
                            break;
                        case "warning":
                        case "error":
                            s.icon = "fa fa-warning";
                            break;
                        case "success":
                            s.icon = "fa fa-check-circle";
                            break;
                        default:
                            s.icon = "si si-question";
                    }

                    if (s.clientname)
                    {
                        s.loglevel = "client " + s.loglevel;
                    }
                    else if (s.globalscope)
                    {
                        s.loglevel = "global " + s.loglevel;
                    }
                });

                $scope.syslogentries = syslogentries;

                $scope.$apply();

                //loaded
                setTimeout(function()
                {
                    $(".log.block-opt-refresh").removeClass("block-opt-refresh");
                }, 300);
            }
            else
            {
                SocketFactory.callLifecycleCallback("functional_error", "Error generating maintenance info: " + err);
            }
        });
    };

    //-----------------------------------------------------

    $scope.init = function()
    {
        $rootScope.mainHeadline = "IoT Portal: Maintenance";
        $rootScope.subHeadline = "See Recent Activities And Logs";

        $scope.connect(false, function()
        {
            $scope.getMaintenanceInfo();
            $scope.checkUpdate();
        });
    };

    //-----------------------------------------------------

    $scope.init();
});