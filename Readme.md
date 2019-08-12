# LUCKY NUMBERS
This is a sample Lucky Numbers game to be implemented as a Kubernetes cluster
Developed on minikube with skaffold and test-deployed to Goole Cloud. 

## Project Folders
### client-react
React.js frontend application that uses Web Service APIs and MQTT push updates
You can: see the last 10 numbers, guess the next number, see updates via MQTT

Build with "npm run build"
Package into Dockerfile *ticklemon5ter/luckynumbers-client-web* on image httpd2.4
- copies /build to /usr/local/apache2/htdocs and httpd.conf to .../conf
- will proxy /api and /ws as per httpd.conf using Kubernetes services environment variables

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
  Proxies /ws calls tothe messaging server
- LoadBalancer/web: exposes frontend-web single-page web application externally

#### backend.yaml
- Deployment/backend-api: at least 1 image of *ticklemon5ter/luckynumbers-server-api* on port 3000
- NodePort/api: exposes backend-api internally on port 3000

#### database.yaml
- Redis/5 data store
  No persistence or clustering is configured
- NodePort/database: exposes Redis on port 6379

#### messaging.yaml
- toke/mosquitto MQTT messaging broker
  No special configuration
- NodePort/websocket: exposes websockets on port 9001


## TODO:
- backend-cache: redis cache of recent lucky numbers


3