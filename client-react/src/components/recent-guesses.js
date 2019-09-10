import React from 'react';
import PropTypes from 'prop-types';

import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
// import Col from 'react-bootstrap/Col';
// import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button';
// import Spinner from 'react-bootstrap/Spinner';

const NumberList = ({ numbers, matches }) => {
  if (!matches)
    return numbers.join(', ');

  let rval = [];
  let joiner = '';
  for (let n in numbers) {
    rval.push(joiner);
    rval.push(<span key={n} className={matches.indexOf(numbers[n]) >= 0 ? 'matched' : ''}>{numbers[n]}</span>);
    joiner = ', ';
  }

  return rval;
}

const RecentGuesses = ({ guesses, onGuess, onCancel }) => {
  console.debug('Recent Guesses with ', guesses);

  if (Array.isArray(guesses)) {
    // sort by most-recent-first
    guesses.sort((g1, g2) => (new Date(g2.for_date) - new Date(g1.for_date)))
  }

  return (
      <Card style={{marginTop: 16}}>
        <Card.Header><h5>Recent Guesses</h5></Card.Header>
        <Card.Body>
          <Row>
          {Array.isArray(guesses) && guesses.map(n => 
            <Card bg="light" key={n.id}>
              <Card.Body className="text-center">
                <Card.Title><NumberList numbers={n.numbers} matches={n.matches} /></Card.Title>
                <Card.Text>- {new Date(n.for_date).toLocaleTimeString()} -</Card.Text>
                <Card.Link>
                  {new Date(n.for_date) >= Date.now() ? 
                    <Button size="sm" disabled>Waiting...</Button>
                  :
                    <Button size="sm" onClick={() => onGuess(n.numbers)}>Play Again</Button>
                  }
                </Card.Link>
                <Card.Link>
                  {new Date(n.for_date) >= Date.now() ? 
                    <Button size="sm" variant="danger" onClick={() => onCancel(n.id)}>Cancel</Button>
                  :
                    <Button size="sm" variant="secondary" onClick={() => onCancel(n.id)}>Forget</Button>
                  }
                </Card.Link>

              </Card.Body>
            </Card>        
          )}
          </Row>
        </Card.Body>
      </Card>
  )
};

RecentGuesses.propTypes = {
  guesses: PropTypes.arrayOf(
    PropTypes.shape({
      for_date: PropTypes.instanceOf(Date).isRequired,
      numbers: PropTypes.arrayOf(PropTypes.number).isRequired,
    })),
  onCancel: PropTypes.func,
  onGuess: PropTypes.func,
};

RecentGuesses.defaultProps = {
  guesses: []
}

export default RecentGuesses;
