import React from 'react';
import Card from 'react-bootstrap/Card';

class Instructions extends React.PureComponent {
  
  render() {
    return (
      <Card>
        <Card.Header as="h5">Instructions</Card.Header>
        <Card.Body>
          <Card.Title>Numbers</Card.Title>
          <Card.Text>
            A random number between 1 and 100 is drawn every minute.
            The last 10 numbers are highlighted on the board.
          </Card.Text>
          <Card.Title>Guesses</Card.Title>
          <Card.Text>
            Place a guess by selecting a number on the board.
            Cancel your guess by selecting the number again or choosing a different number
          </Card.Text>
          <Card.Title>Winners</Card.Title>
          <Card.Text>
            You win if you guess correctly.
          </Card.Text>
        </Card.Body>
      </Card>
    );
  }
}

export default Instructions;
