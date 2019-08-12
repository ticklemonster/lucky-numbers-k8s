# LUCKY NUMBERS
This is a sample Lucky Numbers game to be implemented as a Kubernetes cluster

## Project Folders
### client-react
React.js frontend application that uses Web Service APIs and MQTT push updates
Build with "npm run build"
Package into Dockerfile *ticklemon5ter/luckynumbers-client-web* on image httpd2.4
- copies /build to /usr/local/apache2/htdocs and httpd.conf to .../conf
- will proxy /api to "${API_URL}" as per httpd.conf

### server-koa
node.js + koa backend application
Serves API calls to get numbers and take a guess
Package into Dockerfile *ticklemon5ter/luckynumbers-server-api* from image node

- API Testing in the "tests" folder uses Postman

## Kubernetes Design
### config.yaml
- secret/regcred: docker secret for private docker repository

### frontend.yaml
- Deployment/frontend-web: at least 1 image of *ticklemon5ter/luckynumbers-client-web* on port 80
  Proxies /api calls to the backend-api server
  Enironment defines API_URL as http://${API_SERVICE_HOST}:${API_SERVICE_PORT}/api
- LoadBalancer/web: exposes frontend-web single-page web application externally

### backend.yaml
- Deployment/backend-api: at least 1 image of *ticklemon5ter/luckynumbers-server-api* on port 3000
- NodePort/api: exposes backend-api internally on port 3000

## TODO:
- backend-cache: redis cache of recent lucky numbers


3