import express from "express";
import cors from "cors";

import matchingRoute from "./routes/matching_route.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors()); // config cors so that front-end can use
// app.options("*", cors());

// To handle CORS Errors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // "*" -> Allow all links to access

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Browsers usually send this before PUT or POST Requests
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, PATCH");
    return res.status(200).json({});
  }

  // Continue Route Processing
  next();
});

app.use("/api/matching", matchingRoute);

app.get("/", (req, res, next) => {
  console.log("Sending Greetings!");
  res.json({
    message: "Hello World from matching service",
  });
});

// Handle When No Route Match Is Found
app.use((req, res, next) => {
  const error = new Error("Route Not Found");
  // @ts-ignore
  error.status = 404;
  next(error);
});

app.use(
  (
    /** @type {{ status: any; message: any; }} */ error,
    /** @type {any} */ req,
    /** @type {{ status: (arg0: any) => void; json: (arg0: { error: { message: any; }; }) => void; }} */ res,
    /** @type {any} */ next
  ) => {
    res.status(error.status || 500);
    res.json({
      error: {
        message: error.message,
      },
    });
  }
);

app.use(errorHandler);

export default app;
