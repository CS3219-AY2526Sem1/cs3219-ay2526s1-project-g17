import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import "./index.css";
import App from "./app";
import MatchingPage from "./matching-service/pages/matching_page";
import { TestPage } from "./test_page";

const root = document.getElementById("root");

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/match", element: <MatchingPage /> },
  { path: "/test/:testId", element: <TestPage /> },
]);

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    {/* <BrowserRouter>
      <App />
    </BrowserRouter> */}
  </React.StrictMode>
);
