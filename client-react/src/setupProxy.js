const proxy = require('http-proxy-middleware');
const { execSync } = require('child_process');

module.exports = function(app) {
    // set up proxy automatically based on minikube services, if the services are runing
    try {
        let apiurl = execSync('minikube service api --interval=1 --wait=2 --url').toString().match('(http://.*)')[0];
        let target = new URL(apiurl);
        app.use(proxy('/api', { target, ws: false }));
    } catch (err) {
        console.debug('--PROXY could not locate apiurl with minikube.');
    }
    try {
        let wsurl  = execSync('minikube service websocket --interval=1 --wait=2 --url').toString().match('(http://.*)')[0].replace('http','ws');
        let target = new URL(wsurl);
        app.use(proxy('/ws', { target, ws: true }));
    } catch (err) {
        console.debug('--PROXY could not locate apiurl with minikube.');
    }
    
};
