module.exports = {
    port: 3000,
    url: 'https://d1303.de:3000', //no trailing slash
    sslPrivateKeyPath: '/etc/letsencrypt/live/d1303.de/privkey.pem',
    sslCertificate: '/etc/letsencrypt/live/d1303.de/cert.pem',
    sslCa: '/etc/letsencrypt/live/d1303.de/chain.pem',
    gcmApiKey: 'AIzaSyDMIONadjo6tWFFLApBMUopC9O6Z_97cuQ',
    mediaBasePath: '/var/www/IoT-server/uploads',
    dsn: 'mongodb://localhost/IoT'
};