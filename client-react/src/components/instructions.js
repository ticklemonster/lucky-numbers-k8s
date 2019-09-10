import React from 'react';
import Card from 'react-bootstrap/Card';

const Instructions = () => (
  <Card id="howto">
    <Card.Header>Instructions</Card.Header>
    <Card.Body>
      <Card.Title>Lucky Draws</Card.Title>
      <Card.Text>
        Six random numbers are drawn from a pool of 45 every minute.
        <br />
        <a href="#recent">Recent results</a> and <a href="#statistics">statistics</a> are available to help you choose.
      </Card.Text>
      <Card.Title>Guesses</Card.Title>
      <Card.Text>
        Place a guess by selecting 6 numbers from the <a href="#play">board</a>. Click a selected number again to unselect it. 
        When 6 numbers are selected, choose "Guess" to place the guess. 
        Recent guesses are recorded and you can "Guess Again" for a previous guess. 
      </Card.Text>
      <Card.Title>Winners</Card.Title>
      <Card.Text>
        You win if you guess 4 or more numbers for any draw.
      </Card.Text>
    </Card.Body>
  </Card>
);

export default Instructions;
