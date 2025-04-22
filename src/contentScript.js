// Content script for Discord Conversation Extractor
(function() {
  /**
   * ==============================================
   * MODULE: Initialization
   * ==============================================
   */
  // Prevent multiple execution
  if (window.__DISCORD_EXTRACTOR_RUNNING) {
    console.log('Discord Conversation Extractor already running, preventing duplicate execution');
    return;
  }
  window.__DISCORD_EXTRACTOR_RUNNING = true;
  
  // Global variables in script scope
  const STATE = {
    waitingForIframeResults: false,
    toastElement: null
  };
  
  // Load helper functions
  if (!window.__DISCORD_HELPERS) {
    console.error('Discord helper functions not available. Make sure helpers.js is loaded before contentScript.js');
    // Create simple fallbacks for essential helpers
    window.__DISCORD_HELPERS = {
      isInIframe: () => window.self !== window.top,
      delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      sendMessageToBackground: (message) => {
        return new Promise((resolve) => {
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(message, (response) => {
              resolve(response);
            });
          } else {
            resolve(null);
          }
        });
      },
      showToast: (msg) => { console.log('Toast message:', msg); },
      updateFavicon: () => {},
      showSpinner: () => null,
      copyToClipboard: () => Promise.resolve(false),
      formatForClipboard: (conversations) => conversations.map(c => `${c.username}: ${c.content}`).join('\n')
    };
  }
  
  const {
    isInIframe, 
    delay, 
    sendMessageToBackground, 
    showToast, 
    updateFavicon, 
    showSpinner, 
    copyToClipboard, 
    formatForClipboard
  } = window.__DISCORD_HELPERS || {};
  
  // Log initialization information
  console.log('Discord Conversation Extractor content script loaded');
  console.log('Running in:', window.location.href);
  console.log('Is iframe:', isInIframe());
  
  /**
   * ==============================================
   * MODULE: Data Extraction
   * ==============================================
   */
  /**
   * Gets the server name from the preamble element
   * Attempts multiple selector strategies to find the server name
   * @returns {string} Server name or empty string if not found
   */
  function getServerName() {
    try {
      const serverElement = document.querySelector('.preamble__entries-container > .preamble__entry:first-child');
      
      if (serverElement && serverElement.textContent) {
        console.log('Found server name from preamble');
        return serverElement.textContent.trim();
      }
      
      // Try alternate selectors if primary fails
      const alternateSelectors = [
        '.preamble__entry:first-child',
        '.preamble div:first-child',
        '.preamble__guild-name'
      ];
      
      for (const selector of alternateSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          console.log(`Found server name with alternate selector: ${selector}`);
          return element.textContent.trim();
        }
      }
      
      // Try to find preamble and log structure
      const preamble = document.querySelector('.preamble, .preamble__entries-container');
      if (preamble) {
        console.log('Preamble found but could not extract server name');
      } else {
        console.log('No preamble element found');
      }
      
      return '';
    } catch (e) {
      console.error('Error getting server name:', e);
      return '';
    }
  }
  
  /**
   * Gets the channel name from the preamble element
   * Attempts multiple selector strategies to find the channel name
   * @returns {string} Channel name or empty string if not found
   */
  function getChannelName() {
    try {
      const channelElement = document.querySelector('.preamble__entries-container > .preamble__entry:nth-child(2)');
      
      if (channelElement && channelElement.textContent) {
        console.log('Found channel name from preamble');
        return channelElement.textContent.trim();
      }
      
      // Try alternate selectors if primary fails
      const alternateSelectors = [
        '.preamble__entry:nth-child(2)',
        '.preamble div:nth-child(2)',
        '.preamble__channel-name'
      ];
      
      for (const selector of alternateSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          console.log(`Found channel name with alternate selector: ${selector}`);
          return element.textContent.trim();
        }
      }
      
      return '';
    } catch (e) {
      console.error('Error getting channel name:', e);
      return '';
    }
  }

  /**
   * Extracts Discord conversations from the DOM elements on the page
   * Waits 3 seconds for page to fully load before extracting content
   * @returns {Promise<Array<Object>>} Promise resolving to array of conversation objects
   * @async
   */
  async function extractConversations() {
    try {
      console.log('Starting message extraction...');
      
      // Wait for page to be fully loaded
      await delay(3000);
      
      // Get metadata about the conversation
      const serverName = getServerName();
      const channelName = getChannelName();
      
      // Log metadata
      console.log('Server:', serverName);
      console.log('Channel:', channelName);
      
      // Extract message groups from DOM
      const conversations = [];
      const messageGroups = document.querySelectorAll('.chatlog__message-group');
      
      console.log(`Found ${messageGroups.length} message groups in DOM`);
      
      // Process each message group
      messageGroups.forEach((group, index) => {
        // Extract username
        const authorElement = group.querySelector('.chatlog__author-name');
        if (!authorElement) return;
        
        const username = authorElement.textContent.trim();
        
        // Extract timestamp
        const timestampElement = group.querySelector('.chatlog__timestamp');
        const timestamp = timestampElement ? timestampElement.textContent.trim() : 'Unknown Time';
        
        // Extract message content
        const messageElements = group.querySelectorAll('.chatlog__message');
        
        messageElements.forEach(msgElement => {
          const contentElement = msgElement.querySelector('.chatlog__content .markdown');
          if (!contentElement) return;
          
          const content = contentElement.textContent.trim();
          
          // Only add if we have content
          if (content) {
            conversations.push({
              username,
              content,
              timestamp,
              channelName,
              serverName
            });
          }
        });
      });
      
      console.log(`Extracted ${conversations.length} conversations from DOM`);
      return conversations;
    } catch (e) {
      console.error('Error extracting conversations:', e);
      return [];
    }
  }

  /**
   * ==============================================
   * MODULE: Storage & Communication
   * ==============================================
   */
  /**
   * Saves conversations to background script for storage
   * Also sends a message to refresh the sidepanel
   * @param {Array<Object>} conversations - Conversations to store
   * @returns {Promise<boolean>} Promise resolving to success status
   * @async
   */
  async function saveConversations(conversations) {
    if (!conversations || conversations.length === 0) {
      console.log('No conversations to save');
      return false;
    }
    
    // Get metadata
    const serverName = conversations[0].serverName || '';
    const channelName = conversations[0].channelName || '';
    
    const data = {
      conversations,
      metadata: {
        serverName,
        channelName,
        extractedAt: new Date().toISOString()
      }
    };
    
    // Send conversations to background for storage
    const response = await sendMessageToBackground({
      action: 'saveConversations',
      data
    });
    
    // Request sidebar update to refresh its content
    await sendMessageToBackground({
      action: 'conversationsUpdated'
    });
    
    return response && response.success;
  }
  
  /**
   * Sends conversations from iframe to parent window
   * Only executes when running in an iframe context
   * @param {Array<Object>} conversations - Conversations to send 
   */
  function sendConversationsToParent(conversations) {
    if (!isInIframe()) return;
    
    try {
      window.parent.postMessage({
        type: 'DISCORD_CONVERSATIONS',
        conversations
      }, '*');
      console.log('Sent conversations to parent window');
    } catch (e) {
      console.error('Error sending conversations to parent:', e);
    }
  }
  
  /**
   * Processes conversations received from iframe
   * Copies to clipboard, saves to storage, and shows visual feedback
   * @param {Array<Object>} conversations - Conversations extracted from iframe
   * @returns {Promise<void>}
   * @async
   */
  async function processConversationsFromIframe(conversations) {
    console.log('Processing conversations from iframe:', conversations.length);
    
    // We're no longer waiting for iframe results
    STATE.waitingForIframeResults = false;
    
    if (!conversations || conversations.length === 0) return;
    
    // Format and copy to clipboard
    const formattedText = formatForClipboard(conversations);
    const copied = await copyToClipboard(formattedText);
    
    // Save to extension storage
    const saved = await saveConversations(conversations);
    
    if (copied) {
      showToast('Successfully extracted Discord conversation!');
      updateFavicon('#43B581'); // 💚 Discord green
    } else {
      showToast('Extracted conversation but couldn\'t copy to clipboard', 'error');
      updateFavicon('#ED4245'); // 🔴 Discord red
    }
  }
  
  /**
   * ==============================================
   * MODULE: Main Process
   * ==============================================
   */
  /**
   * Main function to extract conversations from ticket page
   * Has a 5 second timeout for iframe responses
   * Shows visual feedback throughout the process
   * @returns {Promise<void>}
   * @async
   */
  async function processTicketPage() {
    // Check if we're on a relevant page
    const isRelevantPage = 
      window.location.href.includes('tickettool.xyz/transcript') || 
      window.location.href.includes('transcript-closed') ||
      window.location.href.includes('api.tickettool.xyz');
      
    if (!isRelevantPage) {
      console.log('Not on a relevant page:', window.location.href);
      return;
    }
    
    console.log('Processing page:', window.location.href);
    console.log('Is iframe:', isInIframe());
    
    try {
      // In the main window, check if we have iframe(s) that might contain conversations
      const isMainWindow = !isInIframe();
      const hasIframes = isMainWindow && document.querySelectorAll('iframe').length > 0;
      
      // Show notification in main window
      if (isMainWindow) {
        showToast('Detected Discord conversation, extracting...');
      }
      
      // Spinner only in main window
      const spinner = isMainWindow ? showSpinner() : null;
      
      try {
        // Extract conversations
        const conversations = await extractConversations();
        
        if (conversations.length > 0) {
          console.log(`Successfully extracted ${conversations.length} conversations`);
          
          // Only handle UI operations in the main window
          if (isMainWindow) {
            // Format and copy to clipboard
            const formattedText = formatForClipboard(conversations);
            const copied = await copyToClipboard(formattedText);
            
            // Save to extension storage
            await saveConversations(conversations);
            
            if (copied) {
              showToast('Successfully extracted Discord conversation!');
              updateFavicon('#43B581'); 
            } else {
              showToast('Extracted conversation but couldn\'t copy to clipboard', 'error');
              updateFavicon('#ED4245'); 
            }
          } else {
            // In iframe, post message to parent
            sendConversationsToParent(conversations);
          }
        } else {
          // If we're in the main window and have iframes, wait for potential iframe results
          if (isMainWindow && hasIframes) {
            console.log('No conversations found in main page, but iframes detected');
            console.log('Waiting for potential iframe results...');
            
            // Set a flag that we're waiting for iframe results
            STATE.waitingForIframeResults = true;
            
            // Set a timeout to show error if no iframe responds within 5 seconds
            setTimeout(() => {
              if (STATE.waitingForIframeResults) {
                console.log('No responses from iframes after timeout');
                showToast('No conversations found on this page', 'error');
                console.error('No conversations found. Please check console logs for details.');
                STATE.waitingForIframeResults = false;
              }
            }, 5000);
          } 
          // Only show error in iframe or in main window with no iframes
          else if (isMainWindow && !hasIframes) {
            showToast('No conversations found on this page', 'error');
            console.error('No conversations found. Please check console logs for details.');
          }
        }
      } finally {
        // Remove spinner if it exists
        if (spinner && spinner.parentNode) {
          document.body.removeChild(spinner);
        }
      }
    } catch (error) {
      console.error('Error processing page:', error);
      
      // Only show error in main window
      if (!isInIframe()) {
        showToast('Error extracting conversations', 'error');
      }
    }
  }

  /**
   * ==============================================
   * MODULE: Event Listeners
   * ==============================================
   */
  // Listen for messages from parent window (when running in iframe)
  window.addEventListener('message', event => {
    // In the main window, handle messages from the iframe
    if (!isInIframe() && event.data && event.data.type === 'DISCORD_CONVERSATIONS') {
      processConversationsFromIframe(event.data.conversations);
    }
    // In the iframe, listen for extraction requests from parent
    else if (isInIframe() && event.data && event.data.type === 'EXTRACT_DISCORD_CONVERSATIONS') {
      console.log('Received extraction request from parent');
      extractConversations().then(conversations => {
        sendConversationsToParent(conversations);
      });
    }
  });
  
  /**
   * Message listener for communication with background script
   * Responds to getConversations action requests
   * Returns true to keep the channel open for async response
   */
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getConversations') {
        extractConversations().then(conversations => {
          sendResponse({ 
            conversations,
            metadata: {
              serverName: conversations.length > 0 ? conversations[0].serverName : '',
              channelName: conversations.length > 0 ? conversations[0].channelName : '',
              extractedAt: new Date().toISOString()
            }
          });
        });
        return true; // Keep channel open for async response
      }
      return true;
    });
  }
  
  /**
   * Initial execution with delay
   * Waits 2 seconds to ensure page is fully loaded before starting processing
   */
  setTimeout(processTicketPage, 2000);
})(); 