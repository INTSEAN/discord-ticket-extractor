/**
 * Helper utility functions for Discord Conversation Extractor
 * This file provides shared functionality used by various parts of the extension
 */

// Immediately-invoked function to register helpers without polluting global namespace
(function() {
  // Create namespace for our helpers
  window.__DISCORD_HELPERS = {};
  
  /**
   * Checks if the current window is running in an iframe
   * Used to determine context for UI operations and message passing
   * @returns {boolean} True if running in iframe, false otherwise
   */
  window.__DISCORD_HELPERS.isInIframe = function() {
    return window.self !== window.top;
  };
  
  /**
   * Creates a delay for the specified amount of time
   * Used for waiting operations, throttling and ensuring DOM is ready
   * @param {number} ms - Time to wait in milliseconds
   * @returns {Promise<void>} Promise that resolves after the delay
   * @async
   */
  window.__DISCORD_HELPERS.delay = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  
  /**
   * Safely sends a message to the background script
   * Handles runtime errors and missing Chrome APIs
   * @param {Object} message - Message to send
   * @returns {Promise<any>} Promise resolving to the response or null if error
   * @async
   */
  window.__DISCORD_HELPERS.sendMessageToBackground = function(message) {
    return new Promise((resolve) => {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        console.warn('Chrome runtime not available for sending messages');
        resolve(null);
        return;
      }
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        console.error('Failed to send message:', e);
        resolve(null);
      }
    });
  };
  
  /**
   * Shows a toast notification to the user
   * Automatically removes the toast after 5 seconds
   * Only displays in main window, not in iframes
   * @param {string} message - Message to display in the toast
   * @param {string} [type='success'] - Type of notification ('success' or 'error')
   * @returns {HTMLElement|null} The toast element that was created or null if in iframe
   */
  window.__DISCORD_HELPERS.showToast = function(message, type = 'success') {
    // Only show toasts in the main window
    if (window.__DISCORD_HELPERS.isInIframe()) return null;
    
    // Create toast container
    const toastElement = document.createElement('div');
    toastElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: ${type === 'success' ? '#5865F2' : '#ED4245'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: Arial, sans-serif;
      z-index: 10000;
      animation: toast-in 0.3s forwards;
    `;
    
    // Discord SVG icon (embedded to avoid CSP issues)
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`;
    
    const iconDiv = document.createElement('div');
    iconDiv.innerHTML = iconSvg;
    
    const textDiv = document.createElement('div');
    textDiv.textContent = message;
    
    toastElement.appendChild(iconDiv);
    toastElement.appendChild(textDiv);
    document.body.appendChild(toastElement);
    
    // Add animation styles only once
    if (!document.getElementById('discord-extractor-styles')) {
      const style = document.createElement('style');
      style.id = 'discord-extractor-styles';
      style.textContent = `
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toastElement && toastElement.parentNode) {
        toastElement.style.animation = 'toast-out 0.3s forwards';
        setTimeout(() => {
          if (toastElement && toastElement.parentNode) {
            try {
              document.body.removeChild(toastElement);
            } catch (e) {
              console.log('Toast element already removed');
            }
          }
        }, 300);
      }
    }, 5000);
    
    return toastElement;
  };
  
  /**
   * Updates the favicon with a solid color overlay for visual feedback
   * Modifies the document head to inject a new favicon
   * Only updates in main window, not in iframes
   * @param {string} [color='#5865F2'] - Hex color code to apply to the favicon
   * @returns {void}
   */
  window.__DISCORD_HELPERS.updateFavicon = function(color = '#5865F2') {
    // Only update favicon in main window
    if (window.__DISCORD_HELPERS.isInIframe()) return;
    
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22><rect width=%2232%22 height=%2232%22 fill='${encodeURIComponent(color)}'/></svg>`;
    document.head.appendChild(link);
  };
  
  /**
   * Creates and displays a loading spinner overlay
   * Adds a full-screen overlay with animated spinner
   * Only shows in main window, not in iframes
   * @returns {HTMLElement|null} The spinner DOM element that can be removed later or null if in iframe
   */
  window.__DISCORD_HELPERS.showSpinner = function() {
    // Only show spinner in main window
    if (window.__DISCORD_HELPERS.isInIframe()) return null;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const spinnerInner = document.createElement('div');
    spinnerInner.style.cssText = `
      background-color: #36393f;
      padding: 24px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    `;
    
    const spinnerCircle = document.createElement('div');
    spinnerCircle.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-left-color: #5865F2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;
    
    const spinnerText = document.createElement('div');
    spinnerText.textContent = 'Extracting Conversations...';
    spinnerText.style.cssText = `
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    
    spinnerInner.appendChild(spinnerCircle);
    spinnerInner.appendChild(spinnerText);
    spinner.appendChild(spinnerInner);
    document.body.appendChild(spinner);
    
    return spinner;
  };
  
  /**
   * Copies text to clipboard with fallback for when Clipboard API fails
   * If Clipboard API fails, displays a manual copy dialog for user
   * @param {string} text - Text to copy to clipboard
   * @returns {Promise<boolean>} Promise resolving to success status (true even if fallback is used)
   * @async
   */
  window.__DISCORD_HELPERS.copyToClipboard = async function(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard API failed:', err);
      
      // Show manual copy dialog as fallback
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #36393f;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
        max-width: 400px;
      `;
      
      dialog.innerHTML = `
        <h3 style="margin-top: 0;">Copy Text</h3>
        <p>Please use Ctrl+C/Cmd+C to copy:</p>
        <textarea style="width: 100%; height: 100px; background: #2f3136; color: white; padding: 8px; border-radius: 4px; border: none;">${text}</textarea>
        <div style="text-align: right; margin-top: 12px;">
          <button style="background: #5865F2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Select text and add button handler
      const textarea = dialog.querySelector('textarea');
      textarea.select();
      
      dialog.querySelector('button').addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      return true;
    }
  };
  
  /**
   * Format conversations for clipboard
   * Creates a nicely formatted string including server and channel info
   * @param {Array<Object>} conversations - Array of conversation objects
   * @returns {string} Formatted text for clipboard
   */
  window.__DISCORD_HELPERS.formatForClipboard = function(conversations) {
    if (conversations.length === 0) return '';
    
    // Add server and channel info at the beginning
    const { serverName, channelName } = conversations[0];
    let result = '';
    
    // Add server and channel header if available
    if (serverName) {
      result += `Server: ${serverName}\n`;
    }
    
    if (channelName) {
      result += `Channel: ${channelName}\n\n`;
    }
    
    // Add formatted conversations
    result += conversations.map(conv => 
      `"${conv.username}": "${conv.content}" sent at "${conv.timestamp}"`
    ).join('\n');
    
    return result;
  };
  
  console.log('Discord helper functions registered!');
})(); 