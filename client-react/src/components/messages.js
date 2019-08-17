import React from 'react';
import PropTypes from 'prop-types';

import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';

const Messages = ({ messages, online, onRefreshClick, onDismissClick }) => (
  <Card className='primary'>
    <Card.Header>
      Messages <span style={{ float: "right" }}>{!online && <i>Offline</i>}</span>
    </Card.Header>
    <Card.Body>
    { messages.map(m => 
      <Alert key={m.id} variant={m.level || 'primary'} onClose={() => onDismissClick(m.id)} dismissible>
        <small>{m.timestamp.toLocaleTimeString()}</small>
        <br/>
        {m.message}
      </Alert>
    )}
    { messages.length > 0 && 
      <Alert variant="light">
        <Alert.Link href="#" onClick={onRefreshClick}>Dismiss All Messages</Alert.Link>
      </Alert>
    }
    { messages.length === 0 && 
      <Alert variant="light"><i>No messages</i></Alert>
    }
    </Card.Body>
  </Card>
);

Messages.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.objectOf(Date).isRequired,
      message: PropTypes.string.isRequired,
      level: PropTypes.string,
    })
  ).isRequired,
  online: PropTypes.bool,
  onRefreshClick: PropTypes.func.isRequired,
};

Messages.defaultProps = {
  online: false,
}

export default Messages;
