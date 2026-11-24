import React from 'react';
import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="forma-public__footer forge-public-footer">
      <div className="forge-public-footer__inner">
        <div className="forge-public-footer__bottom">
          <p>© {new Date().getFullYear()} FORGE Fitness</p>
          <nav className="forge-public-footer__links" aria-label="Footer navigation">
            <Link to="/memberships">Pricing</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
