import { Routes, Route } from 'react-router'
import './App.css'
import Header from './components/Header'
import { LoginPage } from './pages/login/LoginPage'
import { HomePage } from './pages/login/HomePage'
import { useState } from 'react'
import { RegisterPage } from './pages/register/RegisterPage'


function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const raw = localStorage.getItem('login');
      const parsed = raw ? JSON.parse(raw) : null;

      if (parsed !== null) {
        return !!parsed?.userLogin; 
      }
    } catch {
      return false;
    }
  });



  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/login" element={<LoginPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}></Route>
        <Route path="/register" element={<RegisterPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}></Route>
      </Routes>
    </>
  )
}

export default App
