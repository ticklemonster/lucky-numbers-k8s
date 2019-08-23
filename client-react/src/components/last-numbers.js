import React from 'react';
import PropTypes from 'prop-types';

import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// import Button from 'react-bootstrap/Button';
// import Spinner from 'react-bootstrap/Spinner';

const LastNumbers = ({ numbers, onRefresh }) => {
  return (
    <Card className='primary'>
    <Card.Header>Last Numbers</Card.Header>
    <Card.Body>
      <Row>
        {numbers.map(n => 
          <Col xs={2} lg={3} style={{ marginBottom: 16 }} key={n.date}>
            <h5 style={{ marginBotton: 0, textAlign: "center"}}>{n.value}</h5>
            <small className="d-none d-lg-block">{n.date.toLocaleTimeString()}</small>
          </Col>
        )}
      </Row>
    </Card.Body>
  </Card>
  )
};

LastNumbers.propTypes = {
  numbers: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.objectOf(Date).isRequired,
    value: PropTypes.number.isRequired,
  })),
  onRefresh: PropTypes.func,
};

LastNumbers.defaultProps = {
  onRefresh: null,
}

export default LastNumbers;
