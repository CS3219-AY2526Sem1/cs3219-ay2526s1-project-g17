import { Routes, Route } from 'react-router'
import './App.css'
import Header from './components/Header'
import { LoginPage } from './pages/login/LoginPage'
import { HomePage } from './pages/login/HomePage'
import { useState } from 'react'
import { RegisterPage } from './pages/register/RegisterPage'


function App() {

  const [logoutUser, setLogoutUser] = useState(false);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage logoutUser={logoutUser}/>}></Route>
        <Route path="/login" element={<LoginPage setLogoutUser={setLogoutUser}/>}></Route>
        <Route path="/register" element={<RegisterPage />}></Route>
      </Routes>
    </>
  )
}

export default App
