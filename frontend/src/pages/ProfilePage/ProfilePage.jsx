import { useAuth0 } from "@auth0/auth0-react";
import { NavigationBar } from "../../components/NavigationBar/NavigationBar";
import LoginButton from "../../components/Login/LoginButton";
import LoadingSpinner from "../../components/Loading/LoadingSpinner";
import { useCallback, useEffect, useMemo, useState } from "react";
import './ProfilePage.css'
import axios from "axios";
import HistoryPanel from "./components/HistoryPanel.jsx";

const PAGE_SIZE = 5;
const HISTORY_SERVICE_BASE =
  import.meta.env.VITE_HISTORY_SERVICE_BASE || "http://localhost:3004/history";

export default function ProfilePage() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, loginWithPopup } = useAuth0();
  const [attempts, setAttempts] = useState([]);
  const [page, setPage] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [authToken, setAuthToken] = useState(null);


  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  const handlePrev = () => setPage((prev) => Math.max(prev - 1, 0));
  const handleNext = () => {
    if (hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  const fetchAttempts = useCallback(async () => {
    if (!isAuthenticated || !user?.sub) {
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: "peerprep-api" },
      });

      const response = await axios.get(
        `${HISTORY_SERVICE_BASE}/${encodeURIComponent(user.sub)}`,
        {
          params: { limit: PAGE_SIZE, skip: offset },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAuthToken(token);
      setAttempts(response.data?.attempts ?? []);
      setHasNextPage((response.data?.attempts ?? []).length === PAGE_SIZE);
    } catch (err) {
      if (err?.response?.status === 404) {
        setAttempts([]);
        setHasNextPage(false);
      } else if (err?.error === "login_required") {
        await loginWithPopup();
      } else {
        setError(err);
      }
    } finally {
      setIsFetching(false);
    }
  }, [
    getAccessTokenSilently,
    loginWithPopup,
    isAuthenticated,
    offset,
    user?.sub,
  ]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);


  if (isLoading) {
    return <LoadingSpinner text="Fetching your profile..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="profile-page with-nav-offset">
        <NavigationBar />
        <main className="profile-page__content">
          <section className="profile-card profile-card--centered">
            <h1 className="profile-card__title">Sign in to view your history</h1>
            <p className="profile-card__subtitle">
              Once you log in, we will display the questions you have worked on and
              your recent submissions.
            </p>
            <LoginButton className="btn btn--primary">Log in</LoginButton>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-page with-nav-offset">
      <NavigationBar />

      <main className="profile-page__content">
        <section className="profile-hero">
          <div className="profile-hero__avatar">
            <img src={user.picture} alt={user.name} />
          </div>

          <div className="profile-hero__details">
            <p className="profile-hero__eyebrow">PeerPrep profile</p>
            <h1>{user.name || user.nickname}</h1>
            <p className="profile-hero__subtitle">
              Track your coding journey, revisit past challenges, and keep honing your
              skills. We show five attempts at a time so you can focus on your most
              recent work.
            </p>

            
          </div>
        </section>
        
        <HistoryPanel
          attempts={attempts}
          page={page}
          isFetching={isFetching}
          hasNextPage={hasNextPage}
          error={error}
          onPrev={handlePrev}
          onNext={handleNext}
          authToken={authToken}
        />

      </main>
    </div>
  );
}
