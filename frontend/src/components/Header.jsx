import { Link } from 'react-router'
import './Header.css';


export default function Header() {
  return (
    <div className="header">
      <div className='left-section'>
        <Link to="/" className="header-link">
          Home Page   
        </Link>
      </div>
      <div className='right-section'>
        <Link to="/login" className="header-link">
          Login
        </Link>
      </div>
    </div>
  );
};
