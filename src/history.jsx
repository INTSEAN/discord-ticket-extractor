import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/ui.css';
import HistoryPage from './pages/HistoryPage';

// Add font links to the document head
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

// Create root element
const rootElement = document.getElementById('root') || document.createElement('div');
if (!rootElement.id) {
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

// Render app
createRoot(rootElement).render(
  <StrictMode>
    <div className="app">
      <header>
        Discord Conversations History
      </header>
      <div className="content">
        <HistoryPage />
      </div>
    </div>
  </StrictMode>,
); 