import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  
  useEffect(() => {
    // Get the current tab URL (Chrome Extension API)
    if (chrome?.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        setUrl(tabs[0].url)
      })
    }
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Chrome Extension</h1>
      </header>
      <main>
        <div className="card">
          <h2>Current Tab</h2>
          <p>{url || "URL not available"}</p>
        </div>
        <button onClick={() => {
          if (chrome?.tabs) {
            chrome.tabs.create({ url: "https://github.com" })
          }
        }}>
          Open GitHub
        </button>
      </main>
      <footer>
        <p>Made with React & Vite</p>
      </footer>
    </div>
  )
}

export default App
