import React from 'react';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

const TopHeader = () => (
    <Navbar variant="dark" bg="dark" expand="lg" id="top">
        <Navbar.Brand variant="dark" bg="dark" href="#top">Lucky Numbers</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
            <Nav>
                <Nav.Link href="#top">Home</Nav.Link>
                <Nav.Link href="#play">Play</Nav.Link>
                <Nav.Link href="#howto">How To Play</Nav.Link>
            </Nav>
        </Navbar.Collapse>
    </Navbar>
)

export default TopHeader;
    