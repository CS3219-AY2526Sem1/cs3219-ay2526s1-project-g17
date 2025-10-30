import { useAuth0 } from "@auth0/auth0-react";

export default function ProfilePage() {
  const { isAuthenticated } = useAuth0();

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
}