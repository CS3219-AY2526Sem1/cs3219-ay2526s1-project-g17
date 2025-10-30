import { useAuth0 } from '@auth0/auth0-react'
import './NavigationBar.css'
import LoginButton from '../Login/LoginButton';
import LogoutButton from '../Login/LogoutButton';

export function NavigationBar() {

  const { isAuthenticated } = useAuth0();

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <a href="/" id="navbar__logo">PeerPrep</a>
        <div className="navbar__toggle" id="mobile-menu">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
        <ul className="navbar__menu">
          <li className="navbar__item">
            <a href="/" className="navbar__links">
              Home
            </a>
          </li>
          <li className="navbar__item">
            <a href="/match" className="navbar__links">
              Join session
            </a>
          </li>
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