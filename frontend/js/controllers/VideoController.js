IoT.controller('IoTVideoCtrl', function ($scope, $rootScope, $timeout, $compile, $routeParams, $location, constant, SocketFactory)
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
            href: "#maintenance/" + $routeParams.client_id
        },
        {
            title: "Video",
            href: "#video/" + $routeParams.client_id,
            active: true
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

    $scope.startStream = function()
    {
        if (!("cam" in $scope.supportsActor))
        {
            return;
        }

        $scope.streamActive = true;
        $scope.streamTime = "Initializing Camera";
        $("#stream").attr("src", "assets/img/various/loading-cam.gif");

        SocketFactory.send('ui:start-stop-stream', {
            start: true
        }, function(err, msg)
        {
            if (err)
            {
                SocketFactory.callLifecycleCallback("functional_error", "Could not start stream: " + err);
                $scope.streamActive = false;
                return;
            }
        });
    };

    $scope.stopStream = function()
    {
        if (!("cam" in $scope.supportsActor))
        {
            return;
        }

        console.log("stopping stream!");

        $scope.streamActive = false;
        $scope.streamTime = "Shutting Down Stream";

        SocketFactory.send('ui:start-stop-stream', {
            start: false
        }, function(err, msg)
        {
            console.log("stop stream answer", err, msg);
        });
    };


    //-----------------------------------------------------

    $scope.$on('$routeChangeStart', function(next, current)
    {
        //user leaves this page - if stream is still running: stop it.
        $scope.stopStream();
    });

    $scope.play = function(videoName)
    {
        console.log("playing video ", videoName);
        $scope.playingVideo = true;
        $scope.videoUrl = "/video/" + videoName;
        $scope.videoParams = "?client=" + SocketFactory.clientName + "&password=" + constant.get("password");
    };

    $scope.stopVideoPlaying = function()
    {
        $scope.playingVideo = false;

        $("video").get(0).pause();
    };

    $scope.getVideos = function(cb)
    {
        $scope.loading = true;

        var options = {
            password: constant.get("password"),
            client: SocketFactory.clientName
        };

        console.info("sent get video request", options);

        $.post("/videos/get", options, function(videoResponse)
        {
            videoResponse = JSON.parse(videoResponse);

            console.log("videos", videoResponse);

            var videos = [];

            videoResponse.forEach(function(v)
            {
                var videoParts = v.split("-");
                var videoDate = moment(videoParts[1] + " " + videoParts[2]).format("DD.MM.YYYY HH:mm:ss");

                videos.push({
                    fileName: v,
                    fileDate: videoDate
                })
            });

            $scope.videos = videos;
            $scope.loading = false;

            $scope.$apply();

            if (cb) cb();
        }).fail(function(err)
        {
            console.error(err);
            SocketFactory.callLifecycleCallback("functional_error", "Could not load videos");
            return;
        });
    };

    //-----------------------------------------------------

    $scope.init = function()
    {
        $rootScope.mainHeadline = "IoT Portal: Video";
        $rootScope.subHeadline = "Watch Camera Videos";

        $scope.connect(false, function()
        {
            $scope.getVideos(function()
            {
                var autoplay = $routeParams.autoplay;

                if (autoplay)
                {
                    //start video
                    $scope.play(autoplay);
                }
            });

            SocketFactory.receive("cam-stream", function(msg)
            {
                var image = msg.image;
                var date = msg.date;
                var now = msg.now;

                $('#stream').attr('src', 'data:image/jpg;base64,' + image);
                $scope.streamTime = "Now: " + moment(now).format("HH:mm:ss") + " | " + "Img: " + moment(date).format("HH:mm:ss");
            });
        });
    };

    //-----------------------------------------------------

    $scope.init();
});