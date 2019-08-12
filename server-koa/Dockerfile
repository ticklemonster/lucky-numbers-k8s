FROM node:10.16

# create the working directory
USER node
WORKDIR /home/node

# copy in the application
COPY package.json /home/node/
COPY package-lock.json /home/node/
COPY *.js /home/node/

# build the required packages
RUN npm ci --only=production

# set the runtime
CMD [ "node", "server.js" ]
EXPOSE 3000