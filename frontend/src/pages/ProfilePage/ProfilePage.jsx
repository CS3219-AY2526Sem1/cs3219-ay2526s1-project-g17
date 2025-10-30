import { useAuth0 } from "@auth0/auth0-react";
import { NavigationBar } from "../../components/NavigationBar/NavigationBar";
import LoginButton from "../../components/Login/LoginButton";
import LoadingSpinner from "../../components/Loading/LoadingSpinner";

export default function ProfilePage() {
  const { isAuthenticated, isLoading, user } = useAuth0();

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

            <dl className="profile-hero__meta">
              <div>
                <dt>Member since</dt>
                <dd>
                  {user.updated_at
                    ? new Date(user.updated_at).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        
      </main>
    </div>
  );
}