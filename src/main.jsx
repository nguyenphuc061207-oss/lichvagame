import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./styles/ultra-scene.css";
import App from "./App.jsx";

// Opening the app always lands on the home page, whatever section a bookmark
// or an earlier visit left in the address. Done before React mounts so the
// first render already reads #home; later hash changes still navigate.
if (location.hash !== "#home") history.replaceState(null, "", "#home");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
