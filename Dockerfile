FROM node:latest
MAINTAINER Tim Kolberger <tim.kolberger@incloud.de>

RUN apt-get update && apt-get install nano cron -y

RUN npm install gulp bower nodemon pm2 -g

RUN mkdir /src
WORKDIR /src

RUN echo "node /src/server/aggregator.js >/dev/null" > /etc/cron.hourly/aggregate-iot-server
RUN echo "node /src/sendpush.js >/dev/null" > /etc/cron.daily/sendpush-iot-server
