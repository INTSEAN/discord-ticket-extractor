/**
 * Background script for Discord Conversation Extractor (Service Worker in Manifest V3)
 * Handles background operations, data storage, and communication between components
 */
console.log('Discord Conversation Extractor background script loaded');

// Store for conversations
let conversations = [];

/**
 * Handles extension installation and updates
 * Sets up storage and configures the side panel
 * @param {Object} details - Installation details including reason
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  // Initialize empty conversations in storage
  chrome.storage.local.set({ conversations: [] });
  
  // Set up side panel
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(err => console.error('Error setting side panel behavior:', err));
  }
});

/**
 * Monitors tab updates to detect Discord pages and inject content scripts
 * Only injects scripts on relevant pages and in the complete loading state
 * Ensures helpers.js is loaded before contentScript.js
 * @param {number} tabId - ID of the updated tab
 * @param {Object} changeInfo - Information about the change
 * @param {Object} tab - Tab object with URL and other properties
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject our content script on Discord and tickettool.xyz pages
  if (changeInfo.status === 'complete' && tab.url) {
    const isTicketToolPage = tab.url.includes('tickettool.xyz/transcript');
    
    if (isTicketToolPage) {
      console.log('Discord or TicketTool page updated:', tab.url);
      
      // Inject helpers.js first, then contentScript.js
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['src/helpers.js']
      })
      .then(() => {
        // After helpers are loaded, load the content script
        return chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/contentScript.js']
        });
      })
      .catch(err => console.error('Content script injection error:', err));
    }
  }
});

/**
 * Formats conversation data for clipboard
 * Creates a clean multi-line representation of all messages
 * @param {Array<Object>} conversations - Array of conversation objects
 * @returns {string} Formatted text suitable for clipboard
 */
function formatConversationsForClipboard(conversations) {
  return conversations.map(conv => 
    `${conv.username}: ${conv.content} sent at "${conv.timestamp}"`
  ).join('\n');
}

/**
 * Handle messages from content scripts and other extension components
 * Supports multiple actions: saveConversations, getStoredConversations, 
 * conversationsUpdated, openSidePanel, and copyToClipboard
 * Some handlers are asynchronous and keep the message channel open
 * @param {Object} message - The incoming message with action and data
 * @param {Object} sender - Information about the message sender
 * @param {Function} sendResponse - Callback function to respond to the sender
 * @returns {boolean} True to keep the message channel open for async responses
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  if (message.action === 'saveConversations' && message.data) {
    const conversationsData = message.data.conversations || message.data;
  
    console.log('Saving conversations data:', conversationsData);
  
    // Save current conversations (for UI use, etc.)
    chrome.storage.local.set({ conversations: conversationsData }, () => {
      console.log('Current conversations saved.');
    });
  
    // Update history
    chrome.storage.local.get(['history'], (result) => {
      const previousHistory = result.history || [];
      const extractionTime = new Date().toISOString();
      
      const newHistory = [...previousHistory, ...conversationsData.map(c => ({
        username: c.username,
        content: c.content,
        timestamp: c.timestamp,
        server_name: c.serverName || '', // Ensure it's renamed to match your spec
        extraction_time: extractionTime  // Add extraction time to group conversations
      }))];
  
      chrome.storage.local.set({ history: newHistory }, () => {
        console.log('History updated with new ticket entries.');
  
        // Notify other parts (e.g., side panel) that conversations were updated
        chrome.runtime.sendMessage({ action: 'conversationsUpdated' });
      });
    });
  
    sendResponse({ success: true });
  }

  // clear history function
  if (message.action === 'clearHistory') {
    chrome.storage.local.set({ history: [] }, () => {
      console.log('History cleared.');
      
      // Notify other parts (e.g., side panel) that history was cleared
      chrome.runtime.sendMessage({ action: 'historyCleared' });
    });
    sendResponse({ success: true });
  }
  
  // Clear both history and current conversations
  if (message.action === 'clearAll') {
    chrome.storage.local.set({ 
      history: [],
      conversations: []
    }, () => {
      console.log('All data cleared (history and current conversations).');
      
      // Notify all components about the clear operation
      chrome.runtime.sendMessage({ action: 'allDataCleared' });
    });
    sendResponse({ success: true });
  }
  
  // Handle the external history clear message (from history page to sidebar)
  if (message.action === 'historyClearedExternal') {
    // Forward this message to all extension components
    chrome.runtime.sendMessage({ action: 'historyClearedExternal' });
    sendResponse({ success: true });
  }
  
  if (message.action === 'getStoredConversations') {
    // Get from storage and send
    chrome.storage.local.get('conversations', (data) => {
      console.log('Retrieving conversations from storage:', data.conversations);
      sendResponse({ conversations: data.conversations || [] });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === 'clearTicket' && message.ticketKey) {
    chrome.storage.local.get({ history: [] }, ({ history }) => {
      const updatedHistory = history.filter(
        (row) => (row.extraction_time || row.timestamp) !== message.ticketKey
      );

      chrome.storage.local.set({ history: updatedHistory }, () => {
        console.log(
          `Ticket ${message.ticketKey} cleared — removed ${
            history.length - updatedHistory.length
          } row(s).`
        );
        chrome.runtime.sendMessage({
          action: 'ticketCleared',
          ticketKey: message.ticketKey,
        });
        sendResponse({
          ok: true,
          removed: history.length - updatedHistory.length,
        });
      });
    });
    return true; // keep the channel open for async sendResponse
  }

  if (message.action === 'conversationsUpdated') {
    // Simply relay the message to all listeners (including sidepanel)
    chrome.runtime.sendMessage({
      action: 'conversationsUpdated'
    });
    sendResponse({ success: true });
  }
  
  if (message.action === 'openSidePanel') {
    if (chrome.sidePanel) {
      // Try to open side panel
      chrome.sidePanel.open().catch(err => {
        console.error('Error opening side panel:', err);
      });
    } else {
      console.error('Side panel API not available');
    }
    sendResponse({ success: !!chrome.sidePanel });
  }
  
  if (message.action === 'copyToClipboard' && message.data) {
    // This won't work directly in the background script due to Manifest V3 restrictions
    // Instead, we'll send a message back to the content script to handle it
    // We're keeping this handler for future compatibility
    console.log('Clipboard operation requested, but must be handled by content script');
    sendResponse({ success: false, message: 'Clipboard operations must be handled by content script' });
  }
  
  return true; // Keep channel open by default
}); 