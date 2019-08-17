// // Events that could be received
// export const Events = {
//   errorEvent: 'error',
//   changeEvent: 'change',
//   onlineEvent: 'online',
//   offlineEvent: 'offline',
//   winnersEvent: 'winners',
//   messageEvent: 'message',
// }

// Action types
export const ActionTypes = {
  dismissAllMessages: 'DISMISS_ALL_MESSAGES',
  dismissMessage: 'DISMISS_MESSAGE',

  requestNumbers: 'GET_NUMBERS',
  receiveNumbers: 'RECEIVE_NUMBERS',
  addNumber: 'ADD_NUMBER',

  addGuess: 'POST_GUESS',
  receiveGuess: 'RECEIVE_GUESS',
  deleteGuess: 'DELETE_GUESS',

  messageOnline: 'SUBSCRIBE_ONLINE',
  messageOffline: 'SUBSCRIBE_OFFLINE',
  
  apiError: 'API_ERROR',
}

// Action creatores
export const Actions = {
  dismissAllMessages: () => ({ "type": ActionTypes.dismissAllMessages }),
  dismissMessage: (id) => ({ "type": ActionTypes.dismissMessage, "id": id }),

  addGuess: (value) => ({ "type": ActionTypes.addGuess, "value": value }),
  deleteGuess: (id) => ({ "type": ActionTypes.deleteGuess, "id": id }),
  
  refreshNumbers: (len) => ({ "type": ActionTypes.requestNumbers, "length": len || 10 }),
  
  onlineMessage: () => ({ "type": ActionTypes.messageOnline }),
  offlineMessage: () => ({ "type": ActionTypes.messageOffline }),
  addNumberMessage: (numObj) => ({ "type": ActionTypes.addNumber, "number": numObj }),
};
