const AppConstants = {
  // Actions that a user could request
  NUMBERS_REQUEST: 'NUMBERS_REQUEST',
  GUESS_REQUEST: 'GUESS_REQUEST',
  GUESS_CLEAR: 'GUESS_CLEAR',
  
  // APIs
  GUESS_URL: '/api/guess',
  NUMBERS_URL: '/api/numbers',
  API_ERROR: 'API_ERROR',
  
  // Messaging Constants
  TOPIC_PRESENCE: 'presence',
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  MESSAGE: 'MESSAGE',

  TOPIC_NUMBERS: 'numbers',
  ADD_NUMBER: 'NUMBER',
  ADD_WINNER: 'WINNER',

};

export default AppConstants;
