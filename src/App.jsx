import { useEffect } from 'react'
import SidePanel from './components/SidePanel'
import './styles/ui.css'

function App() {
  // Add font links to the document head
  useEffect(() => {
    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap'
    document.head.appendChild(fontLink)
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(fontLink)
    }
  }, [])

  return (
    <div className="app">
      <header>
        Discord Conversations
      </header>
      <div className="content">
        <SidePanel />
      </div>
    </div>
  )
}

export default App
