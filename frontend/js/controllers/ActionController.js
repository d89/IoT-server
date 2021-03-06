IoT.controller('IoTActionCtrl', function ($scope, $rootScope, $timeout, $compile, $routeParams, $location, constant, SocketFactory)
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
            href: "#action/" + $routeParams.client_id,
            active: true
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

    $scope.scenarioName = "";

    $scope.scenarioTimeout = [{
        timeout: 1000
    },{
        timeout: 5000
    },{
        timeout: 30000
    }];

    $scope.scenarioList = [];
    $scope.allScenarios = [];

    $scope.addToScenarioList = function(object, justReturn, addToIndex)
    {
        var obj = {};
        var className = "btn-default";

        if ("timeout" in object)
        {
            obj = {
                label: "Timeout (" + object.timeout + "ms)",
                object: object
            };
        }
        else
        {
            var paramString = "";
            var reducedParams = [];

            object.params.forEach(function(p)
            {
                if (p.toString().length > 0)
                {
                    reducedParams.push(p);
                }
            });

            if (reducedParams.length)
            {
                paramString = '"' + reducedParams.join('", "') + '"';
            }

            if ("actor" in object && object.actor in $scope.actors && object.method in $scope.actors[object.actor])
            {
                className = $scope.actors[object.actor][object.method].colorClass;
            }

            obj = {
                label: object.actor + "." + object.method + '(' + paramString + ')',
                object: object
            };
        }

        obj.className = className;

        if (justReturn)
        {
            return obj;
        }

        if (addToIndex != undefined)
        {
            $scope.scenarioList.splice(addToIndex, 0, obj);
        }
        else
        {
            $scope.scenarioList.push(obj);
        }

        (function(addToIndex, listLength, object)
        {
            setTimeout(function()
            {
                var flashPosition = addToIndex != undefined ? addToIndex : listLength - 1;
                var listItem = $("#scenarioDropzone li:eq(" + flashPosition + ")");
                Styles.blink(listItem);
            }, 300);
        }(addToIndex, $scope.scenarioList.length, object));
    };

    $scope.onDrop = function(list, item, index)
    {
        //console.log("ondrop", list, item, index);

        //already processed: reordering inside the list
        if ("label" in item)
        {
            return item;
        }

        //dragging the actor inside
        if ("dragActor" in item)
        {
            var addToIndex = index;
            $scope.execute(item.actorname, item.methodname, addToIndex);
            return false;
        }

        return $scope.addToScenarioList(item, true);
    };

    $scope.dragActor = function(actorname, methodname)
    {
        return {
            dragActor: true,
            actorname: actorname,
            methodname: methodname
        };
    };

    $scope.manageScenarios = function()
    {
        return $location.path('/scenario/' + $routeParams.client_id);
    };

    $scope.saveScenario = function()
    {
        if ($scope.scenarioList.length === 0)
        {
            $scope.scenarioStatus = {
                message: "No actor inside this scenario.",
                state: false
            };

            return;
        }

        if ($scope.scenarioName.length === 0)
        {
            $scope.scenarioStatus = {
                message: "Please put a name for this scenario.",
                state: false
            };

            return;
        }

        $scope.scenarioStatus = {
            message: "Executed, waiting ...",
            state: true
        };

        var saveScenario = [];

        $scope.scenarioList.forEach(function(s)
        {
            saveScenario.push(s.object);
        });

        console.info("SAVING", saveScenario);

        SocketFactory.send("ui:scenario", {
            type: "save",
            data: saveScenario,
            name: $scope.scenarioName
        }, function(err, msg)
        {
            if (err)
            {
                $scope.scenarioStatus = {
                    message: err,
                    state: false
                };
            }
            else
            {
                $scope.scenarioStatus = {
                    message: msg,
                    state: true
                };

                $scope.actors["scenario"]["execute"].params["name"].value = $scope.scenarioName;

                setTimeout(function()
                {
                    $location.path('/scenario/' + $routeParams.client_id);
                }, 500);
            }
        });
    };

    //-----------------------------------------------------
    // tile colors

    $scope.buildColors = function()
    {
        $scope.colors = {};

        var baseStyles = ["primary", "gray", "amethyst", "city", "flat", "modern", "smooth"];
        var suffixes = ["", "light", "dark", "darker"];

        baseStyles.forEach(function(b, idx)
        {
            $scope.colors[idx] = [];

            suffixes.forEach(function(s)
            {
                var color = b;
                if (s) color += "-" + s;

                $scope.colors[idx].push("bg-" + color)
            });
        });
    };

    $scope.pickColor = function(actorname, idx)
    {
        var firstLetter = actorname[0].toLowerCase();
        //see http://stackoverflow.com/questions/22624379/how-to-convert-letters-to-numbers-with-javascript
        var alphabetPosition = firstLetter.charCodeAt(0) - 97;
        var colorgroup = alphabetPosition % Object.keys($scope.colors).length;

        if ($scope.colors[colorgroup].length <= idx)
        {
            idx -= ($scope.colors[colorgroup].length);
        }

        var color = $scope.colors[colorgroup][idx];

        return color;
    };

    //-----------------------------------------------------
    // persistence in localStorage

    $scope.getParamValue = function(actor, method, name)
    {
        var params = $scope.getParamStorage();

        if (actor in params && method in params[actor] && name in params[actor][method])
        {
            return params[actor][method][name];
        }

        return "";
    };

    $scope.getParamStorage = function()
    {
        var paramStorage = {};

        try {
            paramStorage = JSON.parse(localStorage.getItem("paramStorage") || "{}");
        } catch (err) {
            paramStorage = {};
        }

        return paramStorage;
    };

    $scope.setParamStorage = function(paramStorage)
    {
        localStorage.setItem("paramStorage", JSON.stringify(paramStorage));
    };

    //-----------------------------------------------------
    // logic

    $scope.execute = function(actor, method, addToIndex)
    {
        var isValid = true;
        var paramStorage = $scope.getParamStorage();
        var availableParams = $scope.actors[actor][method].params;
        var params = [];

        Object.keys(availableParams).forEach(function(paramName)
        {
            var val = availableParams[paramName].value;
            var isRequired = !availableParams[paramName].options.isOptional;

            availableParams[paramName].hasError = false;

            if (val.length === 0 && isRequired)
            {
                isValid = false;
                availableParams[paramName].hasError = true;
            }

            if (!(actor in paramStorage))
            {
                paramStorage[actor] = {};
            }

            if (!(method in paramStorage[actor]))
            {
                paramStorage[actor][method] = {};
            }

            paramStorage[actor][method][paramName] = val;
            params.push(val);
        });

        $scope.setParamStorage(paramStorage);

        if (!isValid)
        {
            return;
        }

        var execute = {
            actor: actor,
            method: method,
            params: params
        };

        console.log("EXECUTING", execute);

        if ($scope.scenarioPanel === true)
        {
            return $scope.addToScenarioList(execute, false, addToIndex);
        }

        $scope.actors[actor][method].execution = {
            state: true,
            message: "executed"
        };

        SocketFactory.send("ui:execute-actor", execute, function(err, data)
        {
            if (err)
            {
                var msg = "invalid error from server: " + err;

                if ("error" in err) {
                    msg = err.error;
                }

                $scope.actors[actor][method].execution = {
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

                //special treatment section -----------------------------------------
                if (actor === "recorder" && method === "record")
                {
                    var soundfile = msg.split("/").pop();
                    return $location.path('/audio/' + $routeParams.client_id + '/autoplay/' + soundfile);
                }

                if (actor === "youtubedl" && method === "download2mp3")
                {
                    return $location.path('/audio/' + $routeParams.client_id + "/youtube/download");
                }

                if (actor === "cam" && method === "record")
                {
                    var videoname = msg.split(".")[0];
                    return $location.path('/video/' + $routeParams.client_id + '/autoplay/' + videoname);
                }

                //--------------------------------------------------------------------

                $scope.actors[actor][method].execution = {
                    state: true,
                    message: msg
                };
            }
        });
    };

    $scope.editScenario = function(name)
    {
        var scenario = false;

        $scope.allScenarios.forEach(function(s)
        {
            if (s.name === name)
            {
                scenario = s;
            }
        });

        if (!scenario)
        {
            return SocketFactory.callLifecycleCallback("functional_error", "Could not find scenario: " + name);
        }

        $scope.scenarioName = name;

        scenario.actors.forEach(function(actor)
        {
            $scope.addToScenarioList(actor);
        });

        $scope.showScenariosPanel();
    };

    $scope.setScenario = function(scenarioName)
    {
        $scope.actors["scenario"]["execute"].params["name"].value = scenarioName;
    };

    $scope.loadScenarios = function(cb)
    {
        if (!("scenario" in $scope.supportsActor))
        {
            return cb([]);
        }

        SocketFactory.send("ui:scenario", {
            type: "load"
        }, function(err, scenarios)
        {
            if (err)
            {
                console.error(err);
                return cb([]);
            }

            return cb(scenarios);
        });
    };

    $scope.loadActors = function(onloaded)
    {
        //console.log("available options!");

        var ifttt = {
            mode: "availableoptions"
        };

        SocketFactory.send("ui:ifttt", ifttt, function(err, opts)
        {
            //console.log("got available options response", err, opts);

            if (err)
            {
                SocketFactory.callLifecycleCallback("functional_error", "Could not load actors: " + err);
            }
            else
            {
                console.log("the options", opts);

                $scope.actors = {};

                opts.actors.forEach(function(actor)
                {
                    $scope.actors[actor.name] = {};

                    actor.methods.forEach(function(method, i)
                    {
                        $scope.actors[actor.name][method.name] = {
                            params: {},
                            execution: {},
                            colorClass: $scope.pickColor(actor.name, i)
                        };

                        method.params.forEach(function(param)
                        {
                            $scope.actors[actor.name][method.name].params[param.name] = {
                                options: param,
                                value: $scope.getParamValue(actor.name, method.name, param.name)
                            }
                        });
                    });
                });

                console.log("ACTORS", $scope.actors);
            }

            onloaded();
        });
    };

    //-----------------------------------------------------
    // init code

    $scope.checkAutoPlay = function()
    {
        var audio = $routeParams.audio;
        var lightshow = $routeParams.lightshow;
        var scenarioAdd = $routeParams.scenario_add;
        var scenarioEdit = $routeParams.scenario_edit;

        if (audio)
        {
            setTimeout(function()
            {
                var element = $("[data-actor='music'] [data-method='play']");
                Styles.hightlightScroll(element);
                $scope.actors["music"]["play"].params["title"].value = audio;
                $scope.execute("music", "play");
            }, 500);

        }
        else if (lightshow)
        {
            setTimeout(function()
            {
                var element = $("[data-actor='ledstrip'] [data-method='lightshow']");
                Styles.hightlightScroll(element);
                $scope.actors["ledstrip"]["lightshow"].params["title"].value = lightshow;
                $scope.execute("ledstrip", "lightshow");
            }, 500);
        }
        else if (scenarioAdd)
        {
            $scope.showScenariosPanel();
        }
        else if (scenarioEdit)
        {
            $scope.editScenario(scenarioEdit);
        }
    };

    $scope.musicSelection = function()
    {
        $location.path('/audio/' + $routeParams.client_id);
    };

    $scope.showScenariosPanel = function()
    {
        $scope.scenarioPanel = true;

        $("#scrollableScenario").css("top", "-1000px").animate({
            top: 300
        }, 500, function()
        {
            window.setScenarioPanelFixed();
        });
    };

    $scope.hideScenariosPanel = function()
    {
        $scope.scenarioPanel = false;
    };

    $scope.actorSearchTermChanged = function()
    {
        var term = $scope.actorSearchTerm;

        $("[data-actor]").each(function()
        {
            var actorName = $(this).attr("data-actor");

            if (actorName.indexOf(term) === -1)
            {
                $(this).hide();
            }
            else
            {
                $(this).show();
            }
        });
    };

    $scope.init = function()
    {
        $rootScope.mainHeadline = "IoT Portal: Actions";
        $rootScope.subHeadline = "Trigger Actions On Your IoT device";

        $scope.connect(false, function()
        {
            $scope.buildColors();

            $scope.loadActors(function()
            {
                $scope.loaded = true;
                $scope.$apply();

                $scope.loadScenarios(function(objs)
                {
                    $scope.allScenarios = objs;
                    $scope.checkAutoPlay();
                });
            });
        });
    };

    //-----------------------------------------------------

    $scope.init();
});

IoT.directive('scenarioPanelLayout', function()
{
    return {
        restrict: 'A',
        link: function(scope, element, attrs)
        {
            window.setScenarioPanelFixed = function()
            {
                var WIDTH_MIN = 1200;
                var TOP_POSITION_FREEZE = 73;

                if (!$("#scrollableScenario").is(":visible"))
                {
                    return;
                }

                var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

                if (width < WIDTH_MIN)
                {
                    $("#scrollableScenario").removeClass("affix").css("top", "");
                    $("#scenarioContent").css("height", "");
                    return;
                }

                if (!$("#scrollableScenario").hasClass("affix"))
                {
                    $("#scrollableScenario").addClass("affix");
                }

                //freeze top bar
                var top = $("#actionPanel").offset().top - $(this).scrollTop();
                if (top < TOP_POSITION_FREEZE) top = TOP_POSITION_FREEZE;
                $(".affix").css("top", top + "px");

                // set scroll height for sidebar
                $("#scenarioContent").css("height", $(window).height() - (TOP_POSITION_FREEZE * 2) + "px");
            };

            $(document).scroll(function()
            {
                window.setScenarioPanelFixed();
            });

            $(window).resize(function()
            {
                window.setScenarioPanelFixed();
            });
        }
    };
});