# Chrome Extension: Discord Ticket Extractor

- **Landing Page:** [Visit here](https://junieguo.github.io/discord-ticket-extractor-landing-page/)
- **Demo Video:** [Visit here](https://youtu.be/fqZS18wfngM)
- **Pitching Video:** [Visit here](https://youtu.be/__rOadU_dxI?si=9WXmnAi7qXOM6_BL)

## Meet the Team

PM + Dev: Cecilia Zhang | [LinkedIn](https://www.linkedin.com/in/cecilia-zhang-9b6aa7190/)

Computer Science @ Bryn Mawr College '25

--

Dev: Sean Donovan | [LinkedIn](https://www.linkedin.com/in/seandonovan-upenn/)

Engineering @ Penn '27

--

Dev: Junie Guo | [LinkedIn](https://www.linkedin.com/in/junieguo/)

Computer Science + Economics @ Penn '27

--

Dev: Garrett Kirsch | [LinkedIn](https://www.linkedin.com/in/garrett-kirsch/)

Computer Engineering @ Penn '27

## Description

Our Chrome extension streamlines Discord ticket conversations into clean, ready-to-use text for LLMs like ChatGPT. When a Ticket Tool transcript is opened in the browser, it automatically removes system messages, emotes, and other clutter, then copies the refined conversation to the clipboard. Users can apply one-click prompts such as summarization, action item extraction, and categorization to quickly prepare content for analysis or follow-up. A built-in history tab allows fast keyword-based search across past transcripts, helping moderators and community managers efficiently locate specific tickets among hundreds. The extension is built with React and Vite using Manifest V3.

## Setup Instruction

1. Download the GitHub repository as a ZIP file and unzip it. Navigate to the `discord-ticket-extractor` directory.  
2. Run `npm install` to install all dependencies.  
3. Run `npm run build`. This will generate a `dist` directory.  
4. Open Chrome and go to `chrome://extensions/`.  
5. In the top right corner, enable **Developer mode**.  
6. Click **Load unpacked** and select the `dist` folder from the project directory.  
7. The extension should now be installed and appear in your Chrome toolbar.

## Requirements

1. A Discord account. Create an account [here](https://discord.com/).
2. A TicketTool transcript **link**. It should start with `https://tickettool.xyz/transcript/`.  
3. If you do not have one, we provide sample transcript links (need to log in to Discord first):  
   - [Transcript Test 1](https://tickettool.xyz/transcript/v1/1111393507123404860/1367315040302137344/transcript-test-1.html/6821fa9d/6820a91d/5c43312ce72cafd85cbf1f665fba03f8ecc2ca232a993b9c281f35a64cf2e579)  
   - [Transcript Test 2](https://tickettool.xyz/transcript/v1/1111393507123404860/1367317147826655343/transcript-test-2.html/6822a553/682153d3/bfeb5fce21c90e7c80dc4cb00eaabbd28585d0dc4b90146ae4c51c2b8f673b44)

## Features

- Auto detection + conversation extraction (Sean)
- One-click copy to clipboard with preset prompts (Junie)
- History page view (Cecilia)
- Ticket history deletion (single & clear all) (Garret)
- History Search Bar (Sean + Cecilia)

## Known Bugs / Limitations

1. TicketTool transcript links might expire. If the transcript link shows **"invalid request"**, user will need to re-generate transcript link, and then open in browser for extraction.

## Future Work

1. History view UI enhancement.
2. Ticket history tags.
3. Allow users to customize prompts.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Building for Production

```bash
# Build the extension
npm run build
```

After building, the `dist` directory will contain the extension ready for loading into Chrome.

## Challenges Faced

### Iframe Content Access

One of the most significant challenges encountered was extracting Discord conversation data from tickettool.xyz pages. We discovered that the actual conversation content was contained within an iframe, which was why our initial selectors couldn't find any conversation elements.

#### Problem Identification:

The DOM inspection revealed that the main page contained an iframe with the Discord conversation:

```html
<iframe src="https://api.tickettool.xyz/api/legacy/transcript/v1/..." sandbox="allow-scripts"></iframe>
```

Our content script was running in the main page context, but the conversation data was isolated in the iframe context.

#### Solution

We modified the content script to detect whether it was running in an iframe or the main page and handle each case appropriately:

**Before:**

```javascript
async function extractConversations() {
  try {
    console.log('Starting message extraction...');
    
    // Wait for content to be loaded
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get metadata about the conversation
    const serverName = getServerName();
    const channelName = getChannelName();
    const messageCount = getMessageCount();
    
    // Array to hold our extracted conversations
    const conversations = [];
    
    // Get all message groups
    const messageGroups = document.querySelectorAll('.chatlog__message-group');
    console.log(`Found ${messageGroups.length} message groups`);
    
    // Process each message group
    messageGroups.forEach((group) => {
      // Extract data...
    });
    
    return conversations;
  } catch (e) {
    console.error('Error extracting conversations:', e);
    return [];
  }
}
```

**After:**

```javascript
async function extractConversations() {
  try {
    console.log('Starting message extraction...');
    
    // Check if we're in the iframe or main page
    const isIframe = window.self !== window.top;
    console.log('Is iframe:', isIframe);
    
    // If we're in the main page, try to find the iframe
    if (!isIframe) {
      const iframes = document.querySelectorAll('iframe');
      console.log('Found', iframes.length, 'iframes on the page');
      
      // Look for the transcript iframe specifically
      const transcriptIframe = Array.from(iframes).find(iframe => 
        iframe.src && iframe.src.includes('transcript')
      );
      
      if (transcriptIframe) {
        console.log('Found transcript iframe:', transcriptIframe.src);
        showToast('Please click on the iframe to extract Discord conversations', 'error');
        return [];
      }
    }
    
    // If we're in the iframe, proceed with extraction
    const chatlog = document.querySelector('.chatlog');
    console.log('Chatlog found:', !!chatlog);
    
    // Enhanced element selection for the iframe context
    let messageGroups = document.querySelectorAll('.chatlog__message-group');
    
    // Process message groups and extract data...
    
    return conversations;
  } catch (e) {
    console.error('Error extracting conversations:', e);
    return [];
  }
}
```

We also updated the main processing function to conditionally display UI elements based on whether we're in the main page or iframe:

```javascript
async function processTicketPage() {
  // Check for both main page and iframe URLs
  if (!window.location.href.includes('tickettool.xyz/transcript') && 
      !window.location.href.includes('transcript-closed')) {
    return;
  }
  
  try {
    // Show notification only if we're in the top window
    if (window.self === window.top) {
      showToast('Successfully detected that you\'re on a ticket page!');
    }
    
    // Show spinner only if we're in the top window
    const spinner = window.self === window.top ? showSpinner() : null;
    
    // Extract conversations and handle results...
    
  } catch (error) {
    console.error('Error processing ticket page:', error);
  }
}
```

This approach allowed the extension to:

1. Detect when it's running in the main page and identify the iframe containing the conversation
2. Provide helpful guidance to users when it can't access the iframe content directly
3. Properly extract content when the script is executing within the iframe context

### Cross-Origin Restrictions and JavaScript Variables

After implementing iframe detection, we encountered another challenge: cross-origin restrictions. Attempting to access the iframe URL directly resulted in an "Access Denied" error:

```
{"code":254,"error":"Access Denied"}
```

However, browser console logs revealed that the message data was available in the page's JavaScript scope:

```
transcript.bundle.min.obv.js:1 messages (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
transcript.bundle.min.obv.js:1 channel {name: 'closed-0007', id: '1364289222403555480'}
transcript.bundle.min.obv.js:1 server {name: 'CIS 3500 Testing Server', id: '822401436225634304', icon: null}
```

#### Solution Enhancement:

To extract this data, we modified our approach to look for and access these global JavaScript variables:

```javascript
async function extractConversations() {
  try {
    // ... existing code ...
    
    // Check if we can access the messages from JavaScript variables
    if (window.messages && Array.isArray(window.messages) && window.messages.length > 0) {
      console.log('Found messages in global scope:', window.messages.length);
      
      // Extract channel and server data if available
      const channelName = window.channel && window.channel.name ? window.channel.name : getChannelName();
      const serverName = window.server && window.server.name ? window.server.name : getServerName();
      
      // Process messages from JavaScript variable
      const conversations = window.messages.map(msg => {
        return {
          username: msg.author ? msg.author.username : 'Unknown User',
          content: msg.content || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown Time',
          channelName,
          serverName
        };
      }).filter(conv => conv.content); // Only include messages with content
      
      console.log('Extracted conversations from JavaScript variables:', conversations.length);
      return conversations;
    }
    
    // ... fallback to DOM-based extraction ...
  } catch (e) {
    console.error('Error extracting conversations:', e);
    return [];
  }
}
```

This hybrid approach allowed us to:
1. First try to access and extract data from JavaScript variables in the global scope
2. Fall back to DOM-based extraction if the variables aren't available
3. Work around the cross-origin restrictions that would normally prevent access to iframe content

This solution demonstrates the importance of understanding not just the DOM structure but also how JavaScript data is made available in different contexts within web applications.

### Content Security Policy Restrictions and Manifest Configuration

When attempting to inject scripts to access page variables, we encountered Content Security Policy (CSP) restrictions:

```
Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules'..."
```

This meant we couldn't use our inline script injection technique to access the global variables directly.

#### Final Solution

We implemented two key changes that successfully resolved all the issues:

1. **Updated manifest.json with `all_frames: true`**:
   ```json
   "content_scripts": [
     {
       "matches": [
         "https://*.discord.com/*",
         "https://tickettool.xyz/transcript*",
         "https://api.tickettool.xyz/api/legacy/transcript*"
       ],
       "js": ["src/contentScript.js"],
       "all_frames": true
     }
   ]
   ```

   This crucial setting ensured our content script would run in both the main page and the iframe, allowing direct DOM access within the iframe context.

2. **DOM-based extraction fallback**:
   ```javascript
   async function extractConversations() {
     try {
       // Try to extract from page variables first
       const conversationsFromVariables = await extractConversationsFromPageVariables();
       
       if (conversationsFromVariables.length > 0) {
         return conversationsFromVariables;
       }
       
       console.log('Falling back to DOM-based extraction');
       
       // Extract message groups from DOM
       const conversations = [];
       const messageGroups = document.querySelectorAll('.chatlog__message-group');
       
       console.log(`Found ${messageGroups.length} message groups in DOM`);
       
       // Process messages...
       
       return conversations;
     } catch (e) {
       console.error('Error extracting conversations:', e);
       return [];
     }
   }
   ```

   This reliable DOM-based approach allowed us to extract conversations even when script injection failed due to CSP restrictions.

3. **Parent-child window communication**:
   ```javascript
   // In iframe context
   if (window.self !== window.top) {
     // Send data to parent window
     window.parent.postMessage({
       type: 'DISCORD_CONVERSATIONS',
       conversations
     }, '*');
     console.log('Sent conversations to parent window');
   }
   ```

This approach ultimately succeeded, as demonstrated by the console logs:
```
contentScript.js:438 Found server name from preamble
contentScript.js:482 Found channel name from preamble
contentScript.js:377 Server (DOM): CIS 3500 Testing Server
contentScript.js:378 Channel (DOM): closed-0007
contentScript.js:384 Found 6 message groups in DOM
contentScript.js:420 Extracted 5 conversations from DOM
contentScript.js:694 Successfully extracted 5 conversations
contentScript.js:719 Sent conversations to parent window
```

## Permissions

This extension requires the following permissions:

- `tabs`: To access the current tab information
- `scripting`: To inject content scripts
- `storage`: To store extracted conversations
- `clipboardWrite`: To copy conversations to clipboard

## Structure

- `public/manifest.json`: Chrome Extension manifest file
- `src/App.jsx`: Popup interface
- `src/background.js`: Background service worker
- `public/icons/`: Extension icons
