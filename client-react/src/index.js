import React from 'react';
import { render } from 'react-dom';

import App from './components/app';
import PushReceiver from './push-receiver';

import './index.css';

const pushReceiver = new PushReceiver();

render(
    <App receiver={pushReceiver}/>,
    document.getElementById('root')
);
