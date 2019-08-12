/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Dispatcher } from 'flux';

// Our components
import Numbers from './components/numbers';
import Messages from './components/messages';
import Instructions from './components/instructions';

// Flux-style data stores
import NumbersStore from './stores/numbers-store';
import MessageStore from './stores/mqtt-store';

// Flux-style actions
import NumbersActions from './actions/numbers-actions';


class App extends Component {
  constructor(props) {
    super(props);

    this.dispatcher = new Dispatcher();
    this.numbers = new NumbersStore(this.dispatcher);
    this.messages = new MessageStore(this.dispatcher);
    
    this.state = {
      connected: false,
      isBusy: false,
      numbers: [],
      guesses: [],
      messages: [],
    };

    this.onRefreshPressed = this.onRefreshPressed.bind(this);
    this.onGuessPressed = this.onGuessPressed.bind(this);
    this.onGuessClearPressed = this.onGuessClearPressed.bind(this);
  }

  componentDidMount() {
    // set up listeners for data changes on the stores
    this.numbers.on(NumbersActions.changeEvent, () => {
      // console.debug('APP saw changeEvent from NumbersStore');   
      this.setState((oldstate) => {
        const newState = {
          isBusy: this.numbers.isBusy(),
          numbers: this.numbers.getNumbers().slice(),
          guesses: this.numbers.getGuesses(),
        };
        console.debug('Numbers.changeEvent: ', oldstate.guesses, newState.guesses);
        if (newState.guesses.length > 0 && oldstate.guesses.length === 0) {
          // a new guess was made
          newState.messages = this.appendMessage(oldstate.messages, `Your guess for ${newState.guesses[0].value} has been registered  (id: ${newState.guesses[0].id})`);
        }
        else if (newState.guesses.length > 0 && oldstate.guesses.length > 0 && newState.guesses[0].value !== oldstate.guesses[0].value) {
          // updated a guess?
          newState.messages = this.appendMessage(oldstate.messages, `You changed your guess from ${oldstate.guesses[0].value} to ${newState.guesses[0].value}  (id: ${newState.guesses[0].id})`);
        }
        else if (newState.guesses.length === 0 && oldstate.guesses.length > 0) {
          // cleared a guess
          newState.messages = this.appendMessage(oldstate.messages, `Your guess was cleared for ${oldstate.guesses[0].value}  (id: ${oldstate.guesses[0].id})`);
        }

        return newState;
      });
    });
    this.messages.on(NumbersActions.onlineEvent, () => {
      this.setState({ connected: this.messages.isConnected()});
      this.onRefreshPressed();
    });
    this.messages.on(NumbersActions.offlineEvent, () => {
      this.setState({ connected: this.messages.isConnected() });
      this.onRefreshPressed();
    });
    this.messages.on(NumbersActions.winnersEvent, (guesses) => {
      if (guesses.find(v => v === `guess:${this.state.guesses[0]}`)) {
        this.setState(oldstate => {
          const newmsgs = this.appendMessage(oldstate.messages, `You won (and so did ${guesses.length-1} other player${guesses.length-1 !== 1?"s":""})`);  
          return { messages: newmsgs };
        });
        alert('WINNER!!!');
      } else {
        this.setState((oldstate) => {
          const newmsgs = this.appendMessage(oldstate.messages, `${guesses.length} other player${guesses.length !== 1?"s":""} guessed ${this.state.numbers[0].value} correctly.`);  
          return { messages: newmsgs }
        })
        console.debug(`${guesses.length} others won`);
      }
    })
    this.messages.on(NumbersActions.messageEvent, (msg) => {
      this.setState((oldstate) => {
        let newmsgs = oldstate.messages.slice(0);
        newmsgs.unshift({
          timestamp: new Date(), 
          message: msg,
        });
        if (newmsgs.length > 10) newmsgs.pop();
        return { messages: newmsgs }
      })
    })

    this.numbers.on('error', e => console.debug('App got error ', e, ' from numbersStore'));

    // kick off the initilal update
    // this.onRefreshPressed();
  }

  componentWillUnmount() {
    // unregister listeners
    this.messages.removeAllListeners();
    this.numbers.removeAllListeners();
  }

  onRefreshPressed() {
    // console.log('App: numbers store updated');
    this.dispatcher.dispatch(NumbersActions.getNumbers());
  }

  onGuessPressed(value) {
    console.debug(`App:onGuessPressed ${value}`);
    this.dispatcher.dispatch(NumbersActions.guessNumber(value));
  }

  onGuessClearPressed(value) {
    console.debug(`App:onGuessClearPressed ${value}`);
    const g = this.state.guesses[0];
    if (g !== null && g.ref) {
      this.dispatcher.dispatch(NumbersActions.deleteGuess(g.ref));
    }
  }

  appendMessage(currentMessages, newMessage) {
    const newMessages = currentMessages.slice(0);
    newMessages.unshift({
      timestamp: new Date(), 
      message: newMessage
    });
    while (newMessages.length > 10) newMessages.pop();
    return newMessages;
  }

  render() {
    const {connected, numbers, isBusy, messages, guesses} = this.state;
    // console.debug('App.render()');

    return (
      <div className="App">
        <Navbar variant="dark" bg="dark" expand="lg" id="home">
          <Navbar.Brand href="#home">Lucky Numbers</Navbar.Brand>
          <Navbar.Collapse>
            <Nav.Link variant="dark" href="#home">Home</Nav.Link>
            <Nav.Link href="#play">Play</Nav.Link>
            <Nav.Link href="#messages">Messages</Nav.Link>
          </Navbar.Collapse>
          <Navbar.Collapse className="justify-content-end">
            <Navbar.Text variant="dark">
              {connected ? '[Online]' : '[Offline]'}
            </Navbar.Text>
          </Navbar.Collapse>
        </Navbar>

        <Jumbotron> 
          <h1>Feeling Lucky?</h1>
          <p>
            This is a sample React-based app that uses REST API calls and
            MQTT updates. It is intended only as a sample - but feel free to play!
          </p>
        </Jumbotron>

        <Container>
          <Row id="play">
            <Col sm={6} md={8}>
              <Numbers
                numbers={numbers}
                guesses={guesses}
                canRefresh={!isBusy}
                onRefresh={this.onRefreshPressed}
                onGuess={this.onGuessPressed}
                onClear={this.onGuessClearPressed}
              />
            </Col>
            <Col sm={6} md={4}>
              <Instructions />
            </Col>
          </Row>

          <Row id="messages" style={{marginTop: 100}}>
            <Col>
              <Messages messages={messages} online={connected}/>
            </Col>
          </Row>
        </Container>


        <footer>
          <center>
            <small>- footer notices go here -</small>
          </center>
        </footer>

      </div>

    );
  }
}

export default App;
