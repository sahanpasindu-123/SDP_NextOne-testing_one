import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './styles/globals.css'

// Global toast provider (used across admin pages for API feedback)
import { Toaster } from "react-hot-toast";

import { CategoriesProvider } from "./context/CategoriesContext.jsx";

function normalizeLanguage(v) {
  return String(v || "").trim() === "Sinhala" ? "Sinhala" : "English";
}

function applySystemPreferencesFromStorage() {
  try {
    const raw = localStorage.getItem("systemPreferences");
    const prefs = raw ? JSON.parse(raw) : {};

    const darkMode = !!prefs?.darkMode;
    const language = normalizeLanguage(prefs?.language);

    const root = document.documentElement;
    root.dataset.theme = darkMode ? "dark" : "light";
    root.style.colorScheme = darkMode ? "dark" : "light";
    root.lang = language === "Sinhala" ? "si" : "en";
  } catch {
    // ignore invalid localStorage; keep defaults
  }
}

applySystemPreferencesFromStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <App />
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
