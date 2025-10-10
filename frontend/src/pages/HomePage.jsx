import axios from 'axios';
import { useAuth0 } from "@auth0/auth0-react";
import LogoutButton from "../components/LogoutButton";
import Profile from "../components/Profile";
import LoginButton from "../components/LoginButton";
import Header from "../components/Header";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { isLoading } = useAuth0();

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const getQuestions = async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/questions")
        setQuestions(response.data);
      } catch (error) {
        console.error("Error fetching questions: ", error);
      }
    }

    getQuestions()
  }, [])

  console.log(questions);

  if (isLoading) {
    return <p>Loading...</p>
  } else {
    return (
      <div>
        <Header />
        <p>Welcome to peerprep</p>
      </div>
    )
  }
}