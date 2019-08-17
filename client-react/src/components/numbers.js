import React from 'react';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import PropTypes from 'prop-types';

const findValue = (o, v) => o.value === v;

const Numbers = ({ numbers, guesses, isBusy, onRefresh, onPlaceGuess, onClearGuess }) => {
  // console.debug('Numbers: ', { numbers, guesses, isBusy });
  // assume the array is sorted from most recent to least recent
  const lastItem = numbers[0] || { value: 'not loaded', date: Date.now() };

  // build a responsive grid...
  const numbergrid = [];
  for (let r = 0; r < 10; r += 1) {
    for (let c = 1; c <= 10; c += 1) {
      const value = (r * 10) + c;
      const valuelabel = (value < 10 ? "0":"") + value.toString(10);
      let tdclasses = ['GridNumber'];
      for (var i in numbers) {
        if (numbers[i].value === value)
          tdclasses.push(`Age${i}`);
      }
      if (value === lastItem.value) tdclasses.push('AttentionGrabber'); 

      const active = guesses.find(g => findValue(g, value));
      
      numbergrid.push(
        <Col key={value} className={tdclasses.join(' ')}>
          <Button variant="link" size="sm" active={active}
            onClick={() => active ? onClearGuess(active) : onPlaceGuess(value)}
          >{valuelabel}</Button>
        </Col>
      );
    }
  }

  return (
    <Card id="play">
      <Card.Header><strong>Guess a Lucky Number</strong></Card.Header>
      <Card.Body>
        <Container><Row>{numbergrid}</Row></Container>
      </Card.Body>
      <Card.Footer style={{ paddingTop: 5, paddingBottom: 5, fontSize: "small" }}>
          Last number: <b>{lastItem.value}</b> at {new Date(lastItem.date).toLocaleTimeString()}
          <Card.Link style={{ float: "right" }}>
            <Button variant="link" size="sm" disabled={isBusy} onClick={onRefresh}>Refresh</Button>
          </Card.Link>
      </Card.Footer>
    </Card>
  );
}


Numbers.propTypes = {
  numbers: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.objectOf(Date).isRequired,
    value: PropTypes.number.isRequired,
  })),
  guesses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    value: PropTypes.number,
  })),
  isBusy: PropTypes.bool,
  onRefresh: PropTypes.func.isRequired,
  onPlaceGuess: PropTypes.func.isRequired,
  onClearGuess: PropTypes.func.isRequired,
};

Numbers.defaultProps = {
  numbers: [],
  guesses: [],
};

export default Numbers;
