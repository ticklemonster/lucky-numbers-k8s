import { ActionTypes } from '../actions';

const messageMiddleware = store => next => action => {
    // Intercept and deal with WEB requests...  
    console.debug('message log:', action);
    const rval = next(action);
    console.debug('message result: ', store.getState());
    return rval


  }




export default messageMiddleware;