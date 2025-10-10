import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useAuth0 } from '@auth0/auth0-react';
import Profile from './components/Profile';
import LoginButton from './components/LoginButton';
import LogoutButton from './components/LogoutButton';

function App() {

  const { isAuthenticated, loginWithPopup, isLoading } = useAuth0();

  if (isLoading) {
    return <p>Loading...</p>
  } else {
    if (isAuthenticated) {
      return (
        <div>
          <LogoutButton />
          <Profile />
        </div>
      )

    } else {
      return <LoginButton />
    }
  }

}

export default App
