import axios from 'axios';
import { useAuth0 } from "@auth0/auth0-react";
import LogoutButton from "../../components/LogoutButton";
import Profile from "../../components/Profile";
import LoginButton from "../../components/LoginButton";
import Header from "../../components/Header";
import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import "./HomePage.css"
import { NavigationBar } from '../../components/NavigationBar';

export default function HomePage() {
  const { isLoading, isAuthenticated, user,
    getAccessTokenSilently, getAccessTokenWithPopup, loginWithPopup } = useAuth0();

  const [questions, setQuestions] = useState([{}]);

  const navigate = useNavigate();

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


  // if (isLoading) {
  //   return <p>Loading...</p>
  // }

  // else {
  //   if (isAuthenticated) {
  //     return (
  //       <div className='homepage-container'>
  //         {/* <Header /> */}
  //         <NavigationBar />

  //         <div className='homepage-content-container'>
  //           <h1>Welcome to peerprep {user.nickname}</h1>
  //           <button onClick={getAllQuestions}>log questions</button>
  //           <button onClick={tryCreateQuestion}>log try create question</button>
  //           <button onClick={tryDeleteQuestion}>log try delete question</button>
  //           <button onClick={() => navigate("/match")}>Start a session</button>
  //         </div>
  //       </div>
  //     )
  //   } else {
  //     return (
  //       <div className='homepage-container'>
  //         <Header />
  //         <div className='homepage-content-container'>
  //           <h1>Please log in in the top right hand corner</h1>
  //         </div>
  //       </div>
  //     )
  //   }

  // }

  if (isLoading) {
    return <p>Loading...</p>;
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
                Pair up instantly, code collaboratively, and level up together.
              </p>

              <div className="hero__actions">
                <button className="btn" onClick={getAllQuestions}>Get questions</button>
                <button className="btn btn--ghost" onClick={tryCreateQuestion}>Create question</button>
                <button className="btn btn--ghost" onClick={tryDeleteQuestion}>Delete question</button>
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
          <Header /> {/* if your Header is fixed, the with-nav-offset handles spacing */}

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