import { useState, useEffect, useMemo, useRef } from 'react';
import Button from '../ui/Button';
import ConversationItem from '../components/ConversationItem';
import ConversationBundle from '../components/ConversationBundle';
import '../styles/ui.css';

/**
 * HistoryPage component for showing the conversation history
 * Includes search, filtering, statistics, and bundled conversations
 * 
 * @returns {JSX.Element}
 */
export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
  const [viewMode, setViewMode] = useState('bundled'); // 'bundled', 'individual'
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const copyTimeoutRef = useRef(null);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    totalUsers: 0,
    activeServer: '',
    mostActiveTime: ''
  });

  useEffect(() => {
    // Load history on component mount
    loadHistory();
  }, []);

  useEffect(() => {
    // Clear copy success message after 3 seconds
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Load history from Chrome storage
  const loadHistory = async () => {
    setLoading(true);
    try {
      chrome.storage.local.get(['history'], (result) => {
        const historyData = result.history || [];
        setHistory(historyData);
        setLoading(false);
        
        // Calculate metrics
        if (historyData.length > 0) {
          calculateMetrics(historyData);
        }
      });
    } catch (error) {
      console.error('Error loading history:', error);
      setLoading(false);
    }
  };

  // Calculate metrics for dashboard
  const calculateMetrics = (historyData) => {
    // Get unique users
    const uniqueUsers = new Set(historyData.map(item => item.username));
    
    // Get most active server
    const serverCounts = {};
    historyData.forEach(item => {
      const server = item.server_name || 'Unknown';
      serverCounts[server] = (serverCounts[server] || 0) + 1;
    });
    const activeServer = Object.keys(serverCounts).reduce((a, b) => 
      serverCounts[a] > serverCounts[b] ? a : b, '');
    
    // Most active time (simple approach)
    const hourCounts = {};
    historyData.forEach(item => {
      try {
        const time = new Date(item.timestamp);
        const hour = time.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      } catch (e) {
        // Skip invalid timestamps
      }
    });
    const mostActiveHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b, '0');
    
    const mostActiveTime = `${mostActiveHour}:00 - ${parseInt(mostActiveHour) + 1}:00`;
    
    setMetrics({
      totalConversations: historyData.length,
      totalUsers: uniqueUsers.size,
      activeServer,
      mostActiveTime
    });
  };

  // Clear all history and current conversations
  const clearHistory = () => {
    if (window.confirm('Are you sure you want to delete all saved conversations? This will clear both history and current conversations.')) {
      // Send message to background script to clear all data
      chrome.runtime.sendMessage({ action: 'clearAll' });
      
      // Update local state
      setHistory([]);
      setMetrics({
        totalConversations: 0,
        totalUsers: 0,
        activeServer: '',
        mostActiveTime: ''
      });
    }
  };
  /* --------- per‑ticket deleter ---------- */
  const ticketKeyOf = (row) => row.extraction_time || row.timestamp;   // same rule as background.js

  function clearTicket(key) {
    if (!window.confirm('Delete this ticket only?')) return;

    chrome.runtime.sendMessage({ action: 'clearTicket', ticketKey: key }, (resp) => {
      if (resp?.ok) {
        // optimistic UI update
        setHistory((prev) => prev.filter((r) => ticketKeyOf(r) !== key));
        
        calculateMetrics(history.filter((r) => ticketKeyOf(r) !== key));
      }
    });
  }

  // Copy filtered conversations to clipboard
  const copyFilteredConversations = () => {
    const filteredData = getFilteredHistory();
    if (filteredData.length === 0) {
      setCopySuccess('No conversations to copy');
      return;
    }

    // Format conversations for clipboard
    let formattedText = '';
    
    if (viewMode === 'bundled') {
      // Format by groups
      groupedConversations.forEach((group, index) => {
        formattedText += `--- Conversations from ${group.server_name} (${new Date(group.extractedAt).toLocaleString()}) ---\n\n`;
        
        group.conversations.forEach((conv, i) => {
          formattedText += `${conv.username} (${new Date(conv.timestamp).toLocaleString()}):\n`;
          formattedText += `${conv.content}\n\n`;
        });
        
        formattedText += '-'.repeat(50) + '\n\n';
      });
    } else {
      // Format individual conversations
      filteredData.forEach((conv, index) => {
        formattedText += `${conv.username} (${new Date(conv.timestamp).toLocaleString()}):\n`;
        formattedText += `${conv.content}\n\n`;
      });
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(formattedText)
      .then(() => {
        setCopySuccess('Copied!');
        
        // Clear message after 3 seconds
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
          setCopySuccess('');
        }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Copy failed');
      });
  };

  // Toggle date range filter visibility
  const toggleDateRange = () => {
    setShowDateRange(!showDateRange);
    if (!showDateRange) {
      setTimeFilter('custom');
    } else {
      setTimeFilter('all');
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter history by search term and time filter
  const getFilteredHistory = () => {
    return history.filter(item => {
      // Search term filter
      const matchesSearch = 
        !searchTerm || 
        item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.server_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Time filter
      let matchesTime = true;
      
      if (timeFilter === 'custom' && (startDate || endDate)) {
        const itemDate = new Date(item.timestamp);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) {
            matchesTime = false;
          }
        }
        
        if (endDate && matchesTime) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) {
            matchesTime = false;
          }
        }
      } else if (timeFilter !== 'all') {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        
        switch(timeFilter) {
          case 'today':
            matchesTime = itemDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            matchesTime = itemDate >= oneWeekAgo;
            break;
          case 'month':
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            matchesTime = itemDate >= oneMonthAgo;
            break;
          default:
            matchesTime = true;
        }
      }
      
      return matchesSearch && matchesTime;
    });
  };

  // Group conversations by extraction time or server
  const groupedConversations = useMemo(() => {
    const filteredHistory = getFilteredHistory();
    
    // Generate groups based on extraction time
    const groups = {};
    
    filteredHistory.forEach(item => {
      // Use extraction_time as the primary grouping key, fallback to timestamp
      const extractionTime = item.extraction_time || item.timestamp || new Date().toISOString();
      const server = item.server_name || 'Unknown Server';
      
      // Create a groupKey based on extraction time
      const groupKey = extractionTime;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          server_name: server,
          extractedAt: extractionTime,
          conversations: []
        };
      }
      
      groups[groupKey].conversations.push(item);
    });
    
    // Convert to array and sort by extraction time (newest first)
    return Object.values(groups).sort((a, b) => 
      new Date(b.extractedAt) - new Date(a.extractedAt)
    );
  }, [history, searchTerm, timeFilter, startDate, endDate]);

  // Toggle view mode between bundled and individual
  const toggleViewMode = () => {
    setViewMode(viewMode === 'bundled' ? 'individual' : 'bundled');
  };

  
  const filteredHistory = getFilteredHistory();

  return (
    <div className="history-page">
      <div className="history-header">
        <h2 className="history-title luxury-heading">Conversation History</h2>
      </div>
      
      {/* Dashboard metrics */}
      <div className="dashboard-metrics">
        <div className="metric-card">
          <div className="metric-title">Total Messages</div>
          <div className="metric-value">{metrics.totalConversations}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Total Users</div>
          <div className="metric-value">{metrics.totalUsers}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Most Active Server</div>
          <div className="metric-value">{metrics.activeServer || 'N/A'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Peak Activity Time</div>
          <div className="metric-value">{metrics.mostActiveTime || 'N/A'} h</div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="dashboard-controls">
        <input
          type="text"
          className="search-bar"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {!showDateRange && (
          <>
            <Button 
              variant="secondary" 
              onClick={() => setTimeFilter('all')}
              className={timeFilter === 'all' ? 'active' : ''}
            >
              All Time
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setTimeFilter('today')}
              className={timeFilter === 'today' ? 'active' : ''}
            >
              Today
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setTimeFilter('week')}
              className={timeFilter === 'week' ? 'active' : ''}
            >
              This Week
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setTimeFilter('month')}
              className={timeFilter === 'month' ? 'active' : ''}
            >
              This Month
            </Button>
          </>
        )}
        
        <Button 
          variant="secondary" 
          onClick={toggleDateRange}
          className={showDateRange ? 'active' : ''}
        >
          {showDateRange ? 'Simple Filters' : 'Date Range'}
        </Button>
        
        {showDateRange && (
          <div className="date-range-controls">
            <div className="date-input-container">
              <label htmlFor="start-date">From:</label>
              <input 
                type="date"
                id="start-date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="date-input-container">
              <label htmlFor="end-date">To:</label>
              <input 
                type="date"
                id="end-date"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
        
        <Button 
          variant="secondary" 
          onClick={toggleViewMode}
          className="view-mode-button"
        >
          {viewMode === 'bundled' ? 'Individual View' : 'Bundled View'}
        </Button>
        
        <div style={{ flexGrow: 1 }}></div>
        
        <div className="copy-container">
          <Button 
            variant="primary" 
            onClick={copyFilteredConversations}
            title="Copy filtered conversations"
          >
            Copy Results
          </Button>
          {copySuccess && <span className="copy-message">{copySuccess}</span>}
        </div>
        
        <Button onClick={loadHistory} title="Refresh">
          Refresh
        </Button>
        <Button variant="secondary" onClick={clearHistory}>
          Clear All
        </Button>
      </div>
      
      {/* History list */}
      {loading ? (
        <div className="loading-indicator">Loading history...</div>
      ) : filteredHistory.length > 0 ? (
        viewMode === 'bundled' ? (
          // Bundled view
          <div className="history-bundles">
            {groupedConversations.map((group, groupIndex) => (
              <ConversationBundle
                key={groupIndex}
                conversations={group.conversations}
                serverName={group.server_name}
                timestamp={group.extractedAt}
                onClear={() => clearTicket(group.extractedAt)}
              />
            ))}
          </div>
        ) : (
          // Individual view (original implementation)
          <div className="history-grid">
            {filteredHistory.map((item, index) => (
              <ConversationItem
                key={index}
                username={item.username}
                timestamp={item.timestamp}
                content={item.content}
              />
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <h3 className="luxury-heading">No History Found</h3>
          <p>{searchTerm ? 'No results match your search.' : 'Your conversation history is empty.'}</p>
        </div>
      )}
    </div>
  );
} 