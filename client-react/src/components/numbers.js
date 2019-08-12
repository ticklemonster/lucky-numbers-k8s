import React, { PureComponent } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import PropTypes from 'prop-types';

const findValue = (o, v) => o.value === v;

class Numbers extends PureComponent {
  render() {
    console.debug('Numbers.render() - ', this.props);
    const { numbers, canRefresh, onRefresh, guesses, onGuess, onClear } = this.props;

    // assume the array is sorted from most recent to least recent
    const showItems = numbers.slice(0,10).map(n => ({
      date: Date.parse(n.date),
      value: parseInt(n.value),
    }));
    const lastItem = showItems[0] || { value: 'not loaded', date: Date.now() };

    // build a responsive grid...
    const numbergrid = [];
    for (let r = 0; r < 10; r += 1) {
      for (let c = 1; c <= 10; c += 1) {
        const value = (r * 10) + c;
        const valuelabel = (value < 10 ? "0":"") + value.toString(10);
        let tdclasses = ['GridNumber'];
        for (var i in showItems) {
          if (showItems[i].value === value)
            tdclasses.push(`Age${i}`);
        }
        if (value === lastItem.value) tdclasses.push('AttentionGrabber'); 

        let active = guesses.find(g => findValue(g, value));
        
        numbergrid.push(
          <Col key={value} className={tdclasses.join(' ')}>
            <Button variant="link" size="sm" active={active}
              onClick={() => active ? onClear(value) : onGuess(value)}
            >{valuelabel}</Button>
          </Col>
        );
      }
    }

    return (
      <Card>
        <Card.Header as="h5">Guess a Lucky Number</Card.Header>
        <Card.Body>
          <Container><Row>{numbergrid}</Row></Container>
        </Card.Body>
        <Card.Footer style={{ paddingTop: 5, paddingBottom: 5, fontSize: "small" }}>
            Last number: <b>{lastItem.value}</b> at {new Date(lastItem.date).toLocaleTimeString()}
            <Card.Link style={{ float: "right" }}>
              <Button variant="link" size="sm" disabled={!canRefresh} onClick={onRefresh}>Refresh</Button>
            </Card.Link>
        </Card.Footer>
      </Card>
    );
  }
}

Numbers.propTypes = {
  numbers: PropTypes.array,
  canRefresh: PropTypes.bool,
  onRefresh: PropTypes.func.isRequired,
  guesses: PropTypes.array,
};

Numbers.defaultProps = {
  numbers: [],
  guesses: [],
  canRefresh: true,
};

export default Numbers;
