import { useAuth0 } from '@auth0/auth0-react'
import './NavigationBar.css'
import LoginButton from '../Login/LoginButton';
import LogoutButton from '../Login/LogoutButton';
import { Link } from 'react-router';

export function NavigationBar() {

  const { isAuthenticated } = useAuth0();

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" id="navbar__logo">PeerPrep</Link>
        <div className="navbar__toggle" id="mobile-menu">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
        <ul className="navbar__menu">
          <li className="navbar__item">
            <Link to="/" className="navbar__links">
              Home
            </Link>
          </li>
          <li className="navbar__item">
            <Link to="/match" className="navbar__links">
              Join session
            </Link>
          </li>
          {isAuthenticated && (
            <li className="navbar__item">
              <Link to="/profile" className="navbar__links">
                Profile
              </Link>
            </li>
          )}
          <li className="navbar__btn">
            {isAuthenticated ? (
              <LogoutButton />
            ) : (
              <LoginButton />
            )}
          </li>
        </ul>
      </div>
    </nav>
  )
}