// FLUX-Style actions, events and action generators

const NumbersActions = {
  // Events that could be received
  errorEvent: 'error',
  changeEvent: 'change',
  onlineEvent: 'online',
  offlineEvent: 'offline',
  winnersEvent: 'winners',
  messageEvent: 'message',

  // Action types
  getNumbersAction: 'GET_NUMBERS_TYPE',
  addNumberAction: 'NUMBER',
  postGuessAction: 'GUESS_REQUEST',
  deleteGuessAction: 'GUESS_CLEAR',
  APIErrorAction: 'API_ERROR',
  messageAction: 'MESSAGE',


  // Action constructors
  getNumbers: () => ({ "type": NumbersActions.getNumbersAction }),
  guessNumber: (value) => ({ "type": NumbersActions.postGuessAction, "value": value }),
  deleteGuess: (guessRef) => ({ "type": NumbersActions.deleteGuessAction, "url": guessRef }),
  addNumber: (numObj) => ({ "type": NumbersActions.addNumberAction, "number": numObj }),
  sendMessage: (msg) => ({ "type": NumbersActions.messageAction, "message": msg }),
};

export default NumbersActions;