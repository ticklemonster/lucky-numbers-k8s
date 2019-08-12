// server.js
// - Backend server for the lucky numbers test app
// This is simply a wrapper to start the app.js on a specified PORT

// Environment variables for server configuration
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || "development";
//
// start the app and any scheduled actions
//
console.log(`Starting Luckynumbers-server in ${ENV} on ${PORT}`);
console.debug(`\tREDIS_URL=${process.env.REDIS_URL}`);
console.debug(`\tBROKER_URL=${process.env.BROKER_URL}`);

const app = require('./app');
const server = app.listen(PORT);

const cleanShutdown = () => {
    console.log('Shutdown requested - close Koa...');
    server.close( () => {
        console.debug('- http server is closed');
        app.emit('close');
        process.exit(0);
    });
};

process.on('SIGINT', cleanShutdown);
process.on('SIGTERM', cleanShutdown);

module.exports = server;
