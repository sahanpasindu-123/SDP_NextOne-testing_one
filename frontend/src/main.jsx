import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './styles/globals.css'

// Global toast provider (used across admin pages for API feedback)
import { Toaster } from "react-hot-toast";

import { CategoriesProvider } from "./context/CategoriesContext.jsx";


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
