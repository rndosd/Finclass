// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from './contexts/UserContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { StockProvider } from './contexts/StockContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>            {/* ← 여기 한 번만 */}
      <UserProvider>
        <FeedbackProvider>
          <StockProvider>
            <App />
          </StockProvider>
        </FeedbackProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
