import { useState } from 'react';
import ConversationItem from './ConversationItem';
import Button from '../ui/Button';
import Toggle from '../ui/Toggle';
import '../styles/ui.css';

/**
 * Component for displaying a list of conversations
 * 
 * @param {Object} props
 * @param {Array} props.conversations - Array of conversation objects
 * @param {function} props.onRefresh - Function to refresh conversations
 * @param {boolean} props.autoRefresh - Whether auto-refresh is enabled
 * @param {function} props.onToggleAutoRefresh - Function to toggle auto-refresh
 * @param {function} props.onViewHistory - Function to view conversation history
 * @returns {JSX.Element}
 */
export default function ConversationList({
  conversations = [],
  onRefresh,
  autoRefresh = false,
  onToggleAutoRefresh,
  onViewHistory
}) {
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);

  const serverName = conversations[0]?.serverName || 'Discord Conversation';
  const channelName = conversations[0]?.channelName || '';
  
  // Function to copy all conversations to clipboard
  const copyAllToClipboard = () => {
    const formattedText = formatConversationsForClipboard(conversations);
    handleCopy(formattedText);
  };
  
  // Function to copy conversations with prompt format to clipboard
  const copyWithPromptToClipboard = (promptType = 'summarize') => {
    const formattedText = formatConversationsForClipboard(conversations, promptType);
    handleCopy(formattedText);
  };
  
  // Function to clear all conversations
  const clearAllConversations = () => {
    if (window.confirm('Are you sure you want to clear all conversations?')) {
      chrome.runtime.sendMessage({ action: 'clearAll' });
    }
  };
  
  // Helper function to format conversations for clipboard
  const formatConversationsForClipboard = (conversations, promptType = null) => {
    if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
      return '';
    }

    let result = '';
    if (promptType === 'summarize') {
      result += 'You are an assistant helping server admins, support moderators, ' +
      'community managers, and HR personnel quickly summarize ticket conversations ' +
      'for documentation, reporting, or follow-up.\n\n' +
      'Below is a formatted transcript of a ticket interaction. Your task is to generate ' +
      'a concise and professional summary of the interaction, including the purpose of the ticket, ' +
      'any relevant actions or replies, and whether any follow-up is required:\n\n';
    } else if (promptType === 'follow-up') {
      result += 'You are an assistant identifying any follow-up tasks from this ticket. ' +
      'List action items, responsibilities, and whether additional support is needed.\n\n';
    }
  
    const firstConv = conversations[0];
    if (firstConv?.serverName) result += `Server: ${firstConv.serverName}\n`;
    if (firstConv?.channelName) result += `Channel: ${firstConv.channelName}\n\n`;
  
    result += conversations.map(conv => 
      `${conv.username}: ${conv.content} sent at "${conv.timestamp}"`
    ).join('\n');
  
    return result;
  };
  
  // Helper function to handle copy operations
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyFeedback(true);
      setTimeout(() => {
        setShowCopyFeedback(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  
  if (!conversations || conversations.length === 0) {
    return null;
  }

  return (
    <div className="conversations-container">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="header-controls">
          <Button 
            variant="icon" 
            onClick={copyAllToClipboard}
            title="Copy All"
          >
            Copy All
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </Button>

          {/* Dropdown button for copy with prompt options */}
          <div style={{ position: 'relative' }}>
            <Button 
              variant="icon" 
              wide={true}
              onClick={() => setShowPromptDropdown(prev => !prev)}
              title="Copy with Prompt"
            >
              <span>Copy + Prompt ▾</span>
              <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </Button>

            {showPromptDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                zIndex: 10,
                minWidth: '180px'
              }}>
                <div 
                  className="dropdown-item"
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  onClick={() => {
                    copyWithPromptToClipboard('summarize');
                    setShowPromptDropdown(false);
                  }}
                >
                  Summarize
                </div>
                <div 
                  className="dropdown-item"
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  onClick={() => {
                    copyWithPromptToClipboard('follow-up');
                    setShowPromptDropdown(false);
                  }}
                >
                  Follow-Up
                </div>
              </div>
            )}
          </div>

          <Button 
            variant="icon" 
            onClick={onRefresh}
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </Button>
          <Button 
            variant="icon" 
            onClick={onViewHistory}
            title="View History"
          >
            📜
          </Button>
          <Button 
            variant="icon" 
            onClick={clearAllConversations}
            title="Clear All"
            style={{ color: 'var(--discord-primary-dark)' }}
          >
            🗑️
          </Button>
        </div>
      </div>

      {/* Header panel */}
      <div className="panel-header">
        <div className="header-content">
          <div className="header-text">
            <h2 className="luxury-heading">{serverName}</h2>
            {channelName && <div className="channel-name">#{channelName}</div>}
            <div className="last-update">Updated at {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        
        <div className="settings-option">
          <Toggle 
            checked={autoRefresh}
            onChange={onToggleAutoRefresh}
            label="Auto-refresh (5 secs)"
          />
        </div>
        
        <div className={`copy-feedback ${showCopyFeedback ? 'show' : ''}`} style={{display: showCopyFeedback ? 'block' : 'none'}}>
          Copied to clipboard!
        </div>
      </div>

      {/* Conversation items */}
      <div className="conversation-items">
        {conversations.map((conversation, index) => (
          <ConversationItem
            key={index}
            username={conversation.username}
            timestamp={conversation.timestamp}
            content={conversation.content}
          />
        ))}
      </div>
    </div>
  );
}