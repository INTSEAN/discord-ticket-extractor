import '../styles/ui.css';

/**
 * Component for displaying a single message in a conversation
 * 
 * @param {Object} props
 * @param {string} props.username - Username of the message sender
 * @param {string} props.timestamp - Timestamp of the message
 * @param {string} props.content - Content of the message
 * @param {string} props.className - Additional class names
 * @returns {JSX.Element}
 */
export default function ConversationItem({
  username,
  timestamp,
  content,
  className = ''
}) {
  return (
    <div className={`conversation-item ${className}`}>
      <div className="message-header">
        <div className="username">{username}</div>
        <div className="timestamp">{timestamp}</div>
      </div>
      <div className="message-content">{content}</div>
    </div>
  );
} 