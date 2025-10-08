import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";

export function HomePage({ isLoggedIn, setIsLoggedIn }) {

  const [username, setUsername] = useState(null);


  useEffect(() => {
    const loginItem = localStorage.getItem("login");
    if (loginItem) {
      try {
        const parsed = JSON.parse(loginItem);
        if (parsed?.userLogin) {
          setUsername(parsed.username);
        }
      } catch (error) {
        console.error("Error parsing login data", error)
      }
    } else {
      setUsername(null)
    }
  }, [isLoggedIn])


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



