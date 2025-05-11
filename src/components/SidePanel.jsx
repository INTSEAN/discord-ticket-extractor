import { useState, useEffect, useCallback } from 'react';
import ConversationList from './ConversationList';
import EmptyState from '../ui/EmptyState';
import '../styles/ui.css';

/**
 * Main SidePanel component
 * Manages the loading and display of conversations
 * Handles auto-refresh and history navigation
 * 
 * @returns {JSX.Element}
 */
export default function SidePanel() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [isCleared, setIsCleared] = useState(false);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
    
    // Listen for messages from background script
    const handleMessages = (message) => {
      console.log('Side panel received message:', message);
      if (message.action === 'historyCleared' || message.action === 'historyClearedExternal') {
        setLastRefreshTime(0);  // Force UI refresh
        setIsCleared(true);
        loadConversations();
      } else if (message.action === 'conversationsUpdated') {
        // Only refresh if it's been at least 2 seconds since the last refresh
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        if (timeSinceLastRefresh > 2000) {
          loadConversations();
        } else {
          console.log(`Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago`);
        }
      } else if (message.action === 'allDataCleared') {
        // Clear local state when all data is cleared
        setConversations([]);
        setLastRefreshTime(0);
        setIsCleared(true);
      }
      return true;
    };
    
    chrome.runtime.onMessage.addListener(handleMessages);
    
    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessages);
    };
  }, [lastRefreshTime, isCleared]);
  
  // Handle auto-refresh
  useEffect(() => {
    let intervalId = null;
    
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        loadConversations();
      }, 5000); // 5 seconds
    }
    
    // Cleanup interval on unmount or when disabled
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefreshEnabled]);

  // Load conversations from storage
  const loadConversations = useCallback(() => {
    setLoading(true);
    
    try {
      chrome.runtime.sendMessage({ action: 'getStoredConversations' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading conversations:', chrome.runtime.lastError);
          setConversations([]);
          setLoading(false);
          return;
        }
        
        console.log('Received response from background:', response);
        
        // Update last refresh time
        setLastRefreshTime(Date.now());
        
        if (response && response.conversations) {
          setConversations(response.conversations);
          // Reset the cleared state once we've loaded new conversations
          if (isCleared) {
            setIsCleared(false);
          }
        } else {
          console.warn('No conversations in response:', response);
          setConversations([]);
        }
        
        setLoading(false);
      });
    } catch (err) {
      console.error('Error requesting conversations:', err);
      setConversations([]);
      setLoading(false);
    }
  }, [isCleared]);

  // Toggle auto-refresh
  const handleToggleAutoRefresh = () => {
    setAutoRefreshEnabled(prev => !prev);
  };

  // View history in a new tab
  const handleViewHistory = () => {
    // Open history in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  };

  // Show debug info
  const handleDebug = () => {
    chrome.storage.local.get(null, (data) => {
      setDebugInfo({
        storage: data,
        manifest: chrome.runtime.getManifest(),
        extensionId: chrome.runtime.id,
        lastRefresh: new Date(lastRefreshTime).toLocaleTimeString(),
        autoRefresh: autoRefreshEnabled ? 'Enabled' : 'Disabled'
      });
      setShowDebugPanel(true);
    });
  };

  // Hide debug panel
  const handleCloseDebug = () => {
    setShowDebugPanel(false);
  };

  // Clear all data
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This will remove both current conversations and history.')) {
      chrome.runtime.sendMessage({ action: 'clearAll' });
    }
  };

  // Render empty state if no conversations
  if (conversations.length === 0) {
    return (
      <EmptyState
        onRefresh={loadConversations}
        onHistory={handleViewHistory}
        autoRefresh={autoRefreshEnabled}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onDebug={handleDebug}
        onClearAll={handleClearAll}
      >
        {showDebugPanel && (
          <div className="debug-panel">
            <div className="debug-header">
              <h4>Debug Information</h4>
              <button className="close-button" onClick={handleCloseDebug}>×</button>
            </div>
            <div className="debug-content">
              <h5>Storage Contents:</h5>
              <pre>{JSON.stringify(debugInfo.storage, null, 2)}</pre>
              <h5>Extension Info:</h5>
              <p><strong>Manifest:</strong> {debugInfo.manifest?.manifest_version}</p>
              <p><strong>Extension ID:</strong> {debugInfo.extensionId}</p>
              <p><strong>Last Refresh:</strong> {debugInfo.lastRefresh}</p>
              <p><strong>Auto-Refresh:</strong> {debugInfo.autoRefresh}</p>
            </div>
          </div>
        )}
      </EmptyState>
    );
  }

  // Render conversations list
  return (
    <ConversationList 
      conversations={conversations}
      onRefresh={loadConversations}
      autoRefresh={autoRefreshEnabled}
      onToggleAutoRefresh={handleToggleAutoRefresh}
      onViewHistory={handleViewHistory}
    />
  );
} 