import './App.css'
import Profile from './components/Profile';
import LoginButton from './components/LoginButton';
import LogoutButton from './components/LogoutButton';
import HomePage from './pages/HomePage';
import { Route, Routes } from 'react-router';


function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />}></Route>
      </Routes>
    </>
  )

}

export default App
