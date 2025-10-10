import { useAuth0 } from "@auth0/auth0-react";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import { Link } from "react-router";
import './Header.css';

export default function Header() {

  const { isAuthenticated, user, isLoading, logout } = useAuth0();

  const UserLoggedInHeader = () => {
    return (
      <div className="header">
        <div className="left-section">
          <Link to="/" className="header-link">Home Page</Link>
        </div>
        <div className="right-section">
          {/* Optional: show email if present */}
          {user?.username && <span className="header-user">Hi, {user.username}</span>}
          <LogoutButton />
        </div>
      </div>
    );
  };

  const UserNotLoggedInHeader = () => {
    return (
      <div className="header">
        <div className='left-section'>
          <Link to="/" className="header-link">
            Home Page
          </Link>
        </div>
        <div className='right-section'>
          <LoginButton />
        </div>
      </div>
    );
  }

  return isAuthenticated ? <UserLoggedInHeader /> : <UserNotLoggedInHeader />
}