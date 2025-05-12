import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationItem from './ConversationItem';
import Button from '../ui/Button';
import '../styles/ui.css';

/**
 * ConversationBundle component for displaying a group of related conversations
 * Shows a compact view by default and expands to detailed view on hover
 * Uses Framer Motion for animations
 * 
 * @param {Object} props
 * @param {Array} props.conversations - Array of conversation objects in the bundle
 * @param {string} props.serverName - Name of the server
 * @param {string} props.timestamp - Timestamp when the bundle was extracted
 * @param {function} props.onClick - Click handler for the bundle
 * @param {string} props.className - Additional class names
 * @returns {JSX.Element}
 */
export default function ConversationBundle({
  conversations = [],
  serverName = 'Unknown Server',
  timestamp = '',
  onClick,
  className = '',
  onClear = null
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get message count and first message for preview
  const messageCount = conversations.length;
  const firstMessage = conversations[0] || { username: '', content: '', timestamp: '' };
  
  // Format the timestamp for display
  const formattedDate = timestamp 
    ? new Date(timestamp).toLocaleString() 
    : 'Unknown Date';
  
  // Get a preview of the conversation
  const previewContent = firstMessage.content.length > 100
    ? `${firstMessage.content.substring(0, 100)}...`
    : firstMessage.content;
  
  // Handle mouse events
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  
  // Handle click to toggle expanded state
  const handleClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    
    if (onClick) {
      onClick(conversations);
    }
  };
  
  // Handle view all messages
  const handleViewAll = (e) => {
    e.stopPropagation();
    setIsExpanded(true);
  };
  
  // Framer Motion variants
  const containerVariants = {
    compact: {
      height: 'auto',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    expanded: {
      height: 'auto',
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  };
  
  const headerVariants = {
    normal: {
      backgroundColor: 'var(--luxury-background-dark)',
      transition: { duration: 0.2 }
    },
    hovered: {
      backgroundColor: 'rgba(197, 164, 126, 0.15)',
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className={`conversation-bundle ${className}`}
      variants={containerVariants}
      initial="compact"
      animate={isExpanded ? "expanded" : "compact"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(197, 164, 126, 0.1)'
      }}
    >
      {/* Bundle Header */}
      <motion.div 
        className="bundle-header"
        variants={headerVariants}
        animate={isHovered ? "hovered" : "normal"}
        style={{
          padding: '16px',
          borderBottom: isExpanded ? '1px solid rgba(197, 164, 126, 0.1)' : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div>
          <h3 className="luxury-heading" style={{ margin: 0, fontSize: '18px', color: 'var(--luxury-gold)' }}>
            {serverName}
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--discord-muted)' }}>
            {formattedDate} • {messageCount} message{messageCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ───────── Right‑side controls: trash + chevron ───────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Per‑ticket delete */}
          {onClear && (
            <Button
              variant="icon"
              title="Delete this ticket"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              🗑
            </Button>
          )}

          {/* Chevron (expand / collapse) */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--luxury-gold)">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </motion.div>
        </div>

      </motion.div>
      
      {/* Preview Content (shown when not expanded) */}
      {!isExpanded && (
        <div className="bundle-preview" style={{ padding: '0 16px 16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div className="username">{firstMessage.username}</div>
            <div className="timestamp" style={{ fontSize: '12px', color: 'var(--discord-muted)' }}>
              {firstMessage.timestamp}
            </div>
          </div>
          <div className="message-preview" style={{ color: 'var(--luxury-text)' }}>
            {previewContent}
          </div>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <Button variant="secondary" onClick={handleViewAll}>
              View All Messages
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Content (shown when expanded) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="bundle-expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '0 16px 16px' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 