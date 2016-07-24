#!/bin/bash
npm i
bower install --allow-root
gulp
pm2 start server/index.js --name=iot-server
pm2 logs