/* eslint-disable linebreak-style */
import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Our components
import { Events } from '../actions/actions';

// Display components
import TopHeader from './top-header';
import JumboTitle from './jumbo-title';
import Messages from './messages';
import Instructions from './instructions';
import GuessInput from './guess-input';
import LastNumbers from './last-numbers';


const MAX_NUMBERS = 20;
// const MAX_MESSAGES = 20;

const App = ({receiver}) => {
  const [numbersLoading, setNumbersLoading] = useState(true);
  const [numbers, setNumbers] = useState([]);

  const [guessRequest, setGuessRequest] = useState();
  const [guess, setGuess] = useState(null);

  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(false);

  // when "numbersLoading" changes is set to true, fetch the numbers
  useEffect(() => {   
    async function fetchNumbers() {
      console.debug('+ fetchNumbers');
      fetch(`/api/numbers?length=20`)
        .then(response => response.json())
        .then(data => {
          const numbers = data.numbers.map(n => ({
            ...n, date: new Date(n.date), value: parseInt(n.value)
          }));
          setNumbers(numbers);
          setNumbersLoading(false);
          console.debug('- fetchNumbers (success)');
        })
        .catch(error => {
          console.error(error);
          setNumbersLoading(false);
        });
    }

    if (numbersLoading) 
      fetchNumbers();
  }, [numbersLoading]);

  // when "guessRequest" changes, try and update the actual guess 
  useEffect(() => {
    async function postGuess() {
      console.debug('+ POST Guess', guessRequest);
      fetch(`/api/guesses`, { 
        method: "POST", 
        headers:{ 'Content-Type': 'application/json' },
        body: JSON.stringify({ "value": guessRequest }),
      })
        .then(response => response.json())
        .then(data => {
          console.debug('- POST Guess (success)', data);
          setGuess(data);
        })
        .catch(error => {
          console.error(error);
        });
    }

    async function deleteGuess() {
      console.log(`+ DELETE guess (requested null)`);
      if (!guess || !guess.id) {
        console.debug('  no guess id to be cleared');
        return;
      }

      fetch(`/api/guesses/${guess.id}`, {
        method: "DELETE"
      })
        .then(() => {
            console.debug(`- DELETE Guess successful.`);
            setGuess(null);
        })
        .catch(error => {
            console.debug(`- DELETE Guess error: /api/guesses/${guess.id} -- ${error}`);
        });
    }

    console.debug(`GuessRequest.useEffect - requesting: ${guessRequest}`);
    if (guessRequest) {
      postGuess();
    } else {
      deleteGuess();
    }

  }, [guessRequest]);

  useEffect(() => {
    console.debug('++ add event receivers only once ++');
    receiver.on(Events.newNumberEvent, num => setNumbers(numbers => [num, ...numbers].slice(0, MAX_NUMBERS)));
    receiver.on(Events.offlineEvent, () => setOnline(false));
    receiver.on(Events.onlineEvent, () => setOnline(true));
    receiver.on(Events.messageEvent, (m) => console.debug('TODO: deal with message event ', m));
  }, [receiver]);


  return (
    <div>
      <TopHeader />
      <Container>
        <Row style={{ marginTop: 16 }}>
          <Col><JumboTitle /></Col>
        </Row>
        <Row id="play">
          <Col className="d-lg-none">
            {/* Smaller displays use an input form */}
            <GuessInput
                size="sm"
                guess={guess}
                numbers={numbers}
                onGuess={(val) => setGuessRequest(val)}
              />
          </Col>
          <Col className="d-none d-lg-block" lg={8}>
            {/* Large displays use an input grid */}
            <GuessInput
              size="lg"
              guess={guess}
              numbers={numbers}
              onGuess={(val) => setGuessRequest(val)}
            />
          </Col>
          <Col className="d-flex">
            <LastNumbers
              numbers={numbers}
              onRefresh={numbersLoading ? null : () => setNumbersLoading(true)}
            />
          </Col>
        </Row>
        <Row>
          <Col><Messages 
            messages={messages}
            online={online}
            onClear={() => setMessages([])}
            onDismiss={id => setMessages(messages.filter(m => m.id !== id))}
          /></Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col><Instructions id="instructions"/></Col>
        </Row>
      </Container>
    </div>);
};

export default App;
