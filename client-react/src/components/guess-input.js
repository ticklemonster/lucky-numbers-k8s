import React, {useState} from 'react';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
// import Spinner from 'react-bootstrap/Spinner';

import PropTypes from 'prop-types';

function inputAsGrid(results, guess, onGuessSelected) {
  // build a responsive grid...
  const numbergrid = [];
  let numbercols = [];
  for (let n = 1; n <= 45; n++) {
      const valuelabel = (n < 10 ? "0":"") + n.toString(10);
      
      let btnClasses = [];
      const timesdrawn = results.reduce((sum, val) => sum += (val.numbers.indexOf(n) < 0 ? 0 : 1), 0);
      if (timesdrawn > 0) btnClasses.push(`Age${Math.max(10 - timesdrawn, 0)}`);

      const active = guess && (guess.indexOf(n) >= 0);

      numbercols.push(
        <Col key={n} className="GridNumber" >
          <Button key={n} variant="default" size="sm" active={active} className={btnClasses.join(' ')}
            onClick={() => onGuessSelected(n)}
          >{valuelabel}</Button>
        </Col>
      );
    
      if (n % 9 === 0) {
        numbergrid.push(<Row key={n}>{numbercols}</Row>);
        numbercols = [];
      }
  }
  return <Container fluid>{numbergrid}</Container>;
}

function inputAsForm(guess, onGuessSelected) {
  const possible_numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45];

  return (<Form>
    <Form.Text className="text-muted">Select 6 unique numbers to place a guess</Form.Text>
    <Form.Row style={{overflowX: "auto", marginBottom: 12 }}>
      <ButtonGroup>
      { possible_numbers.map((n) =>
        <Button 
          key={`button.${n}`}
          style={{ marginRight: 4, marginLeft: 4 }}
          variant={guess.indexOf(n) >= 0 ? 'info' : 'light'}
          onClick={() => onGuessSelected(n)}
        >{n}</Button>
      )}
      </ButtonGroup>
    </Form.Row>
  </Form>);

}


const GuessInput = ({ results, onGuess }) => {
  const [guess, setGuess] = useState([]);

  // console.debug('GuessInput: [', results, ']  state: ', guess);

  function randomGuess() {
    let g = [];
    while (g.length < 6) {
      let r = Math.trunc(Math.random()*45) + 1;
      if (g.indexOf(r) < 0) g.push(r);
    }

    setGuess(g);
  }

  function toggleGuess(g) {
    const gval = parseInt(g);
    if (isNaN(gval)) return;

    if (guess.indexOf(g) < 0) {
      setGuess([...guess, g]);
    } else {
      setGuess(guess.filter(e => e !== g));
    }
  }
  
  return (
    <Card id="play">
      <Card.Header><h5>Select your lukcy numbers</h5></Card.Header>
      <Card.Body className="text-center">
        <div className="d-md-none">{inputAsForm(guess, toggleGuess)}</div>
        <div className="d-none d-md-block">{inputAsGrid(results, guess, toggleGuess) }</div>
        <Card.Link><Button variant="primary" size="sm" onClick={randomGuess}>Pick</Button></Card.Link>
        <Card.Link><Button variant="success" size="sm" disabled={guess.length !== 6} onClick={() => onGuess(guess)}>Guess</Button>
        </Card.Link>
        <Card.Link>
          <Button variant="secondary" size="sm" disabled={guess.length < 1} onClick={() => setGuess([])}>Clear</Button>
        </Card.Link>
      </Card.Body>
      <Card.Footer style={{ fontSize: "small" }}>
          Selected: {guess.length} of 6 
          {/* <b>{results[0] && results[0].value}</b> at {new Date(results[0] && results[0].date).toLocaleTimeString()} */}
      </Card.Footer>
    </Card>
  );
}

GuessInput.propTypes = {
  results: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.objectOf(Date).isRequired,
    numbers: PropTypes.arrayOf(PropTypes.number).isRequired,
  })),
  // guesses: PropTypes.arrayOf(PropTypes.shape({
  //   id: PropTypes.string,
  //   for_date: PropTypes.objectOf(Date),
  //   values: PropTypes.arrayOf(PropTypes.number),
  // })),
  onGuess: PropTypes.func.isRequired,
};

GuessInput.defaultProps = {
  results: [],
};

export default GuessInput;
