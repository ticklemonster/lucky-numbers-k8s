import { ActionTypes } from './actions';

const MAX_MESSAGES = 20;
const MAX_NUMBERS = 20;

const initialState = {
    messages: [],
    numbers: [],
    guesses: [],
    busy: false,
    online: false,
}
  
function addMessage(messages, level, text) {
    const max_id = messages.reduce((max,m) => Math.max(m.id, max), 0);
    const newmsg = {
        id: max_id + 1,
        timestamp: new Date(),
        level: level,
        message: text
    };
    let msgs = messages.slice(0, MAX_MESSAGES - 1);
    msgs.unshift(newmsg);

    return msgs;
}

function rootReducer(state, action) {
    if (typeof state === 'undefined') {
        return initialState
    }

    switch (action.type) {
        case ActionTypes.dismissAllMessages:
            return { ...state, messages: [] }

        case ActionTypes.dismissMessage:
            const messages = state.messages.filter(m => m.id !== action.id);
            return { ...state, messages };

        case ActionTypes.requestNumbers:
            console.debug('Reducer: requestNumbers');
            if (state.busy) {
                console.debug('RequestNumbersAction attempted while busy. Ignore it');
                return state;
            }
            return { ...state, busy: true };
        
        case ActionTypes.receiveNumbers:
            console.debug(`Reducer received ${action.numbers.length} new numbers`);

            return { ...state, 
                busy: false, 
                numbers: action.numbers.slice(0, MAX_NUMBERS),
                messages: addMessage(state.messages, 'secondary', `Received ${action.numbers.length} numbers`),
            };
            
        case ActionTypes.addNumber:
            console.debug(`Reducer:addNumber: `, action.number);
            const addedNumbers = state.numbers.slice(0, MAX_NUMBERS);
            addedNumbers.unshift({
                ...action.number,
                value: parseInt(action.number.value),
                date: new Date(action.number.date)
            });
            return { ...state, 
                numbers: addedNumbers,
                messages: addMessage(state.messages, 'primary', `New lucky number: ${action.number.value}`),
            }

        case ActionTypes.addGuess:
            console.debug(`AddGuessAction: value=${action.value}`);
            if (state.busy) return state;   // ignore presses if busy

            return { ...state, busy: true }

        case ActionTypes.deleteGuess:
            console.debug(`DelGuessAction: id=${action.id}`);
            if (state.busy) return state;   // ignore presses if busy
            
            return { ...state, busy: true }
        
        case ActionTypes.receiveGuess:
            console.debug('Reducer: ReceiveGuess response', action);
            let newstate = { ...state, busy: false };
            if (action.guess !== null) {
                newstate = { ...newstate, 
                    guesses: [ action.guess ], 
                    messages: addMessage(state.messages, 'success', `New guess placed for #${action.guess.value}`),
                }
            } else {
                newstate = { ...newstate,
                    guesses: [],
                    messages: addMessage(state.messages, 'info', `Guess for ${state.guesses[0].value} has been removed`),
                }
            }
            return newstate;

        case ActionTypes.apiError:
            console.debug(`Received API error`);
            const apierrmsg = {
                id: state.messages.reduce((max,m) => Math.max(m.id, max), 0) + 1,
                timestamp: new Date(),
                level: 'danger',
                message: action.error.message
            };
            let msgs = state.messages.slice(0, MAX_MESSAGES - 1);
            msgs.unshift(apierrmsg);
            return { ...state, busy: false, messages: msgs };           
            
        case ActionTypes.messageOnline:
            if (state.online) return state;

            return { ...state,
                online: true, 
                messages: addMessage(state.messages, 'info', 'Connected to live notifications') 
            };

        case ActionTypes.messageOffline:
            if (!state.online) return state;

            return { ...state,
                online: false, 
                messages: addMessage(state.messages, 'warning', 'Disconnected. Use "Refresh" to update results'),
            };
        
        default:
            console.debug('rootReducer: action not handled: ', action);
            return state
    }
}

export default rootReducer;