import React from "react";
import "../styless/about.css";
import homed from "../images/homedecor.jpg";

export default function AboutUS() {
  return (
    <div className="about-page">

      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>Our Story of Handmade Love 🧶</h1>
          <p>
            Every stitch tells a story. Our crochet pieces are handcrafted
            with passion, care and creativity to bring warmth into your life.
          </p>
        </div>
      </section>

      {/* About Content */}
      <section className="about-content container">
        <div className="about-text">
          <h2>Who We Are</h2>
          <p>
            We are a small handmade crochet brand creating beautiful,
            sustainable and unique pieces. From cozy home decor to cute fashion
            accessories — every item is made with love and patience.
          </p>

          <p>
            Our mission is to promote slow fashion, eco-friendly production
            and handmade artistry.
          </p>
        </div>

        <div className="about-image">
          <img
            src={homed}
            alt="Crochet"
          />
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-section">
        <h2>Why Choose Us 💛</h2>

        <div className="why-grid">
          <div className="why-card">
            <span>🧵</span>
            <h4>100% Handmade</h4>
            <p>Every product is carefully handcrafted stitch by stitch.</p>
          </div>

          <div className="why-card">
            <span>🌿</span>
            <h4>Sustainable</h4>
            <p>We use eco-friendly yarns and minimal packaging.</p>
          </div>

          <div className="why-card">
            <span>🎁</span>
            <h4>Custom Orders</h4>
            <p>Personalized crochet gifts made specially for you.</p>
          </div>

          <div className="why-card">
            <span>🚚</span>
            <h4>Pan India Delivery</h4>
            <p>Safe and reliable shipping across India.</p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="timeline-section">
        <h2>Our Journey 🌸</h2>

        <div className="timeline">
          <div className="timeline-item">
            <h4>2022 - The Beginning</h4>
            <p>Started as a small passion project from home.</p>
          </div>

          <div className="timeline-item">
            <h4>2023 - First 100 Orders</h4>
            <p>Received overwhelming love and support.</p>
          </div>

          <div className="timeline-item">
            <h4>2024 - Brand Expansion</h4>
            <p>Launched new collections and custom designs.</p>
          </div>
        </div>
      </section>

      {/* Sustainable Badge */}
      <section className="sustainable-section">
        <div className="badge bg-dark">
          🌿 Proudly Sustainable & Handmade
        </div>
        <p>
          Supporting local craftsmanship and promoting slow fashion
          for a better future.
        </p>
      </section>

    </div>
  );
}
