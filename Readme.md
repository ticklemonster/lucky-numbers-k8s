# LUCKY NUMBERS
This is a sample Lucky Numbers game to be implemented as a Kubernetes cluster
Developed on minikube with skaffold and test-deployed to Goole Cloud. 

## TO DO ##
* CLIENT
    * accept "WINNER" messages
    * deal with a "GUESS" being a temporary
    * show "new number", "guess win/lose" as messages
    * implement "guess input" (small-screen) control

* SERVER
    * Set a "guess" to have a limited lifespan (until next number draw). Include draw time/timeout in the response.
    * Make sure server process will exit on critical failures. Let Kubernetes do the restart to try reconnecting.

* KUBERNETES
    * Revisit internal networking in Kubernetes (remove nodeports from internal services when not in dev)?
    * Use coredns to find services (rather than environment vars)




## Project Folders
### client-react
React.js frontend application that uses Web Service APIs and MQTT push updates
You can: see the last 10 numbers, guess the next number, see updates via MQTT

Build with "npm run build"
Package into Dockerfile *ticklemon5ter/luckynumbers-client-web* on image httpd2.4
- copies /build to /usr/local/apache2/htdocs and httpd.conf to .../conf
- will proxy /api and /ws as per httpd.conf using Kubernetes services environment variables

* Recent Changes
    * Migrated to react-bootstap:^1.0 / boostrap 4
    * Upgraded to react-scripts:3.0.1
        * Added "setupProxy.js" to proxy /api and /ws in development (to auto-configure to the skaffold deployment on minikube)
    * Upgraded to react:^16.8
        * Removed Redux and moved to native react hooks (enough for such a simple app)
    * Removed "superagent" and reverted to "fetch" (now included updated react)

### server-koa
node.js + koa backend application
Serves API calls to get numbers and take a guess
API Testing in the "tests" folder uses Postman

Package into Dockerfile *ticklemon5ter/luckynumbers-server-api* from image node

### k8s
Contains the Kubernetes configuation

#### config.yaml
- secret/regcred: docker secret for private docker repository

#### frontend.yaml
- Deployment/frontend-web: at least 1 image of *ticklemon5ter/luckynumbers-client-web* on port 80
  Proxies /api calls to the backend-api server
  Proxies /ws calls to the messaging server
- LoadBalancer/web: exposes frontend-web single-page web application externally

#### backend.yaml
- Deployment/backend-api: at least 1 image of *ticklemon5ter/luckynumbers-server-api* on port 3000
- NodePort/api: exposes backend-api internally on port 3000

#### database.yaml
- Redis/5 data store
  No persistence or clustering is configured
- NodePort/database: exposes Redis on port 6379

#### messaging.yaml
- eclipse-mosquitto MQTT messaging broker
  Configured to use websockets using ConfigMap (to write /mosquitto/config/mosquitto.conf)
- NodePort/websocket: exposes websockets on port 9001
