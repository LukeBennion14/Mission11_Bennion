// entry point - this is where React actually mounts onto the HTML page
// StrictMode just makes React extra loud about potential issues during dev (double renders, etc.)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// importing bootstrap CSS and JS bundle so all the components (accordion, offcanvas, etc.) work
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
