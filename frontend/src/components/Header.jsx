import { Link, useNavigate } from 'react-router'
import './Header.css';
import { useEffect, useState } from 'react';


export default function Header({ isLoggedIn, setIsLoggedIn }) {

  // the local storage login item
  // contains userLogin(T/F), token: JWT Token, username, email, isAdmin(T/F)
  const [login, setLogin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    hydrateStateWithLocalStorage();
  }, [isLoggedIn]);

  const logout = () => {
    localStorage.removeItem('login');
    setIsLoggedIn(false);
    navigate("/");
  }

  const hydrateStateWithLocalStorage = () => {
    const localStorageLoginString = localStorage.getItem('login');

    if (!localStorageLoginString) {
      setLogin(null)
      return;
    }
    try {
      const parsedLogin = JSON.parse(localStorageLoginString)
      setLogin(parsedLogin)
    } catch (error) {
      console.error("Error while hydrating the header bar: ", error);
      setLogin(null);
    }
  }

  const UserLoggedInHeader = () => {
    return (
      <div className="header">
        <div className="left-section">
          <Link to="/" className="header-link">Home Page</Link>
        </div>
        <div className="right-section">
          {/* Optional: show username if present */}
          {login?.username && <span className="header-user">Hi, {login.username}</span>}
          <button className="header-link" onClick={logout}>Log out</button>
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
          <Link to="/login" className="header-link">
            Login
          </Link>
          <Link to="/register" className="header-link">
            Register
          </Link>
        </div>
      </div>
    );
  }

  return isLoggedIn ? <UserLoggedInHeader /> : <UserNotLoggedInHeader />;
};
