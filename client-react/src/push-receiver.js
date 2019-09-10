//
// This is a MQTT client that provides a means for receiving push messages
// It requires a Flux/Redux "dispach" function for sending messages as actions
//
//
import mqtt from 'mqtt';
import { Events } from './actions/actions';
import { EventEmitter } from 'events';

const TOPIC_NUMBERS = 'numbers';

class PushReceiver extends EventEmitter {
  constructor() {
    super();
    
    // connect Websockets
    const BROKER_URL = `ws://${window.location.host}/ws`;
    console.debug(`Trying to create new MQTT connection to ${BROKER_URL}`);
    this.client = mqtt.connect(BROKER_URL);
    this.client.on('connect', this.onConnect.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    this.client.on('close', this.onClose.bind(this));
  }

  destroy() {
    if (this.client) this.client.end();
  }

  // Websocket functions
  onConnect() {
    console.log(`Mqtt connected to ${this.client.options.href} as ${this.client.options.clientId}`);
    this.client.subscribe(TOPIC_NUMBERS); // always listen for numbers
    this.emit(Events.ONLINE);
  }

  onClose() {
    console.log(`Mqtt disconnected from ${this.client.options.href}`);
    this.emit(Events.OFFLINE);
  }

  isConnected() {
    return this.client.connected;
  }

  onMessage(topic, buffer) {
    try {
      const msg = JSON.parse(buffer.toString());
      switch (msg.action) {
        case Events.NEW_DRAW_RESULTS:
          console.log(`Received NEW_DRAW_RESULT: ${msg.results.numbers} at ${msg.results.date}`);
          this.emit(Events.NEW_DRAW_RESULTS, {
            ...msg.results,
            "date": new Date(msg.results.date)
          });
          break;

        case Events.GUESS_RESULTS:
          console.debug(`Received GUESS_RESULTS:`, msg);
          this.emit(Events.GUESS_RESULTS, msg);
          break;

        default:
          console.debug('Mqtt: message not handled. ', topic, buffer.toString());
      }
    } catch (e) {
      console.log(`Mqtt message error ${e} for topic ${topic} message ${buffer.toString()}`);
    }
  }

}

export default PushReceiver;
