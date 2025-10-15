import axios from 'axios';
import { useAuth0 } from "@auth0/auth0-react";
import LogoutButton from "../components/LogoutButton";
import Profile from "../components/Profile";
import LoginButton from "../components/LoginButton";
import Header from "../components/Header";
import { useState } from "react";

export default function HomePage() {
  const { isLoading, isAuthenticated,
    getAccessTokenSilently, getAccessTokenWithPopup, loginWithPopup } = useAuth0();

  const [questions, setQuestions] = useState([{}]);

  const [state, setState] = useState({
    showResult: false,
    apiMessage: "",
    error: null,
  });

  let response;

  const getAllQuestions = async () => {
    try {
      const token = await getAccessTokenSilently();

      response = await axios.get("http://localhost:5001/api/questions", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setState({
        ...state,
        showResult: true,
        apiMessage: response
      })
    } catch (error) {
      // if (["consent_required"].includes(error.error)) {
      //   console.log("Consent required error");
      //   await loginWithPopup({authorizationParams: {
      //     audience: 'peerprep-api',
      //     scope: 'admin:all'
      //   }})
      // }
      setState({
        ...state,
        error: error.error
      })
      console.log("Error in getting all questions from your api: ", error);
    }
    console.log("Questions from response: ", response.data)
    setQuestions(response.data);
    console.log("Questions in state: ", questions);
  }

  const tryCreateQuestion = async () => {
    try {

      //Get the token from the user service
      //This will fail if you are not logged in
      const token = await getAccessTokenSilently();

      //The created qn
      //If successful, will return 201 with text "created"
      const createQnResponse = await axios.post("http://localhost:5001/api/questions", {
        title: "Random test question",
        question: "Does this request work?",
        difficulty: "Advanced",
        topics: ["Testtopic"],
        link: "Google.com"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log(createQnResponse)
    } catch (error) {
      console.log(error)
    }
  }

  //Need to manually change the id of the question to delete every time you re run this.
  const tryDeleteQuestion = async () => {
    try {

      const token = await getAccessTokenSilently();

      const deleteQnResponse = await axios.delete("http://localhost:5001/api/questions/68ef8067b405fc05d1791f91", {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log(deleteQnResponse);
    } catch (error) {
      if (error === "consent_required") {
        handleConsent();
      } else if (error === "login_required") {
        handleLoginAgain();
      }
    }
  }

  const handleConsent = async () => {
    try {
      await getAccessTokenWithPopup();
      setState({
        ...state,
        error: null
      })
    } catch (error) {
      setState({
        ...state,
        error: error.error
      })
    }
  }

  const handleLoginAgain = async () => {
    try {
      await loginWithPopup()
      setState({
        ...state,
        error: null,
      })
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      })
    }
  }


  if (isLoading) {
    return <p>Loading...</p>
  }

  else {
    if (isAuthenticated) {
      return (
        <div>
          <Header />
          <p>Welcome to peerprep</p>
          <button onClick={getAllQuestions}>log questions</button>
          <button onClick={tryCreateQuestion}>log try create question</button>
          <button onClick={tryDeleteQuestion}>log try delete question</button>
        </div>
      )
    } else {
      return (

        <div>
          <Header />
          <p>Please log in, in the top right hand corner of the screen.</p>
        </div>
      )
    }

  }
}