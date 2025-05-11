import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationItem from './ConversationItem';
import Button from '../ui/Button';
import '../styles/ui.css';

/**
 * ConversationBundle – collapsible card that groups one ticket’s messages.
 * Props:
 *   conversations[]          – rows for this ticket
 *   serverName               – Discord server
 *   timestamp                – extraction_time key
 *   onClear? function        – if supplied, shows 🗑 button
 *   onClick? function        – optional external click handler
 */
export default function ConversationBundle({
  conversations = [],
  serverName = 'Unknown Server',
  timestamp = '',
  onClear = null,
  onClick,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered,  setIsHovered]  = useState(false);

  /* ---------- derived ---------- */
  const messageCount  = conversations.length;
  const firstMessage  = conversations[0] ?? { username: '', content: '', timestamp: '' };
  const formattedDate = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown Date';
  const preview       = firstMessage.content.length > 100
                       ? firstMessage.content.slice(0, 100) + '…'
                       : firstMessage.content;

  /* ---------- handlers --------- */
  const handleToggle   = (e) => { e.stopPropagation(); setIsExpanded(x => !x); onClick?.(conversations); };
  const handleViewAll  = (e) => { e.stopPropagation(); setIsExpanded(true); };

  /* ---------- motion variants -- */
  const containerV = { compact:{}, expanded:{} };
  const headerV    = {
    normal:{ backgroundColor:'var(--luxury-background-dark)' },
    hover :{ backgroundColor:'rgba(197,164,126,0.15)' }
  };

  return (
    <motion.div
      className={`conversation-bundle ${className}`}
      variants={containerV}
      initial="compact"
      animate={isExpanded ? 'expanded' : 'compact'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleToggle}
      style={{
        cursor: 'pointer',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        border: '1px solid rgba(197,164,126,0.1)'
      }}
    >
      {/* header */}
      <motion.div
        className="bundle-header"
        variants={headerV}
        animate={isHovered ? 'hover' : 'normal'}
        style={{
          padding: 16,
          borderBottom: isExpanded ? '1px solid rgba(197,164,126,0.1)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <div style={{ flexGrow: 1 }}>
          <h3 className="luxury-heading" style={{ margin: 0, fontSize: 18, color: 'var(--luxury-gold)' }}>
            {serverName}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--discord-muted)' }}>
            {formattedDate} • {messageCount} message{messageCount !== 1 && 's'}
          </div>
        </div>

        {/* per‑ticket delete */}
        {onClear && (
          <Button
            variant="icon"
            title="Delete this ticket"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{ marginRight: 8 }}
          >
            🗑
          </Button>
        )}

        {/* chevron */}
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--luxury-gold)">
            <path d="M7.41 8.59 12 13.17 16.59 8.59 18 10l-6 6-6-6z" />
          </svg>
        </motion.div>
      </motion.div>

      {/* preview (collapsed) */}
      {!isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div>{firstMessage.username}</div>
            <div style={{ fontSize:12, color:'var(--discord-muted)' }}>{firstMessage.timestamp}</div>
          </div>
          <div style={{ color:'var(--luxury-text)' }}>{preview}</div>
          <div style={{ textAlign:'center', marginTop:12 }}>
            <Button variant="secondary" onClick={handleViewAll}>View All Messages</Button>
          </div>
        </div>
      )}

      {/* expanded list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            transition={{ duration:0.3 }}
            style={{ padding:'0 16px 16px' }}
          >
            {conversations.map((c,i) => (
              <ConversationItem key={i} username={c.username} timestamp={c.timestamp} content={c.content} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
