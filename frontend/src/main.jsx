import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initializeTheme } from "./theme.js";
import "./styles/base.css";
import "./styles/account.css";
import "./styles/hotel.css";
import "./styles/auth.css";
import "./styles/booking.css";
import "./styles/themes.css";
import "./styles/admin.css";
import "./styles/admin-hotel.css";
import "./styles/backgrounds.css";

initializeTheme();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
