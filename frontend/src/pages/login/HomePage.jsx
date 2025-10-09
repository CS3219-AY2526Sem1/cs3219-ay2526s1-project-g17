import Header from "../../components/Header";
import useAuth from "../../hooks/useAuth";

export function HomePage() {

  const {isLoggedIn, user, setIsLoggedIn} = useAuth();

  console.log("isLoggedIn: ", isLoggedIn);
  
  const username = user?.data?.data?.username ?? null;


  const userNotLogin = () => {
    return (
      <p>Please log in or register in the top right corner</p>
    )
  }

  const userLoggedIn = () => {
    return (
      <p>Welconme back user, {username}</p>
    )
  }

  return (
    <>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      {isLoggedIn ? userLoggedIn() : userNotLogin()}
    </>
  )
}



