import React from 'react';
import PropTypes from 'prop-types';

import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

const RecentResults = ({ results, onRefresh }) => {
  
  return (
    <Card bg='none'>
      <Card.Header><h5>Recent Results</h5></Card.Header>
      <Card.Link className="text-right"><Button variant="link" size="sm" disabled={!onRefresh} onClick={onRefresh}>Refresh</Button></Card.Link>
      <Card.Body style={{ paddingTop: 0 }}>
        <ListGroup variant="flush">
        { Array.isArray(results) && results.slice(0, 9).map(n => 
          <ListGroup.Item key={n.id} className={Date.now() - n.date < 60000 ? "AttentionGrabber" : null}>
                {n.numbers.join(', ')}
                <small className="d-none d-lg-block">{n.date.toLocaleTimeString()}</small>
          </ListGroup.Item>
        )}
        { results instanceof Promise && 
          <ListGroup.Item><Spinner /></ListGroup.Item>
        }
        </ListGroup>
      </Card.Body>
    </Card>
  )
};

RecentResults.propTypes = {
  results: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.shape({
      date: PropTypes.objectOf(Date).isRequired,
      numbers: PropTypes.arrayOf(PropTypes.number).isRequired,
    })),
    PropTypes.instanceOf(Promise)
  ]),
  onRefresh: PropTypes.func
};

RecentResults.defaultProps = {
  results: [],
  onRefresh: null
}

export default RecentResults;
