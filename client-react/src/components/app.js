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
import RecentResults from './recent-results';
import RecentGuesses from './recent-guesses';


const MAX_NUMBERS = 20;
const LOCAL_STORAGE_KEY = "/SavedGuessIDs";
// const MAX_MESSAGES = 20;

const APIBackedResults = () => {
  const [results, setResults] = useState([]);

  const getResults = () => {
    console.debug('+ fetchNumbers');
    fetch(`/api/results?length=20`)
      .then(response => response.json())
      .then(data => {
        // console.debug('  fetchNumbers: data ', data);
        const restultset = data.results.map(n => ({
          ...n, date: new Date(n.date)
        }));
        setResults(restultset);
        console.debug('- fetchNumbers (success)');
      })
      .catch(error => {
        console.log(`No results ${error}`);
        setResults([]);
      });
  }

  // initial load should fetch results
  useEffect(() => getResults(), []);

  return [results, setResults, getResults]
}

const CachedGuesses = () => {
  const [guesses, setGuesses] = useState(() => {
    try {
      const savedGuesses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY))
        .map(g => ({...g, for_date: new Date(g.for_date)}));
      console.debug('Starting with cached guesses: ', savedGuesses);

      const now = new Date();
      savedGuesses.forEach(sg => {
        if (sg.for_date < now && !sg.matches) {
          console.debug('TODO: Need to fetch matches for old guess: ', sg);    
          fetch(`/api/guesses/${sg.id}`)
            .then(response => response.json())
            .then(data => {
              console.debug('- GET Guess (success)', data);
              data.for_date = new Date(data.for_date);
              setGuesses(guesses => guesses.map(g => {
                return (g.id === sg.id) ? sg : g;
              }));
            })
            .catch(error => {
              console.error('- GET Guess error:', error);
            });
      
        }
      });

      // make sure we conbvert the "stringified" date back to a Date object
      return savedGuesses;
    } catch (err) {
      console.debug(`Unable to re-hydrade stored guess IDs ${err}`);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    return [];
  });
  
  // Post the new guess request and update guesses if successful
  const addGuess = (numbers) => {
    console.debug('+ POST Guess', numbers);

    fetch(`/api/guesses`, { 
      method: "POST", 
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify({ "numbers": numbers }),
    })
      .then(response => response.json())
      .then(data => {
        console.debug('- POST Guess (success)', data);
        data.for_date = new Date(data.for_date);
        setGuesses(g => [...g, data]);
      })
      .catch(error => {
        console.error('- POST Guess error:', error);
      });
  }

  // delete a guess by passing the ID
  const delGuess = (id) => {
    if (!id) return;
    console.log(`+ DELETE guess (${id})`);

    fetch(`/api/guesses/${id}`, { method: "DELETE" })
    .then(() => {
        console.debug(`- DELETE Guess successful.`);
        setGuesses(g => g.filter(e => e.id !== id));
    })
    .catch(error => {
      console.debug(`- DELETE Guess error: /api/guesses -- `, error);
      // already deleted?
      // setGuesses(g => g.filter(e => e.id !== id));
    });
  }
  
  // when "guesses" change, store them in local storage
  useEffect(() => {
    if (Array.isArray(guesses) && guesses.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(guesses));
    }
    else if (Array.isArray(guesses) && guesses.length === 0) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [guesses]);
  

  return [guesses, setGuesses, addGuess, delGuess];
}

const App = ({receiver}) => {
  // const [requestResults, setRequestResults] = useState(true);
  const [results, setResults, getResults] = APIBackedResults();
  const [guesses, setGuesses, addGuess, delGuess ] = CachedGuesses();
  
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(false);


  // subscribe to common events when the receiver is defined
  useEffect(() => {
    function unsubscribe() {
      console.debug('!! receiver has changed !!');
    }

    console.debug('++ add event receivers only once ++');
    receiver.on(Events.NEW_DRAW_RESULTS, r => {
      setResults(res => [r, ...res].slice(0, MAX_NUMBERS));
      setGuesses(gss => gss.map(g => ({...g, 
        matches: Date.parse(g.for_date) === Date.parse(r.date) ? r.numbers.filter(v => g.numbers.includes(v)) : g.matches || undefined,
      })));
    });
    receiver.on(Events.OFFLINE, () => setOnline(false));
    receiver.on(Events.ONLINE, () => setOnline(true));
    receiver.on(Events.messageEvent, (m) => console.debug('TODO: deal with message event ', m));  
    return unsubscribe;
  }, [receiver, setResults, setGuesses]);

  // const refreshFunc = () => setRequestResults(true);
  const refreshFunc = getResults;
  const onGuessSubmit = (numbers) => addGuess(numbers);
  const onGuessCancel = (id) => delGuess(id);

  return (
    <div>
      <TopHeader />
      <JumboTitle />
      <Container>
        <Row>
          <Col xs={12} lg={9}>
            <GuessInput id="play" results={results} onGuess={onGuessSubmit} />
            <RecentGuesses guesses={guesses} onGuess={onGuessSubmit} onCancel={onGuessCancel} />
          </Col>
          <Col xs={12} lg>
            <RecentResults results={results} onRefresh={false ? null : refreshFunc} />
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
          <Col><Instructions id="howto"/></Col>
        </Row>
      </Container>
    </div>);
};

export default App;
