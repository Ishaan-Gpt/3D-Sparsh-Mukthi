import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { useLessonStore } from "./store/useLessonStore";

// Dev-only: expose the store so the scene can be driven from the console.
if (import.meta.env.DEV) {
  window.lessonStore = useLessonStore;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
