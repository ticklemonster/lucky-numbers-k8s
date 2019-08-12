// NumbersStore controls the data and is the only place to modify data

import request from 'superagent';
import EventEmitter from 'events';
import NumbersActions from '../actions/numbers-actions';

const MAX_SIZE = 20;

//
// A simple event emitting NumbersStore class
// that should be instantiated only once
//
class NumbersStore extends EventEmitter {
  constructor(dispatcher) {
    super();

    // data store for numbers includes a local cache of numbers from the API
    // and a local record of the last guess 
    // Numbers are of the form: { id, date, value }
    // Guesses are of the form: { id, date, value }
    this.numbers = [];
    this.guess = null;
    this.busy = false;
    
    this.dispatcher = dispatcher;
    this.dispatchId = this.dispatcher.register(this.actionHandler.bind(this));

    console.log('NumbersStore created');
  }

  destroy() {
    if (this.dispatchId) this.dispatcher.unregister(this.dispatchId);
    console.log('NumbersStore destroyed');
  }

  getState() {
    return {
      numbers: this.numbers,
      guess: this.guess,
      busy: this.busy,
    }
  }

  getNumbers() {
    return this.numbers;
  }

  isBusy() {
    return this.busy;
  }

  getGuess() {
    return this.guess;
  }

  getGuesses() {
    return (this.guess == null) ? [] : [this.guess];
  }

  canGuess() {
    return (this.guess === null);
  }
   
  // Dispatcher action handler
  actionHandler(action) {
    switch (action.type) {
      case NumbersActions.getNumbersAction:
        // console.debug(`NumbersStore: request for last 10 numebrs`);
        if (this.busy) break; // prevent multiple requests

        this.busy = true;
        this.emit(NumbersActions.changeEvent);
        request
          .get('/api/numbers?length=10')
          .set('Accept', 'application/json')
          .then(response => {
            console.debug(`NumbersStore: received ${response.body.numbers.length} new numbers`);
            this.numbers = response.body.numbers;
            this.numbers.map(e => e.value = parseInt(e.value, 10)); // make sure values are integers!
            this.busy = false;
            this.emit(NumbersActions.changeEvent);
          })
          .catch(err => {
            console.debug(`NumbersStore: error ${err} GET /api/numbers?length=10`);
            this.emit(NumbersActions.errorEvent, err);
            this.busy = false;
            this.emit(NumbersActions.changeEvent);
          });
          break;
          
      case NumbersActions.addNumberAction:     
        console.log(`NumbersStore: add number ${action.number.value}`);
        this.numbers.unshift(action.number);
        if( this.numbers.length > MAX_SIZE ) this.numbers.pop();
        this.emit(NumbersActions.changeEvent);
        break;

      case NumbersActions.postGuessAction:  
        console.debug(`NumbersStore: request for guess of ${action.value}`);
        if (this.busy) break;

        this.busy = true;
        this.emit(NumbersActions.changeEvent);

        request
        .post('/api/guesses')
        .send({ 'value': action.value })
        .set('Accept', 'application/json')
        .then(response => {
          console.debug(`NumbersStore: guess accepted ${JSON.stringify(response.body)}`);
          this.guess = response.body;
          this.busy = false;
          this.emit(NumbersActions.changeEvent);
        })  
        .catch(err => {
          console.debug(`NumbersStore: error POST guess /api/guesses value=${action.value}. ${err}`);
          this.emit('error', err);
          this.guess = null;
          this.busy = false;
          this.emit(NumbersActions.changeEvent);
        });  
        break;
  
      case NumbersActions.deleteGuessAction:
        console.debug(`NumbersStore: DELETE guess at ${action.url}`);
        this.busy = true;
        this.emit(NumbersActions.changeEvent);

        request
          .delete(action.url)
          .then(() => {
            console.debug(`NumbersStore: guess is cleared`);
            this.guess = null;
            this.busy = false;
            this.emit(NumbersActions.changeEvent);
          })
          .catch(err => {
          console.debug(`NumbersStore: error DELETING guess at ${action.url}: `, err);
            this.guess = null;
            this.busy = false;
            this.emit(NumbersActions.changeEvent);
          })
        break;

      default:
        // console.log('NumbersStore::actionHandler not handling action ', action);
        break;
    }
  }

};


export default NumbersStore;
