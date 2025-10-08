import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const register = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post("http://localhost:3001/users", {
        username,
        email,
        password
      })
      console.log("response", response);
      
      // Now navigate to the login page
      navigate("/login");
    } catch (error) {
      if (error.response !== undefined) {
        setError(error.response.data.message);
      }
      console.error(error);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>User Registration</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={register} style={styles.form}>
        <label style={styles.label}>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />
        </label>
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
          Register
        </button>
      </form>
      <p>
        Already have an account?{" "}
        <button onClick={() => navigate("/login")} style={styles.link}>
          Login
        </button>
      </p>
    </div>
  );
};

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
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};