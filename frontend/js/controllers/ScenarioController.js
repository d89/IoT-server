IoT.controller('IoTScenarioCtrl', function ($scope, $rootScope, $timeout, $compile, $routeParams, $location, constant, SocketFactory)
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
            active: true
        },
        {
            title: "If This, Then That",
            href: "#ifttt/" + $routeParams.client_id
        },
        {
            title: "Maintenance",
            href: "#maintenance/" + $routeParams.client_id
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

    $scope.loadScenarios = function(onloaded)
    {
        if (!("scenario" in $scope.supportsActor))
        {
            return onloaded();
        }

        SocketFactory.send("ui:scenario", {
            type: "load"
        }, function(err, msg)
        {
            if (err)
            {
                SocketFactory.callLifecycleCallback("functional_error", "Could not load scenarios: " + err);
            }
            else
            {
                $scope.scenarios = msg;
                console.log("the scenarios", $scope.scenarios);
                onloaded();
            }
        });
    };

    $scope.createScenario = function()
    {
        return $location.path('/action/' + $routeParams.client_id + '/scenario/add/1');
    };

    $scope.editScenario = function(name)
    {
        return $location.path('/action/' + $routeParams.client_id + '/scenario/edit/' + name);
    };

    $scope.deleteScenario = function(name)
    {
        $scope.scenarioExecution = {
            state: true,
            message: "executed, please wait."
        };

        SocketFactory.send("ui:scenario", {
            type: "delete",
            name: name
        }, function(err, data)
        {
            if (err)
            {
                var msg = "invalid error from server: " + err;

                if ("error" in err) {
                    msg = err.error;
                }

                $scope.scenarioExecution = {
                    state: false,
                    message: msg
                };
            }
            else
            {
                console.log("got message", data);

                $scope.scenarios = data;

                $scope.scenarioExecution = {
                    state: true,
                    message: "successfully deleted scenario"
                };
            }
        });
    };

    $scope.executeScenario = function(name)
    {
        var execute = {
            actor: "scenario",
            method: "execute",
            params: [name]
        };

        $scope.scenarioExecution = {
            state: true,
            message: "executed, please wait."
        };

        SocketFactory.send("ui:execute-actor", execute, function(err, data)
        {
            if (err)
            {
                var msg = "invalid error from server: " + err;

                if ("error" in err) {
                    msg = err.error;
                }

                $scope.scenarioExecution = {
                    state: false,
                    message: msg
                };
            }
            else
            {
                console.log("got message", data);

                var msg = "invalid message from server: " + data;

                if ("message" in data) {
                    msg = data.message;
                }

                $scope.scenarioExecution = {
                    state: true,
                    message: msg
                };
            }
        });
    };

    $scope.init = function()
    {
        $rootScope.mainHeadline = "IoT Portal: Scenarios";
        $rootScope.subHeadline = "Create and Execute Scenarios";

        $scope.connect(false, function()
        {
            $scope.loadScenarios(function()
            {
                $scope.loaded = true;
                //$scope.$apply();
            });
        });
    };

    //-----------------------------------------------------

    $scope.init();
});