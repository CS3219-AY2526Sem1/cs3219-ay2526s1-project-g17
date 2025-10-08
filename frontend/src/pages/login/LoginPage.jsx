import { use, useState } from "react";
import axios from 'axios'
import Header from "../../components/Header";
import { useNavigate, Link } from "react-router";


export function LoginPage({ setLogoutUser }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post("http://localhost:3001/auth/login", {
        email,
        password,
      })

      console.log("response", response);
      localStorage.setItem("login", JSON.stringify({
        userLogin: true,
        token: response.data.access_token
      }))

      setError("");
      setEmail("");
      setPassword("");
      setLogoutUser(false);
      navigate("/");
      console.log("Login successful");
    } catch (error) {
      if (error.response !== undefined) {
        setError(error.response.data.message)
      }
      console.log(error);
    }
  }

  return (
    <div style={styles.container}>
      <Header />
      <h2 style={styles.heading}>Login Page</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={login} style={styles.form}>
        <label style={styles.label}>
          Email:
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </label>
        <br />
        <label style={styles.label}>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </label>
        <br />
        <button style={styles.button} type="submit">
          Login
        </button>
      </form>
      <p>
        Don't have an account? <Link to="/register" style={styles.link}>Register</Link>.
      </p>
    </div>
  );
}

const styles = {
  container: {
    marginTop: "100px",
    textAlign: "center",
  },
  heading: {
    fontSize: "24px",
    color: "#333",
  },
  error: {
    color: "red",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  label: {
    marginBottom: "10px",
    textAlign: "left",
  },
  input: {
    width: "200px",
    padding: "5px",
  },
  button: {
    width: "100px",
    padding: "10px",
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  link: {
    textDecoration: "none",
    color: "#007BFF",
  },
};