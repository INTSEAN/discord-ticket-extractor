import Button from './Button';
import '../styles/ui.css';

/**
 * Empty state component for when there's no data to display
 * 
 * @param {Object} props
 * @param {string} props.title - Title text
 * @param {string} props.message - Message text
 * @param {function} props.onRefresh - Refresh button handler
 * @param {function} props.onHistory - History button handler
 * @param {boolean} props.autoRefresh - Whether auto-refresh is enabled
 * @param {function} props.onToggleAutoRefresh - Auto-refresh toggle handler
 * @param {function} props.onDebug - Debug button handler
 * @param {function} props.onClearAll - Clear all data button handler
 * @param {string} props.children - Additional content
 * @returns {JSX.Element}
 */
export default function EmptyState({ 
  title = 'No Transcript Opened',
  message = 'Open your ticket tool transcript in your browser to extract messages!',
  onRefresh,
  onHistory,
  autoRefresh = false,
  onToggleAutoRefresh,
  onDebug,
  onClearAll,
  children
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" fill="rgba(88, 101, 242, 0.3)"/>
        </svg>
      </div>
      <h3 className="luxury-heading">{title}</h3>
      <p>{message}</p>
      
      <div className="button-group">
        {onRefresh && (
          <Button onClick={onRefresh}>Refresh</Button>
        )}
        {onDebug && (
          <Button variant="secondary" onClick={onDebug}>Debug Info</Button>
        )}
      </div>
      
      <div className="action-buttons" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {onHistory && (
          <Button 
            variant="icon" 
            onClick={onHistory} 
            title="View History"
          >
            📜
          </Button>
        )}
        
        {onClearAll && (
          <Button 
            variant="icon" 
            onClick={onClearAll}
            title="Clear All Data"
          >
            🗑️
          </Button>
        )}
      </div>

      {onToggleAutoRefresh && (
        <div className="settings-option">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={onToggleAutoRefresh} 
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Auto-refresh (5secs)</span>
          </label>
        </div>
      )}
      
      {children}
    </div>
  );
} 