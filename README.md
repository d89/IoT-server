# IoT-server
Home control server unit that works together with IoT-raspberry

---

## Server-Setup

***Preconditions for node mongo***
```
apt-get install libkrb5-dev
npm install -g node-gyp
npm install mongo
```

***Setting up***
```
npm install -g bower gulp forever
cd /var/www/d1303.de
mkdir logs
git clone https://github.com/d89/IoT-server.git
cd /var/www/d1303.de/IoT-server
npm install
bower install --allow-root
gulp
nano config.js
```

***Important parts of the configuration***

SSL is necessary. Use letsencrypt, it's free.

* port: The port the webserver runs on.
* sslPrivateKeyPath: Path to your private key pem file.
* sslCertificate: path to your certificate file.
* sslCa: your certificate chain.
* gcmApiKey: the api key of your google cloud messenging api if you want to utilize push messages (more to be described soon).
* mediaBasePath: Path where videos are stored, that the raspberry uploads (only relevant, if you have a camera on your raspberry).

---

## SSL

SSL is strictly necessary for operating the IoT-server. All the IoT-raspberrys talk to your server over an encrypted SSL tunnel.

***Install letsencrypt***

```
cd /opt
git clone https://github.com/letsencrypt/letsencrypt
```

***Create certs for d1303.de and www.d1303.de (subdomain not necessary)***

```
systemctl stop iot-server #shut down server
/opt/letsencrypt/letsencrypt-auto certonly --standalone --renew-by-default --email mueller.dav@gmail.com -d d1303.de -d www.d1303.de
systemctl start iot-server
```

Pay attention that the path, where the generated certificates end up, matches what is entered in the ```config.js```.

Can be automated by a cronjob. As the certificates are valid for 90 days currently, once per month should be good enough.

---

## Launch

for a quick launch, while you are connected via SSH:

```
node index.js
```

For a more sophisticated operation, use a launch script.

---

## Launch script

**systemd** style, roll your own for init.d or upstart. Or use pm2.

```
nano /lib/systemd/system/iot-server.service
```

with content:

```
[Unit]
Description=Job that runs the iot-server daemon

[Service]
Type=simple
WorkingDirectory=/var/www/d1303.de/IoT-server
ExecStart=/usr/bin/forever index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

register:

```
systemctl enable iot-server
systemctl start iot-server
systemctl status iot-server
```

---

## Cronjobs

Without data point aggregation, your mongodb database will fairly quick overflow. Once an hour, the datapoints are aggregated to an hourly level. Datapoints older than one week are aggregated to a "per day" level. 

Add this to your ```/etc/crontab```

```
0  *    * * *   root    cd /var/www/d1303.de/IoT-server && node aggregator.js >/dev/null
37 13   * * *   root    cd /var/www/d1303.de/IoT-server && node sendpush.js >/dev/null
```

The second script executes once a day (at which time doesn't matter, so I put 13:37). It sends a daily summary via GCM push to all registered browsers that once connected to a raspberry.

## Other things
Want to send Google Now commands to your raspberry? http://lifehacker.com/how-to-create-custom-voice-commands-with-tasker-and-aut-1282209195