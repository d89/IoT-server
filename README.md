# IoT-server
Home control server unit that works together with IoT-raspberry

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
npm install
bower install
gulp (default task builds the "dist" folder from the "frontend" folder - this is where the frontend is served from)
node index.js (or use forever)
```

* Mongo-DB is required (default port)
* Config needs to be adjusted (in config.js) - for GCM Push token and SSL certs.
* Server starts on port 3000

Ganz cool: Google Now Kommandos an Server senden: http://lifehacker.com/how-to-create-custom-voice-commands-with-tasker-and-aut-1282209195