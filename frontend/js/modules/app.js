'use strict';

var IoT = angular.module('IoT', [ 'ngRoute', 'IoTConstants', 'colorpicker.module', 'dndLists' ]);

IoT.config(['$routeProvider', function($routeProvider)
{
    $routeProvider
        .when('/index', {
            templateUrl: 'templates/index/index.html',
            controller: 'IoTIndexCtrl'
        })
        .when('/error/:error_message', {
            templateUrl: 'templates/index/index.html',
            controller: 'IoTIndexCtrl'
        })
        .when('/maintenance/:client_id', {
            templateUrl: 'templates/maintenance/maintenance.html',
            controller: 'IoTMaintenanceCtrl'
        })
        .when('/history/:client_id', {
            templateUrl: 'templates/history/history.html',
            controller: 'IoTHistoryCtrl'
        })
        .when('/action/:client_id', {
            templateUrl: 'templates/action/action.html',
            controller: 'IoTActionCtrl'
        })
        .when('/action/:client_id/audio/:audio', {
            templateUrl: 'templates/action/action.html',
            controller: 'IoTActionCtrl'
        })
        .when('/action/:client_id/lightshow/:lightshow', {
            templateUrl: 'templates/action/action.html',
            controller: 'IoTActionCtrl'
        })
        .when('/action/:client_id/scenario/add/:scenario_add', {
            templateUrl: 'templates/action/action.html',
            controller: 'IoTActionCtrl'
        })
        .when('/action/:client_id/scenario/edit/:scenario_edit', {
            templateUrl: 'templates/action/action.html',
            controller: 'IoTActionCtrl'
        })
        .when('/scenario/:client_id', {
            templateUrl: 'templates/scenario/scenario.html',
            controller: 'IoTScenarioCtrl'
        })
        .when('/video/:client_id', {
            templateUrl: 'templates/video/video.html',
            controller: 'IoTVideoCtrl'
        })
        .when('/video/:client_id/autoplay/:autoplay', {
            templateUrl: 'templates/video/video.html',
            controller: 'IoTVideoCtrl'
        })
        .when('/audio/:client_id', {
            templateUrl: 'templates/audio/audio.html',
            controller: 'IoTAudioCtrl'
        })
        .when('/audio/:client_id/autoplay/:track', {
            templateUrl: 'templates/audio/audio.html',
            controller: 'IoTAudioCtrl'
        })
        .when('/audio/:client_id/youtube/:ytdl', {
            templateUrl: 'templates/audio/audio.html',
            controller: 'IoTAudioCtrl'
        })
        .when('/ifttt/:client_id', {
            templateUrl: 'templates/ifttt/ifttt.html',
            controller: 'IoTIftttCtrl'
        })
        .when('/dashboard/:client_id', {
            templateUrl: 'templates/dashboard/dashboard.html',
            controller: 'IoTDashboardCtrl'
        })
        .otherwise({
            redirectTo: '/index'
        });
}]);

IoT.filter('isEmpty', [function() {
    return function(object) {
        return angular.equals({}, object);
    }
}]);