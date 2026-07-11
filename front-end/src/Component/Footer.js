import React from "react";
import { Link } from "react-router-dom";
import "../styless/footer.css";

export default function Footer() {
    return (
        <>
            <footer className="footer-section py-5">
                <div className="container">
                    <div className="row">
                        <div className="col-md-3">
                            <h5 className="handmade-logo">HANDMADE ❤️</h5>
                            <p>Creating timeless crochet pieces made with love.</p>
                        </div>

                        <div className="col-md-3">
                            <h6>Explore</h6>
                            <ul className="footer-links">
                                <li><Link className="nav-link" to="/Product">Product</Link></li>
                                <li><Link className="nav-link" to="/AboutUs">About Us</Link> </li>
                                <li>Workshop</li>
                            </ul>
                        </div>

                        <div className="col-md-3">
                            <h6>Customer Care</h6>
                            <ul className="footer-links">
                                <li>Shipping Policy</li>
                                <li>Returns</li>
                                <li><Link className="nav-link" to="/Contact">Contact</Link></li>
                            </ul>
                        </div>

                        <div className="col-md-3">
                            <h6>Stay Connected</h6>
                            <input type="email" className="form-control" placeholder="Your email address" />
                        </div>
                    </div>
                </div>
            </footer>
        </>
    )
}