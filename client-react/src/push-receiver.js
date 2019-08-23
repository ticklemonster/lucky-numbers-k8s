//
// This is a MQTT client that provides a means for receiving push messages
// It requires a Flux/Redux "dispach" function for sending messages as actions
//
//
import mqtt from 'mqtt';
import { Events } from './actions/actions';
import { EventEmitter } from 'events';

const TOPIC_NUMBERS = 'numbers';
const NEW_NUMBER_MESSAGE = 'NEW_NUMBER';
const WINNERS_MESSAGE = 'WINNERS';

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
    this.emit(Events.onlineEvent);
  }

  onClose() {
    console.log(`Mqtt disconnected from ${this.client.options.href}`);
    this.emit(Events.offlineEvent);
  }

  isConnected() {
    return this.client.connected;
  }

  onMessage(topic, buffer) {
    try {
      const msg = JSON.parse(buffer.toString());
      switch (msg.action) {
        case NEW_NUMBER_MESSAGE:
          console.log(`Received NEW_NUMBER_MESSAGE: ${msg.number.value} at ${msg.number.date}`);
          msg.number.date = new Date(msg.number.date);
          msg.number.value = parseInt(msg.number.value);
          this.emit(Events.newNumberEvent, msg.number);
          break;

        case WINNERS_MESSAGE:
          console.debug(`Received WINNERS_MESSAGE: ${msg.guesses}`);
          this.emit(Events.winnersEvent, msg.guesses);
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
