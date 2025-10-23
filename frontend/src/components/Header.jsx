import { useAuth0 } from "@auth0/auth0-react";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import { Link } from "react-router";
import './Header.css';

export default function Header() {

  const { isAuthenticated, user } = useAuth0();

  const UserLoggedInHeader = () => {
    return (
      <div className="header">
        <div className="left-section">
          <Link to="/" className="header-link">PeerPrep</Link>
        </div>
        <div className="right-section">
          {/* Optional: show email if present */}
          {user?.nickname && <span className="header-user">Hi, {user.nickname}</span>}
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
            PeerPrep
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