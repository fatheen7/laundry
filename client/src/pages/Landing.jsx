import { Link } from 'react-router-dom';
import { getWhatsAppLink } from '../config';
import { FaBolt, FaShieldAlt, FaSmile, FaWhatsapp, FaCheckCircle, FaTruck, FaTshirt } from 'react-icons/fa';

export default function Landing() {
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-left">
          <h1>Ironed to perfection. Delivered in hours.</h1>
          <p>QuickIron brings speedy, reliable, and affordable ironing to your door. Order on WhatsApp—track in real time.</p>
          <div className="cta-row">
            <a href={getWhatsAppLink('Hi QuickIron, I want to place an ironing order')} className="btn btn-primary">
              <FaWhatsapp /> Place Order on WhatsApp
            </a>
            <Link to="/auth" className="btn btn-secondary">Login / Track</Link>
          </div>
          <div className="trust-row">
            <span><FaBolt /> Under-hours delivery</span>
            <span><FaShieldAlt /> Quality guarantee</span>
            <span><FaSmile /> No-crease promise</span>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-art">
            <div className="bubble b1" />
            <div className="bubble b2" />
            <div className="bubble b3" />
            <FaTshirt className="shirt" />
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature"><FaTruck /><h3>Pickup & Delivery</h3><p>We pick up, iron, and deliver—fast.</p></div>
        <div className="feature"><FaCheckCircle /><h3>Affordable</h3><p>Simple pricing. No surprises.</p></div>
        <div className="feature"><FaShieldAlt /><h3>Guarantee</h3><p>Wrinkle-free or we re-press.</p></div>
      </section>

      <section className="testimonials">
        <h2>Loved by busy households</h2>
        <div className="cards">
          <div className="card">
            <p>“Ordered at 10am, delivered before 2pm. Shirts look amazing.”</p>
            <span>— Priya, Sector 5</span>
          </div>
          <div className="card">
            <p>“Reliable and super affordable. Tracking kept me updated.”</p>
            <span>— Arjun, Block A</span>
          </div>
          <div className="card">
            <p>“Life saver for busy weeks. Highly recommend.”</p>
            <span>— Neha, Tech Park</span>
          </div>
        </div>
      </section>

      <section className="guarantees">
        <h2>Our promises</h2>
        <ul>
          <li><FaCheckCircle /> Under-hours delivery in our service area</li>
          <li><FaCheckCircle /> Damage coverage and re-press guarantee</li>
          <li><FaCheckCircle /> Secure OTP login and order tracking</li>
        </ul>
      </section>

      <section className="contact">
        <h2>Contact us</h2>
        <p>Have questions? Chat with us on WhatsApp or log in to place an order.</p>
        <div className="cta-row">
          <a href={getWhatsAppLink('Hi, I have a question about QuickIron')} className="btn btn-primary"><FaWhatsapp /> WhatsApp Us</a>
          <Link to="/auth" className="btn btn-secondary">Login</Link>
        </div>
      </section>
    </div>
  );
}