import { useAuth0 } from "@auth0/auth0-react";
import LogoutButton from "../../components/Login/LogoutButton";
import Profile from "../../components/Profile";
import LoginButton from "../../components/Login/LoginButton";
import Header from "../../components/Header/Header"
import "./HomePage.css"
import { NavigationBar } from '../../components/NavigationBar/NavigationBar';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import { useNavigate } from "react-router";

export default function HomePage() {
  const { isLoading, isAuthenticated, user} = useAuth0();

  const navigate = useNavigate();


  if (isLoading) {
    return <LoadingSpinner text='Preparing your session...' />
  } else {
    if (isAuthenticated) {
      return (
        <div className="homepage with-nav-offset">
          {/* If your NavigationBar is fixed at top, this wrapper adds top padding */}
          <NavigationBar />

          <main className="hero">
            <section className="hero__content">
              <h1 className="hero__title">
                Welcome to <span className="brand">PeerPrep</span>, {user.nickname}
              </h1>
              <p className="hero__subtitle">
                Problems are best solved together.
                Pair up instantly, code collaboratively, and level up together.
              </p>

              <div className="hero__actions">
                <button className="btn btn--primary" onClick={() => navigate("/match")}>
                  Join a session
                </button>
              </div>
            </section>

            <aside className="hero__art">
              {/* Use your own asset path */}
              <img src="/images/hero-collab.png" alt="Collaborative coding" />
            </aside>
          </main>
        </div>
      );
    } else {
      return (
        <div className="homepage with-nav-offset">
          <NavigationBar />

          <main className="hero">
            <section className="hero__content">
              <h1 className="hero__title">
                Pair programming made <span className="brand">simple</span>
              </h1>
              <p className="hero__subtitle">
                Practice interview questions together. Real-time editor, chat, and matching.
              </p>

              <div className="hero__actions">
                {/* Gentle nudge to log in */}
                <LoginButton className="btn btn--primary" />
                <a href="#learn-more" className="btn btn--ghost">Learn more</a>
              </div>
            </section>

            <aside className="hero__art">
              <img src="/images/hero-collab.png" alt="Pair programming illustration" />
            </aside>
          </main>
        </div>
      );
    }
  }

}