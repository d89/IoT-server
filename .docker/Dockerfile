FROM node:latest
MAINTAINER Tim Kolberger <tim.kolberger@incloud.de>

ENV TIMEZONE "Europe/Berlin"
RUN echo "${TIMEZONE}" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata

RUN apt-get update && apt-get install -y \
    git \
    cron \
    supervisor && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN npm install gulp bower nodemon pm2 -g

COPY config/supervisord/*.conf /etc/supervisor/conf.d/

COPY config/cron/crontab /etc/cron.d/cron
RUN rm -Rf /etc/cron.daily  && \
    rm -Rf /etc/cron.weekly && \
    rm -Rf /etc/cron.monthly && \
    rm -Rf /etc/cron.hourly && \
    chmod a+x /etc/cron.d/cron

WORKDIR /src

CMD exec supervisord -n