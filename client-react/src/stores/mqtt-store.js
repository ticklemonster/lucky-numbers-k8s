// MqttStore is a MQTT client that provides:
// - actions for message sending
// - a bridge metween MQTT messages and Flux actions (pseudo-store)
//
import mqtt from 'mqtt';
import NumbersActions from '../actions/numbers-actions';
import EventEmitter from 'events';

const TOPIC_NUMBERS = "numbers";

class MqttStore extends EventEmitter {
  constructor(dispatcher) {
    super();

    this.dispatcher = dispatcher;
    this.onConnect = this.onConnect.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.actionHandler = this.actionHandler.bind(this);

    // connect Websockets
    if (process.env.NODE_ENV === "development" && process.env.REACT_APP_BROKER_URL) {
      console.debug(`DEVELOPMENT MODE - MQTT connecting to ${process.env.REACT_APP_BROKER_URL}`);
      this.client = mqtt.connect(process.env.REACT_APP_BROKER_URL);
    } else {
      const BROKER_URL = `ws://${window.location.host}/ws`;
      console.debug(`Trying to create new MQTT connection to ${BROKER_URL}`);
      this.client = mqtt.connect(BROKER_URL);
    }
    this.client.on('connect', this.onConnect);
    this.client.on('message', this.onMessage);
    this.client.on('close', this.onClose);

    // register with the dispatcher
    this.dispatchId = this.dispatcher.register(this.actionHandler);
  }

  destroy() {
    if (this.client) this.client.end();
    this.dispatcher.unregister(this.dispatchId);
    console.log('MqttStore destroyed');
  }

  // Websocket functions
  onConnect() {
    console.log('MqttStore connected to %s as %s', this.client.options.href, this.client.options.clientId);
    this.client.subscribe(TOPIC_NUMBERS); // always listen for numbers
    this.emit(NumbersActions.onlineEvent);
  }

  onClose() {
    console.log('MqttStore disconnected from %s as %s', this.client.options.href, this.client.options.clientId);
    this.emit(NumbersActions.offlineEvent);
  }

  isConnected() {
    return this.client.connected;
  }

  actionHandler(action) {
    switch (action.type) {
      case NumbersActions.APIErrorAction:
        console.log('MQTT-STORE: Got API_ERROR from dispatcher', action);
        break;

      case NumbersActions.messageAction:
        this.emit(NumbersActions.messageEvent, action.message);
        break;

      default:
        break;
    }
  }

  onMessage(topic, buffer) {
    try {
      const msg = JSON.parse(buffer.toString());
      switch (msg.action) {
        case 'NEW_NUMBER':
          console.log(`Received NEW_NUMBER: ${msg.number.value} at ${msg.number.date}`);
          this.dispatcher.dispatch(NumbersActions.addNumber(msg.number));
          break;

        case 'WINNERS':
          console.debug(`Received WINNERS: ${msg.guesses}`);
          this.emit(NumbersActions.winnersEvent, msg.guesses);
          break;

        case 'INFO':
          console.log(`Received INFO: ${msg.message}`);
          break;

        default:
          console.log('MqttStore: message not handled. ', topic, buffer.toString());
      }
    } catch (e) {
      console.log('MqttStore message error ', e.toString(), ' for topic ', topic, ' message ', buffer.toString());
    }
  }

  getMessages () {
    return [];
  }
}

export default MqttStore;
