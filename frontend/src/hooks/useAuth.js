import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

export default function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const raw = localStorage.getItem('login');

      if (!raw) {
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        console.error("invalid login data in localStorage, clearing now: ", error);
        localStorage.removeItem('login');
        setIsLoggedIn(false);
        setUser(null);
        navigate("/");
        return;
      }

      try {
        const res = await axios.get("http://localhost:3001/auth/verify-token", {
          headers: {
            Authorization: `Bearer ${parsed.token}`
          }
        })

        if (res.status === 200) {
          setIsLoggedIn(true)
          setUser({...parsed, data: res.data})

        }
      } catch (error) {
        console.error("Token verification failed, clearing login item", error);
        localStorage.removeItem('login');
        setIsLoggedIn(false)
        setUser(null)
        navigate("/");
      }
    }

    checkAuth();

  }, [navigate])

  return {isLoggedIn, user, setIsLoggedIn};
}