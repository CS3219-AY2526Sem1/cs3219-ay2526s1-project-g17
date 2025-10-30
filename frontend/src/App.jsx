import './App.css'
import HomePage from './pages/HomePage/HomePage.jsx';
import { Routes, Route } from 'react-router-dom';
import CollabPage from './collaboration/index.jsx';
import MatchingPage from './matching-service/pages/matching_page.jsx'

function App()  {
    return (
        <>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/collaboration/:sessionId" element={<CollabPage />} />
                <Route path="/match" element={<MatchingPage />} />
            </Routes>
        </>
    );
}

export default App;
