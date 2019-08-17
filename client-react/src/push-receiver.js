//
// This is a MQTT client that provides a means for receiving push messages
// It requires a Redux "dispach" function for sending messages as actions
//
// For development - the REACT_APP_BROKER_URL environment variable can be set
// otherwise the client URL is relative to the current page
//
//
import mqtt from 'mqtt';
import { Actions } from './actions';

const TOPIC_NUMBERS = "numbers";

class PushReceiver {
  constructor(dispatch) {
    this.dispatch = dispatch;

    // connect Websockets
    if (process.env.NODE_ENV === "development" && process.env.REACT_APP_BROKER_URL) {
      console.debug(`DEVELOPMENT MODE - MQTT connecting to ${process.env.REACT_APP_BROKER_URL}`);
      this.client = mqtt.connect(process.env.REACT_APP_BROKER_URL);
    } else {
      const BROKER_URL = `ws://${window.location.host}/ws`;
      console.debug(`Trying to create new MQTT connection to ${BROKER_URL}`);
      this.client = mqtt.connect(BROKER_URL);
    }
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

    this.dispatch(Actions.onlineMessage());
  }

  onClose() {
    console.log(`Mqtt disconnected from ${this.client.options.href}`);
    this.dispatch(Actions.offlineMessage());
  }

  isConnected() {
    return this.client.connected;
  }

  onMessage(topic, buffer) {
    try {
      const msg = JSON.parse(buffer.toString());
      switch (msg.action) {
        case 'NEW_NUMBER':
          console.log(`Received NEW_NUMBER: ${msg.number.value} at ${msg.number.date}`);
          this.dispatch(Actions.addNumberMessage(msg.number));
          break;

        case 'WINNERS':
          console.debug(`Received WINNERS: ${msg.guesses}`);
          // this.emit(NumbersActions.winnersEvent, msg.guesses);
          break;

        default:
          console.log('Mqtt: message not handled. ', topic, buffer.toString());
      }
    } catch (e) {
      console.log('Mqtt message error ', e.toString(), ' for topic ', topic, ' message ', buffer.toString());
    }
  }

}

export default PushReceiver;
