import React from 'react'
import ReactDOM from 'react-dom/client'
import { setupTelemetry } from './telemetry'
import App from './App'
import './index.css'

setupTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
