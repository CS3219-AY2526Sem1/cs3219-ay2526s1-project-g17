import { useAuth0 } from "@auth0/auth0-react";
import LogoutButton from "../components/LogoutButton";
import Profile from "../components/Profile";
import LoginButton from "../components/LoginButton";
import Header from "../components/Header";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <p>Loading...</p>
  } else {
    return (
      <Header />
    )
  }
}