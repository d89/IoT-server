# IoT-server
Home control server unit that works together with IoT-raspberry

---

## Server-Setup

### Preconditions

```
apt-get update
apt-get install -y build-essential git
```

### node.js

Install node 5 and above, as described here: https://nodejs.org/en/download/package-manager/

```
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
apt-get install -y nodejs
```

### mongodb

As described here: https://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/
Be careful with Ubuntu 15.X as mongo has not switched to systemd yet (https://rohan-paul.github.io/mongodb_in_ubuntu/2015/09/03/How_to_Install_MongoDB_Iin_Ubuntu-15.04.html)

```
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list
apt-get update
apt-get install -y mongodb-org
service mongod start
```


### SSL

SSL is strictly necessary for operating the IoT-server. All the IoT-raspberrys talk to your server over an encrypted SSL tunnel.

***Install letsencrypt***

```
cd /opt
git clone https://github.com/letsencrypt/letsencrypt
```

***Create certs for your domain***

```
/opt/letsencrypt/letsencrypt-auto certonly --agree-tos --cert-path /opt/keys --standalone --renew-by-default --email mueller.dav@gmail.com -d d1303.de
```

Create a symlink in ```/opt/keys``` now or change the ```config.js``` to match the generated certificates.

```
ln -s /etc/letsencrypt/live/d1303.de /opt/keys
```

Can be automated by a cronjob. As the certificates are valid for 90 days currently, once per month should be good enough.

***self signed?***

If you want to or have to create your own ssl certificate and can't use letsencrypt, do the following:

```
mkdir /opt/keys && cd /opt/keys
openssl genrsa -out privkey.pem 2048
openssl req -new -key privkey.pem -out csr.pem
openssl req -x509 -days 365 -key privkey.pem -in csr.pem -out cert.pem
```

Change the config accordingly to:

```
sslPrivateKeyPath: '/opt/keys/privkey.pem',
sslCertificate: '/opt/keys/cert.pem',
sslCa: false
```

### Installing the application itself

```
npm install -g bower gulp node-gyp
mkdir -p /var/www/IoT-server && /var/www/IoT-server
mkdir logs
git clone https://github.com/d89/IoT-server.git
cd /var/www/IoT-server
npm install
bower install --allow-root
gulp
nano config.js
```

***Important parts of the configuration***

SSL is necessary (see section above).

* port: The port the webserver runs on.
* sslPrivateKeyPath: Path to your private key pem file.
* sslCertificate: path to your certificate file.
* sslCa: your certificate chain.
* gcmApiKey: the api key of your google cloud messenging api if you want to utilize push messages (more to be described soon).
* mediaBasePath: Path where videos are stored, that the raspberry uploads (only relevant, if you have a camera on your raspberry).
* dsn: config base DSN for your mongodb database

## Launch

for a quick launch, while you are connected via SSH:

```
node index.js
```

For a more sophisticated operation, use a launch script.

---

## Register as a service

```
npm install -g pm2
pm2 start /var/www/IoT-server/index.js --name iot-server && pm2 startup
```

***restart service***

```
pm2 restart iot-server
pm2 stop iot-server
```

***logs and monitoring***

```
pm2 logs iot-server
pm2 show iot-server
pm2 list iot-server
pm2 monit iot-server
```

See http://pm2.keymetrics.io/docs/usage/quick-start/
---

## Cronjobs

Without data point aggregation, your mongodb database will fairly quick overflow. Once an hour, the datapoints are aggregated to an hourly level. Datapoints older than one week are aggregated to a "per day" level. 

Add this to your ```/etc/crontab```

```
0  *    * * *   root    cd /var/www/IoT-server && node aggregator.js >/dev/null
37 13   * * *   root    cd /var/www/IoT-server && node sendpush.js >/dev/null
```

The second script executes once a day (at which time doesn't matter, so I put 13:37). It sends a daily summary via GCM push to all registered browsers that once connected to a raspberry.

## Other things
Want to send Google Now commands to your raspberry? http://lifehacker.com/how-to-create-custom-voice-commands-with-tasker-and-aut-1282209195