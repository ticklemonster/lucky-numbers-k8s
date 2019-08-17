/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import { connect } from 'react-redux';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Our components
import { Actions } from '../actions';
import PushReceiver from '../push-receiver';

// Display components
import TopHeader from './top-header';
import JumboTitle from './jumbo-title';
import NumbersGrid from './numbers-redux';
import VisibleMessages from './messages-redux';
import Instructions from './instructions';

class App extends Component {
  constructor(props) {
    super(props);
    this.dispatch = props.dispatch;
    this.receiver = new PushReceiver(this.dispatch);
  }

  componentDidMount() {
    this.dispatch(Actions.refreshNumbers());
  }

  componentWillUnmount() {
    
  }

  render() {
    return (<div>
      <TopHeader />
      <Container>
        <Row>
          <Col><JumboTitle /></Col>
        </Row>
        <Row>
          <Col xs={12} md={8}><NumbersGrid id="play"/>;</Col>
          <Col><VisibleMessages /></Col>
        </Row>
        <Row>
          <Col><Instructions id="instructions"/></Col>
        </Row>
      </Container>
    </div>);
  }
}

export default connect()(App);
