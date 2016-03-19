module.exports = {
    port: 3000,
    url: 'https://d1303.de:3000', //no trailing slash
    sslPrivateKeyPath: '/opt/keys/privkey.pem',
    sslCertificate: '/opt/keys/cert.pem',
    sslCa: '/opt/keys/chain.pem', //delete this line if you don't have a chain
    gcmApiKey: 'AIzaSyDMIONadjo6tWFFLApBMUopC9O6Z_97cuQ',
    mediaBasePath: '/var/www/IoT-server/uploads',
    dsn: 'mongodb://localhost/IoT'
};