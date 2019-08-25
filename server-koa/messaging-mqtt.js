// MESSAGING-MQTT
// - Manages message sending over MQTT

const mqtt = require('mqtt');

class GuessesApi {
    constructor(url) {
        this.version = '0.1';
        this.mqtt = mqtt.connect(url);
  
        this.mqtt
        .on('connect', () => console.log(`Connected to MQTT at ${url}`))
        .on('offline', () => console.warn(`WARNING: MQ Connection is offline`))
        .on('error', err =>  console.error(`MQ error: ${err}`))
        .on('message', (topic, message) => {
            // message is Buffer
            console.log(`MQ Message on ${topic}: ${message.toString()}`);
        });
    };

    close() {
        this.mqtt.end();
    }

    ready() {
        return this.redis.ready;
    }

    sendMessage(topic, message) {
        this.mqtt.publish(topic, message);
    }

    broadcast(message) {
        console.log(`TODO: messaging.broadcast not implemented. ${message}`);
    }
}

module.exports = GuessesApi;