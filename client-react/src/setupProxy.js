const proxy = require('http-proxy-middleware');
const { execSync } = require('child_process');

module.exports = function(app) {
    let apiurl = execSync('minikube service web --url').toString().trim();
    let wsurl  = execSync('minikube service websocket --url').toString().trim().replace('http','ws');

    app.use(proxy('/api', { target: apiurl, ws: false }));
    app.use(proxy('/ws', { target: wsurl, ws: true }));
};
