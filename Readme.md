# LUCKY NUMBERS
A simple Lotteries-style Lucky Numbers game to be implemented as a Kubernetes cluster
Developed on minikube with skaffold and test-deployed to Google Cloud. 

## RULES
* 6 numbers are drawn from a set of 45 numbers, every minute (can be tuned in environment vars)
* Guesses of 6 numbers are accepted up until the draw time
* A guess can only be changed prior to a draw
* Selecting 4 or more correct numbers wins a "prize"


## TO DO ##
* CLIENT
    * deal with a "GUESS" being a temporary (delete it after a claim?)
    * update guesses with results and show guesses with results differently from those waiting.
    * store guesses in local storage (to recover after a refresh)
    * show "new number", "guess win/lose" as messages?
    * show a "time to next draw" countdown?

* SERVER
    * Clean up old "guesses" after a period of time (or move to persistent store)?
    * Clean up old "results" after a period of time (or move to persistent store)?
    * Make sure server process will exit on critical failures. Let Kubernetes do the restart.
    * Add API to retrieve statistics for drawn numbers (recorded in Redis already)

* KUBERNETES
    * Revisit internal networking in Kubernetes (remove nodeports from internal services when not in dev)?
    * CONSIDER: Use coredns to find services (rather than environment vars)?
    * CONSIDER: Kubernetes cron jobs to manage the RNG (guaranteed at least once, but could run any time during the minute - how time accurate do we need to be?)




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

* Recent Changes
    * Sends a message for each guess after it is drawn, topic: "guess/{id}" (win or lose)

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
