import React from "react";
// import "bootstrap/dist/css/bootstrap.min.css";
import "../styless/terms.css";

const Terms = ({ onAccept }) => {
  return (
    <div className="terms-wrapper">
      <div className="container">
        <div className="card shadow-lg p-4 terms-card">
          <h2 className="text-center mb-4 text-primary">
            🧶 Chrochet Studio – Terms & Conditions
          </h2>

          <div className="terms-content">

            <h5>1. Account Responsibility</h5>
            <p>
              You must provide accurate information during registration.
              You are responsible for maintaining the confidentiality of your password.
            </p>

            <h5>2. Orders & Payments</h5>
            <p>
              Orders are confirmed only after successful payment.
              Prices may change without prior notice.
            </p>

            <h5>3. Handmade Product Notice</h5>
            <p>
              All products are handmade. Slight variations in color or design may occur.
              Customized orders are non-refundable.
            </p>

            <h5>4. User Conduct</h5>
            <p>
              Users must not misuse the website or provide false information.
            </p>

            <h5>5. Privacy</h5>
            <p>
              Your personal information is used only for order processing.
              We do not sell customer data.
            </p>

            <h5>6. Agreement</h5>
            <p>
              By clicking "I Agree", you confirm that you accept these terms.
            </p>

          </div>

          <div className="text-center mt-4">
            <button className="btn btn-primary px-4" onClick={onAccept}>
              I Agree
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Terms;
