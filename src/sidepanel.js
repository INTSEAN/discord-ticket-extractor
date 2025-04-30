/**
 * Side panel script for Discord Conversation Extractor
 * Responsible for displaying and managing extracted conversations in the side panel UI
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Side panel loaded');
  const conversationsElement = document.getElementById('conversations');
  const refreshButton = document.getElementById('refresh-btn');
  
  // Add modern UI styles
  addCustomStyles();
  // Add luxury fonts
  addLuxuryFonts();
  
  // Track last update time to prevent excessive refreshes
  let lastRefreshTime = 0;
  let autoRefreshIntervalId = null;

  // function to clear history
  function wireClearButton() {
    const btn = document.getElementById('clear-history-btn');
    if (!btn) return;                     // header may be rebuilt later
    btn.addEventListener('click', () => {
      if (confirm('Delete every saved ticket?')) {
        chrome.runtime.sendMessage({ action: 'clearHistory' });
      }
    });
  }

  /**
   * Renders conversation data in the side panel UI
   * Creates conversation cards, adds copy functionality, and handles empty states
   * Processes various data formats to ensure correct display
   * 
   * @param {Array<Object>|Object} conversations - Array of conversation objects or wrapper object
   */
  function renderConversations(conversations) {
    console.log('Rendering conversations:', conversations);
    
    // Debug to check what's actually being passed
    if (conversations && typeof conversations === 'object') {
      console.log('Conversation data type:', Array.isArray(conversations) ? 'Array' : 'Object');
      console.log('Conversation keys:', Object.keys(conversations));
      
      // If conversations is not an array but has a conversations property, use that
      if (!Array.isArray(conversations) && conversations.conversations) {
        console.log('Using nested conversations property', conversations.conversations);
        conversations = conversations.conversations;
      }
    }
    
    // Clear existing content
    conversationsElement.innerHTML = '';
    
    if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
      console.log('No conversations to display');
      conversationsElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" fill="rgba(88, 101, 242, 0.3)"/>
            </svg>
          </div>
          <h3 class="luxury-heading">No Transcript Opened</h3>
          <p>Open your ticket tool transcript in your browser to extract messages!</p>
          <div class="button-group">
            <button id="refresh-btn" class="primary-button">Refresh</button>
            <button id="debug-btn" class="secondary-button">Debug Info</button>
          </div>
          <button id="history-btn" class="icon-button" title="View History">📜</button>

          <div class="settings-option">
            <label class="toggle-switch">
              <input type="checkbox" id="auto-refresh-toggle" ${autoRefreshIntervalId ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-label">Auto-refresh (5m)</span>
            </label>
          </div>
        </div>
      `;
      // load history when history icon is clicked
      const historyBtn = document.getElementById('history-btn');

      if (historyBtn) {
        historyBtn.addEventListener('click', loadHistory);
      }

      document.getElementById('refresh-btn').addEventListener('click', loadConversations);
      
      // Add auto-refresh toggle handler
      const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
      if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', function() {
          if (this.checked) {
            enableAutoRefresh();
          } else {
            disableAutoRefresh();
          }
        });
      }
      
      // Add debug button handler
      const debugBtn = document.getElementById('debug-btn');
      if (debugBtn) {
        debugBtn.addEventListener('click', function() {
          const debugInfo = document.createElement('div');
          debugInfo.className = 'debug-panel';
          
          // Collect debug information
          chrome.storage.local.get(null, (data) => {
            debugInfo.innerHTML = `
              <div class="debug-header">
                <h4>Debug Information</h4>
                <button class="close-button" id="close-debug">×</button>
              </div>
              <div class="debug-content">
                <h5>Storage Contents:</h5>
                <pre>${JSON.stringify(data, null, 2)}</pre>
                <h5>Extension Info:</h5>
                <p><strong>Manifest:</strong> ${chrome.runtime.getManifest().manifest_version}</p>
                <p><strong>Extension ID:</strong> ${chrome.runtime.id}</p>
                <p><strong>Last Refresh:</strong> ${new Date(lastRefreshTime).toLocaleTimeString()}</p>
                <p><strong>Auto-Refresh:</strong> ${autoRefreshIntervalId ? 'Enabled' : 'Disabled'}</p>
              </div>
            `;
            document.querySelector('.empty-state').appendChild(debugInfo);
            
            // Add close button handler
            document.getElementById('close-debug').addEventListener('click', function() {
              debugInfo.remove();
            });
          });
        });
      }
      
      return;
    }
    
    // Add toolbar div
    const toolbarDiv = document.createElement('div');
    toolbarDiv.className = 'toolbar';
    toolbarDiv.innerHTML = `
      <div class="header-controls">
        <button id="copy-all-btn" class="icon-button" title="Copy All"> Copy All
          <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        <button id="copy-with-prompt-btn" class="icon-button" title="Copy with Prompt"> Copy + Prompt
          <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
           <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        <button id="refresh-btn" class="icon-button" title="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>

        <button id="history-btn" class="icon-button" title="View History">📜</button>
      </div>
    `;
    conversationsElement.appendChild(toolbarDiv);

    // Add header with controls for the conversations
    const headerDiv = document.createElement('div');
    headerDiv.className = 'panel-header';
    
    // Get metadata from first conversation
    const serverName = conversations[0].serverName || 'Discord Conversation';
    const channelName = conversations[0].channelName || '';
    const timestamp = new Date(lastRefreshTime).toLocaleTimeString();
    
    headerDiv.innerHTML = `
      <div class="header-content">
        <div class="header-text">
          <h2 class="luxury-heading">${escapeHtml(serverName)}</h2>
          ${channelName ? `<div class="channel-name">#${escapeHtml(channelName)}</div>` : ''}
          <div class="last-update">Updated at ${timestamp}</div>
        </div>
        
      </div>
      <div class="settings-option">
        <label class="toggle-switch">
          <input type="checkbox" id="auto-refresh-toggle" ${autoRefreshIntervalId ? 'checked' : ''}>
          <span class="toggle-slider"></span>
          <span class="toggle-label">Auto-refresh (5m)</span>
        </label>
      </div>
      <div class="copy-feedback" id="copy-feedback">Copied to clipboard!</div>
    `;
    conversationsElement.appendChild(headerDiv);

    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) historyBtn.addEventListener('click', loadHistory);
    
    // Add auto-refresh toggle handler
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', function() {
        if (this.checked) {
          enableAutoRefresh();
        } else {
          disableAutoRefresh();
        }
      });
    }
    
    // Add conversation container
    const conversationList = document.createElement('div');
    conversationList.className = 'conversation-items';
    conversationsElement.appendChild(conversationList);
    
    // Add each conversation
    conversations.forEach(conversation => {
      const conversationItem = document.createElement('div');
      conversationItem.className = 'conversation-item';
      
      const formattedHtml = `
        <div class="message-header">
          <div class="username">${escapeHtml(conversation.username)}</div>
          <div class="timestamp">${escapeHtml(conversation.timestamp)}</div>
        </div>
        <div class="message-content">${escapeHtml(conversation.content)}</div>
      `;
      
      conversationItem.innerHTML = formattedHtml;
      conversationList.appendChild(conversationItem);
    });
    
    // Add copy functionality
    const copyAllBtn = document.getElementById('copy-all-btn');
    const copyWithPromptBtn = document.getElementById('copy-with-prompt-btn');
    const copyFeedback = document.getElementById('copy-feedback');
    
    function handleCopy(text) {
      copyToClipboard(text).then(success => {
        if (success && copyFeedback) {
          copyFeedback.style.display = 'block';
          copyFeedback.classList.add('show');
          setTimeout(() => {
            copyFeedback.classList.remove('show');
            setTimeout(() => {
              copyFeedback.style.display = 'none';
            }, 300);
          }, 2000);
        }
      });
    }
    
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => {
        const formattedText = formatConversationsForClipboard(conversations);
        handleCopy(formattedText);
      });
    }
    
    if (copyWithPromptBtn) {
      copyWithPromptBtn.addEventListener('click', () => {
        const formattedText = formatConversationsForClipboard(conversations);
        handleCopy(formattedText);
      });
    }
    
    // Add refresh functionality
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadConversations);
    }
  }

  /**
   * Renders empty history home page when there is no history to show.
   */
  function renderHistoryHomePage() {
    console.log('Rendering empty history home page');

    conversationsElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" fill="rgba(88, 101, 242, 0.3)"/>
          </svg>
        </div>
        <h3 class="luxury-heading">No History</h3>
        <p>Your transcript history is empty ~</p>
        <div class="button-group">
          <button id="back-btn" class="primary-button">Back</button>
        </div>
      </div>
    `;

    wireBackButton();
  }

  /**
   * Adds luxury fonts to the document
   */
  function addLuxuryFonts() {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
    
    const fontStyles = document.createElement('style');
    fontStyles.textContent = `
      body {
        font-family: 'Montserrat', sans-serif;
        font-weight: 300;
        letter-spacing: 0.02em;
      }
      
      .luxury-heading {
        font-family: 'Cormorant Garamond', serif;
        font-weight: 600;
        letter-spacing: 0.03em;
      }
      
      h2.luxury-heading {
        font-size: 22px;
        line-height: 1.2;
      }
      
      h3.luxury-heading {
        font-size: 28px;
        line-height: 1.1;
      }
      
      header {
        font-family: 'Cormorant Garamond', serif;
        font-weight: 600;
        letter-spacing: 0.05em;
        font-size: 20px;
      }
      
      button {
        font-family: 'Montserrat', sans-serif;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-size: 11px;
      }
      
      .username {
        font-family: 'Cormorant Garamond', serif;
        font-weight: 600;
        letter-spacing: 0.02em;
        font-size: 15px;
      }
      
      .message-content {
        font-family: 'Montserrat', sans-serif;
        font-weight: 300;
        letter-spacing: 0.01em;
        line-height: 1.6;
      }
      
      .toggle-label {
        font-family: 'Montserrat', sans-serif;
        font-weight: 300;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 10px;
      }
    `;
    document.head.appendChild(fontStyles);
  }
  
  /**
   * Adds custom styles to enhance the UI
   */
  function addCustomStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Modern UI styles */
      :root {
        --discord-primary: #5865F2;
        --discord-primary-dark: #4752c4;
        --discord-light: #f6f6f7;
        --discord-dark: #36393f;
        --discord-darker: #2f3136;
        --discord-light-text: #dcddde;
        --discord-muted: rgba(255, 255, 255, 0.4);
        --discord-border: rgba(255, 255, 255, 0.05);
        --discord-success: #43b581;
        
        /* Luxury palette */
        --luxury-gold: #c5a47e;
        --luxury-gold-light: #d6b992;
        --luxury-gold-dark: #a88d69;
        --luxury-background: #2d2d34;
        --luxury-background-dark: #23232a;
        --luxury-text: #e7e7e7;
      }
      
      body {
        margin: 0;
        padding: 0;
        background-color: var(--luxury-background);
        color: var(--luxury-text);
        width: 100%;
        height: 100vh;
        overflow-x: hidden;
        overflow-y: auto;
      }
      
      header {
        background: linear-gradient(to right, var(--luxury-gold-dark), var(--luxury-gold), var(--luxury-gold-dark));
        padding: 16px;
        text-align: center;
        font-size: 18px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        position: sticky;
        top: 0;
        z-index: 10;
        color: #23232a;
      }
      
      .content {
        padding: 16px;
        overflow-y: auto;
        height: calc(100vh - 53px);
      }
      
      .panel-header {
        background-color: var(--luxury-background-dark);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        position: relative;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        border-left: 2px solid var(--luxury-gold);
      }
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-direction: column;
        gap: 8px;
      }
      
      .header-text h2 {
        margin: 0 0 2px 0;
        font-size: 18px;
        color: var(--luxury-gold);
        font-weight: 600;
      }
      
      .channel-name {
        font-size: 14px;
        color: var(--discord-light-text);
        margin-bottom: 5px;
      }
      
      .last-update {
        font-size: 12px;
        color: var(--discord-muted);
        font-style: italic;
      }

      /* Toolbar button cards */
      .toolbar {
        display: flex;
        flex-direction: row;
        justify-content: center;   /* center icons horizontally */
        align-items: center;       /* center icons vertically */
        gap: 12px;                 /* space between buttons */
        width: 100%;               /* span the full panel width */
        padding: 8px 0;            /* optional vertical padding */
      }

      .toolbar .icon-button {
        width: 40px;
        height: 40px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        
        display: flex;
        align-items: center;
        justify-content: center;
        
        transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s;
      }

      /* Icon size inside the button */
      .toolbar .icon-button svg {
        width: 20px;
        height: 20px;
        fill: var(--luxury-gold);
      }

      /* Hover effect */
      .toolbar .icon-button:hover {
        background-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
      }

      /* Active/pressed effect */
      .toolbar .icon-button:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      }

      .settings-option {
        margin-top: 12px;
      }
      
      /* Toggle switch */
      .toggle-switch {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .toggle-slider {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 18px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        transition: .3s;
        margin-right: 8px;
      }
      
      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: .3s;
      }
      
      input:checked + .toggle-slider {
        background-color: var(--luxury-gold);
      }
      
      input:checked + .toggle-slider:before {
        transform: translateX(14px);
      }
      
      .toggle-label {
        font-size: 13px;
        color: var(--discord-muted);
      }
      
      /* Buttons */
      .primary-button {
        background: linear-gradient(to right, var(--luxury-gold-dark), var(--luxury-gold));
        color: #23232a;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 500;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .primary-button:hover {
        background: linear-gradient(to right, var(--luxury-gold), var(--luxury-gold-light));
        transform: translateY(-1px);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
      }
      
      .secondary-button {
        background-color: transparent;
        color: var(--luxury-gold);
        border: 1px solid var(--luxury-gold);
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 500;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .secondary-button:hover {
        background-color: rgba(197, 164, 126, 0.1);
        box-shadow: 0 0 8px rgba(197, 164, 126, 0.2);
      }
      
      .icon-button {
        background-color: transparent;
        color: var(--luxury-gold);
        border: none;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .icon-button:hover {
        background-color: rgba(197, 164, 126, 0.1);
        box-shadow: 0 0 8px rgba(197, 164, 126, 0.3);
      }
      
      .button-group {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      
      /* Conversation items */
      .conversation-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .conversation-item {
        background-color: var(--luxury-background-dark);
        border-radius: 8px;
        padding: 16px;
        animation: fadeIn 0.3s ease-in-out;
        border: 1px solid rgba(197, 164, 126, 0.1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .conversation-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        border-color: rgba(197, 164, 126, 0.2);
      }
      
      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        border-bottom: 1px solid rgba(197, 164, 126, 0.1);
        padding-bottom: 6px;
      }
      
      .username {
        color: var(--luxury-gold);
        font-weight: 600;
        font-size: 14px;
      }
      
      .timestamp {
        font-size: 12px;
        color: var(--discord-muted);
        font-style: italic;
      }
      
      .message-content {
        color: var(--luxury-text);
        font-size: 14px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
        padding-left: 6px;
      }
      
      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--discord-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
      }
      
      .empty-icon {
        margin-bottom: 16px;
      }
      
      .empty-icon svg path {
        fill: var(--luxury-gold-dark);
        opacity: 0.5;
      }
      
      .empty-state h3 {
        margin: 0 0 8px 0;
        font-weight: 600;
        color: var(--luxury-gold);
      }
      
      .empty-state p {
        margin: 0 0 20px 0;
        font-size: 14px;
      }
      
      /* Debug panel */
      .debug-panel {
        margin-top: 20px;
        background-color: var(--luxury-background-dark);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 400px;
        text-align: left;
        color: var(--discord-light-text);
        animation: slideIn 0.3s ease-out;
        border: 1px solid rgba(197, 164, 126, 0.1);
      }
      
      .debug-header {
        background: linear-gradient(to right, var(--luxury-gold-dark), var(--luxury-gold));
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .debug-header h4 {
        margin: 0;
        font-size: 14px;
        color: #23232a;
      }
      
      .close-button {
        background: none;
        border: none;
        color: #23232a;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .close-button:hover {
        opacity: 1;
      }
      
      .debug-content {
        padding: 16px;
        font-size: 12px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .debug-content h5 {
        margin: 0 0 8px 0;
        color: var(--luxury-gold);
        font-size: 13px;
      }
      
      .debug-content pre {
        background-color: rgba(0, 0, 0, 0.2);
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
        color: #ccc;
        font-family: monospace;
        font-size: 11px;
        margin: 0 0 16px 0;
        border: 1px solid rgba(197, 164, 126, 0.1);
      }
      
      /* Copy feedback */
      .copy-feedback {
        position: absolute;
        top: 12px;
        right: 16px;
        background: linear-gradient(to right, var(--luxury-gold-dark), var(--luxury-gold));
        color: #23232a;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s;
        display: none;
        z-index: 100;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      .copy-feedback.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  /**
   * Formats conversation data for clipboard copying
   * Includes server and channel information if available
   * 
   * @param {Array<Object>} conversations - Array of conversation objects
   * @returns {string} Formatted text ready for clipboard
   */
  function formatConversationsForClipboard(conversations) {
    if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
      return '';
    }
    
    // Add server and channel info at the beginning if available
    let result = '';
    const firstConv = conversations[0];
    
    if (firstConv.serverName) {
      result += `Server: ${firstConv.serverName}\n`;
    }
    
    if (firstConv.channelName) {
      result += `Channel: ${firstConv.channelName}\n\n`;
    }
    
    return result + conversations.map(conv => 
      `${conv.username}: ${conv.content} sent at "${conv.timestamp}"`
    ).join('\n');
  }
  
  /**
   * Copies text to the system clipboard
   * Uses the clipboard API with proper error handling
   * 
   * @param {string} text - Text to copy to clipboard
   * @returns {Promise<boolean>} Success status of the operation
   * @async
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      
      // Show feedback differently
      const copyFeedback = document.getElementById('copy-feedback');
      if (copyFeedback) {
        copyFeedback.style.display = 'block';
        copyFeedback.classList.add('show');
        
        setTimeout(() => {
          copyFeedback.classList.remove('show');
          setTimeout(() => {
            copyFeedback.style.display = 'none';
          }, 300);
        }, 2000);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  }
  
  /**
   * Escapes HTML special characters to prevent XSS
   * Used when inserting user-generated content into HTML
   * 
   * @param {string} unsafe - Potentially unsafe string
   * @returns {string} HTML-escaped safe string
   */
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  /**
   * Loads conversations from storage via background script
   * Requests data and updates UI with the result
   * Handles errors gracefully by showing empty state
   */
  function loadConversations() {
    console.log('Loading conversations from storage');
    try {
      // Show loading indicator
      showLoading();
      
      chrome.runtime.sendMessage({ action: 'getStoredConversations' }, response => {
        if (chrome.runtime.lastError) {
          console.error('Error loading conversations:', chrome.runtime.lastError);
          renderConversations([]);
          hideLoading();
          return;
        }
        
        console.log('Received response from background:', response);
        
        // Update last refresh time
        lastRefreshTime = Date.now();
        
        if (response && response.conversations) {
          // Debug deep log of the data structure
          console.log('Conversation data structure:', JSON.stringify(response.conversations).slice(0, 200) + '...');
          renderConversations(response.conversations);
        } else {
          console.warn('No conversations in response:', response);
          renderConversations([]);
        }
        
        hideLoading();
      });
    } catch (err) {
      console.error('Error requesting conversations:', err);
      renderConversations([]);
      hideLoading();
    }
  }
  
  /**
   * Shows a loading indicator in the UI
   */
  function showLoading() {
    const existing = document.getElementById('loading-indicator');
    if (existing) return;
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="loading-spinner">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="rgba(197, 164, 126, 0.2)" stroke-width="4" fill="none" />
          <circle cx="12" cy="12" r="10" stroke="#c5a47e" stroke-width="4" fill="none" stroke-dasharray="60 30" />
        </svg>
      </div>
    `;
    
    // Add style
    const style = document.createElement('style');
    style.textContent = `
      #loading-indicator {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 1000;
      }
      
      .loading-spinner svg {
        animation: spin 1.5s linear infinite;
      }
      
      @keyframes spin {
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loadingIndicator);
  }
  
  /**
   * Hides the loading indicator
   */
  function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }
  
  /**
   * Enables auto-refresh functionality with a 5-minute interval
   * Stores the interval ID for later cleanup
   */
  function enableAutoRefresh() {
    if (autoRefreshIntervalId) {
      clearInterval(autoRefreshIntervalId);
    }
    
    const refreshInterval = 300000; // 5 minutes instead of 5 seconds
    console.log(`Enabling auto-refresh every ${refreshInterval/1000} seconds`);
    autoRefreshIntervalId = setInterval(loadConversations, refreshInterval);
  }
  
  /**
   * Disables the auto-refresh functionality
   * Clears the existing interval if it exists
   */
  function disableAutoRefresh() {
    if (autoRefreshIntervalId) {
      console.log('Disabling auto-refresh');
      clearInterval(autoRefreshIntervalId);
      autoRefreshIntervalId = null;
    }
  }

  function loadHistory() {
    console.log('Loading history from storage');

    showLoading();
    chrome.storage.local.get(['history'], result => {
      const history = result.history || [];
      lastRefreshTime = Date.now();
  
      if (history.length > 0) {
        renderHistory(history);
      } else {
        renderHistoryHomePage();
      }
  
      hideLoading();
    });
  }  

  function renderHistory(history) {
    console.log('Rendering history:', history);
    // clear existing panel
    conversationsElement.innerHTML = '';
  
    // header for history (reuse server/channel blank)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'panel-header';
    headerDiv.innerHTML = `
      <div class="header-content">
        <h2 class="luxury-heading">Extraction History</h2>
        <button id="clear-history-btn" class="icon-button" title="Clear History">🗑️</button>
      </div>
    `;
    conversationsElement.appendChild(headerDiv);
    wireClearButton();  // reuse your clear-history wiring
  
    if (history.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No tickets in history.';
      empty.className = 'empty-state';
      conversationsElement.appendChild(empty);
      return;
    }
  
    // list out each history entry
    const list = document.createElement('div');
    list.className = 'conversation-items';
    history.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.innerHTML = `
        <div class="message-header">
          <div class="username">${escapeHtml(entry.username)}</div>
          <div class="timestamp">${escapeHtml(entry.timestamp)}</div>
        </div>
        <div class="message-content">
          <strong>${escapeHtml(entry.server_name)}:</strong>
          ${escapeHtml(entry.content)}
        </div>
      `;
      list.appendChild(item);
    });
    conversationsElement.appendChild(list);
  }

  function wireBackButton() {
    const btn = document.getElementById('back-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // return to main view
      loadConversations();
    });
  }
  
  
  
  // Listen for refresh button clicks
  if (refreshButton) {
    refreshButton.addEventListener('click', loadConversations);
  }
  
  // Load conversations on initial load
  loadConversations();
  
  /**
   * Listen for update messages from background script
   * Refreshes conversation list when a 'conversationsUpdated' message is received
   * Returns true to keep message channel open
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Side panel received message:', message);
    if (message.action === 'historyCleared') {
      lastRefreshTime = 0;            // force UI-refresh
      loadConversations();
      showToast('History cleared');   // optional helper if you have a toast util
    } else if (message.action === 'conversationsUpdated') {
      // Only refresh if it's been at least 2 seconds since the last refresh
      // This prevents rapid-fire refreshes if multiple messages arrive quickly
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      if (timeSinceLastRefresh > 2000) {
        loadConversations();
      } else {
        console.log(`Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago`);
      }
    }
    return true;
  });
}); 