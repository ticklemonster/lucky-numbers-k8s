import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

import App from './components/app';
import './index.css';

import rootReducer from './reducers';
import httpMiddleware from './middleware/http-middleware';

import registerServiceWorker from './registerServiceWorker';

const store = createStore(
    rootReducer,
    applyMiddleware(httpMiddleware)
);

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);
registerServiceWorker();
