import React from 'react';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';

class Messages extends React.PureComponent {
  
  render() {
    const { messages, online } = this.props;

    return (
      <Card>
        <Card.Header as="h5">Messages</Card.Header>
        {!online && <Card.Body><Card.Text><i>Offline</i></Card.Text></Card.Body>}
        <ListGroup>
          {messages.map(m => <ListGroupItem key={m.timestamp}>
            {new Date(m.timestamp).toLocaleTimeString()}: {m.message}
          </ListGroupItem>)}
          {messages && messages.length === 0 && <ListGroupItem key="none">No Messages</ListGroupItem>}
        </ListGroup>
        <Card.Footer style={{ paddingTop: 5, paddingBottom: 5, fontSize: "small" }}>
            <Button variant="link" size="sm" disabled={online}>Refresh</Button>
        </Card.Footer>
      </Card>
    );
  }
}

Messages.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  online: PropTypes.bool
};



export default Messages;
