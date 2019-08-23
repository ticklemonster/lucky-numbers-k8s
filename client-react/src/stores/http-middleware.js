import { ActionTypes } from '../actions';
import request from 'superagent';

const httpMiddleware = store => next => action => {
    // Intercept and deal with WEB requests...   
    switch (action.type) {
        case ActionTypes.requestNumbers:
            request
                .get(`/api/numbers?length=10`)
                .set('Accept', 'application/json')
                .then(response => {
                    let numbers = response.body.numbers;
                    console.debug(`Numbers API: received ${numbers.length} new numbers`);
                    numbers = numbers.map(e => ({ 
                        ...e, 
                        value: parseInt(e.value, 10),
                        date: new Date(e.date),
                    })); // make sure values are numbers and date is a Date
                    
                    next ({ "type": ActionTypes.receiveNumbers, numbers });
                })
                .catch(error => {
                    console.debug(`Numbers API: GET /api/numbers error ${error} `);
                    next({ "type": ActionTypes.apiError, "error": new Error('Error getting recent numbers', error) });
                });
            break;

        case ActionTypes.addGuess:
            request
                .post(`/api/guesses`)
                .send({ 'value': action.value })
                .set('Accept', 'application/json')
                .then(response => {
                    let guess = response.body;
                    console.debug(`Guesses API: received guess confirmation for ${action.value}`, guess);
                    next ({ "type": ActionTypes.receiveGuess, guess });
                })
                .catch(error => {
                    console.debug(`Guesses API: POST /api/guesses error ${error} `);
                    next({ "type": ActionTypes.apiError, "error": new Error('Error saving guess', error) });
                });
            break;
    
        case ActionTypes.deleteGuess:
            request
                .delete(`/api/guesses/${action.id}`)
                .set('Accept', 'application/json')
                .then(response => {
                    console.debug(`Guesses API: cleared guess with ${action.id}`);
                    next ({ "type": ActionTypes.receiveGuess, guess: null });
                })
                .catch(error => {
                    console.debug(`Guesses API: DELETE /api/guesses error ${error} `);
                    next({ "type": ActionTypes.apiError, "error": new Error('Error saving guess', error) });
                });
            break;
            
        default:
            console.debug(`No HTTP required for action ${action.type}`);
    }

    return next(action);
  }




export default httpMiddleware;