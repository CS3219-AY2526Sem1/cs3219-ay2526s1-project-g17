import './App.css'
import Profile from './components/Profile';
import LoginButton from './components/LoginButton';
import LogoutButton from './components/LogoutButton';
import HomePage from './pages/HomePage/HomePage.jsx';
import { Routes, Route } from 'react-router-dom';
import CollabPage from './collaboration/index.jsx';
import MatchingPage from './matching-service/pages/matching_page.jsx'
import { NavigationBar } from './components/NavigationBar.jsx';

function App()  {
    return (
        <>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/collaboration/:sessionId" element={<CollabPage />} />
                <Route path="/match" element={<MatchingPage />} />
                <Route path="/test" element={<NavigationBar />} />
            </Routes>
        </>
    );
}

export default App;
