import React from 'react';
import { connect } from 'react-redux';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

const TopHeader = ({online}) => (
    <Navbar variant="dark" bg="dark" expand="lg" id="top">
        <Navbar.Brand href="#home">Lucky Numbers</Navbar.Brand>
        <Navbar.Collapse>
        <Nav.Link variant="dark" href="#top">Home</Nav.Link>
        <Nav.Link href="#play">Play</Nav.Link>
        <Nav.Link href="#howto">How To Play</Nav.Link>
        </Navbar.Collapse>
        <Navbar.Collapse className="justify-content-end">
        <Navbar.Text variant="dark">
            {online ? '[Online]' : '[Offline]'}
        </Navbar.Text>
        </Navbar.Collapse>
    </Navbar>
)

const mapStateToProps = state => ({
    online: state.online
});

export default connect(mapStateToProps)(TopHeader);
    