import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmDialogProvider } from './context/ConfirmDialogContext';
import App from './App.jsx';
import './design-system.css';
import './transitions.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {' '}
    <BrowserRouter>
      {' '}
      <ThemeProvider>
        {' '}
        <AuthProvider>
          {' '}
          <ConfirmDialogProvider>
            <App />
          </ConfirmDialogProvider>{' '}
        </AuthProvider>{' '}
      </ThemeProvider>{' '}
    </BrowserRouter>{' '}
  </React.StrictMode>
);
