import React from 'react';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// import Spinner from 'react-bootstrap/Spinner';

import PropTypes from 'prop-types';

function inputAsGrid(numbers, guess, lastItem, onGuess) {
  // build a responsive grid...
  const numbergrid = [];
  for (let r = 0; r < 10; r += 1) {
    for (let c = 1; c <= 10; c += 1) {
      const value = (r * 10) + c;
      const valuelabel = (value < 10 ? "0":"") + value.toString(10);
      let tdclasses = [];
      for (var i in numbers) {
        if (numbers[i].value === value) {
          tdclasses.push(`Age${i}`);
          break;
        }
      }
      if (value === lastItem.value) tdclasses.push('AttentionGrabber'); 

      const active = guess && (guess.value === value);
      
      numbergrid.push(
        <Col key={value} className="GridNumber">
          <Button variant="default" size="sm" active={active} className={tdclasses.join(' ')}
            onClick={() => active ? onGuess(null) : onGuess(value)}
          >{valuelabel}</Button>
        </Col>
      );
    }
  }
  return <Container><Row>{numbergrid}</Row></Container>;
}

function inputAsControl(guess, onGuess) {
  return <form onSubmit={() => onGuess(null)}>
    TODO:
    <input type="number"  />
    </form>
}


const GuessInput = ({ size, numbers, guess, onGuess }) => {
  // console.debug('Numbers: ', { numbers, guesses, isBusy });
  // assume the array is sorted from most recent to least recent
  const lastItem = (numbers && numbers[0]) || { value: 'not loaded', date: Date.now() };
  const title = (size === "lg" ? "Guess a Lucky Number" : "Guess a Number");

  return (
    <Card id="play">
      <Card.Header>{title}</Card.Header>
      <Card.Body>
        {size === "lg" ? inputAsGrid(numbers, guess, lastItem, onGuess) : inputAsControl(guess, onGuess) }
      </Card.Body>
      <Card.Footer style={{ paddingTop: 5, paddingBottom: 5, fontSize: "small" }}>
          Last number: <b>{lastItem.value}</b> at {new Date(lastItem.date).toLocaleTimeString()}
          <Card.Link style={{ float: "right" }}>
            {/* {isBusy && <Spinner animation="border" size="sm" variant="primary"/>}
            <Button variant="link" size="sm" disabled={isBusy} onClick={onRefresh}>Refresh</Button> */}
          </Card.Link>
      </Card.Footer>
    </Card>
  );
}


GuessInput.propTypes = {
  numbers: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.objectOf(Date).isRequired,
    value: PropTypes.number.isRequired,
  })),
  guess: PropTypes.shape({
    id: PropTypes.string,
    value: PropTypes.number,
  }),
  onGuess: PropTypes.func.isRequired,
};

GuessInput.defaultProps = {
  numbers: null,
  guess: null,
};

export default GuessInput;
