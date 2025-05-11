import { useState, useEffect, useMemo, useRef } from 'react';
import Button from '../ui/Button';
import ConversationItem from '../components/ConversationItem';
import ConversationBundle from '../components/ConversationBundle';
import '../styles/ui.css';

/**
 * HistoryPage – shows saved Discord conversations
 * – Dashboard metrics
 * – Search / time filters
 * – Bundled or individual view
 * – Per‑ticket delete (🗑 Clear ticket) powered by background.js → clearTicket
 */
export default function HistoryPage() {
  /* ---------------- state ---------------- */
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [timeFilter, setTimeFilter]       = useState('all');   // all | today | week | month | custom
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [viewMode, setViewMode]           = useState('bundled'); // bundled | individual
  const [copySuccess, setCopySuccess]     = useState('');
  const copyTimeoutRef                    = useRef(null);
  const [metrics, setMetrics]             = useState({
    totalConversations: 0,
    totalUsers: 0,
    activeServer: '',
    mostActiveTime: ''
  });

  /* -------------- lifecycle -------------- */
  useEffect(loadHistory, []);

  // clean up copy‑to‑clipboard timeout
  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  /* -------- helpers / storage I/O -------- */
  const ticketKeyOf = (row) => row.extraction_time || row.timestamp;

  function loadHistory() {
    setLoading(true);
    chrome.storage.local.get(['history'], ({ history: hist = [] }) => {
      setHistory(hist);
      setLoading(false);
      if (hist.length) calculateMetrics(hist);
    });
  }

  function calculateMetrics(hist) {
    const users   = new Set(hist.map(r => r.username));
    const servers = hist.reduce((acc, r) => {
      const s = r.server_name || 'Unknown';
      acc[s]  = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const activeServer = Object.keys(servers)
      .reduce((a, b) => servers[a] > servers[b] ? a : b, '');

    const hours = hist.reduce((acc, r) => {
      const h = new Date(r.timestamp).getHours();
      acc[h]  = (acc[h] || 0) + 1;
      return acc;
    }, {});
    const peakHour = Object.keys(hours)
      .reduce((a, b) => hours[a] > hours[b] ? a : b, '0');

    setMetrics({
      totalConversations: hist.length,
      totalUsers: users.size,
      activeServer,
      mostActiveTime: `${peakHour}:00 – ${+peakHour + 1}:00`
    });
  }

  /* --------- per‑ticket deleter ---------- */
  function clearTicket(key) {
    if (!window.confirm('Delete this ticket only?')) return;
    chrome.runtime.sendMessage({ action: 'clearTicket', ticketKey: key }, (resp) => {
      if (resp?.ok) {
        // optimistic UI update
        setHistory(prev => prev.filter(r => ticketKeyOf(r) !== key));
        calculateMetrics(history.filter(r => ticketKeyOf(r) !== key));
      }
    });
  }

  /* -------------- filtering -------------- */
  function matchesTimeFilter(date) {
    if (timeFilter === 'all') return true;
    const d   = new Date(date);
    const now = new Date();

    switch (timeFilter) {
      case 'today': return d.toDateString() === now.toDateString();
      case 'week':  return d >= new Date(now.setDate(now.getDate() - 7));
      case 'month': return d >= new Date(now.setMonth(now.getMonth() - 1));
      case 'custom':
        if (!startDate && !endDate) return true;
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : -Infinity;
        const end   = endDate   ? new Date(endDate).setHours(23,59,59,999) : Infinity;
        return d >= start && d <= end;
      default: return true;
    }
  }

  const filteredHistory = useMemo(
    () =>
      history.filter(r =>
        (!searchTerm ||
          r.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.server_name?.toLowerCase().includes(searchTerm.toLowerCase()))
        && matchesTimeFilter(r.timestamp)
      ),
    [history, searchTerm, timeFilter, startDate, endDate]
  );

  /* ---------- build bundles array -------- */
  const groupedConversations = useMemo(() => {
    const groups = {};
    filteredHistory.forEach((row) => {
      const key     = ticketKeyOf(row);
      const server  = row.server_name || 'Unknown Server';
      if (!groups[key]) groups[key] = { server_name: server, extractedAt: key, conversations: [] };
      groups[key].conversations.push(row);
    });
    return Object.values(groups).sort((a, b) => new Date(b.extractedAt) - new Date(a.extractedAt));
  }, [filteredHistory]);

  /* --------------- actions --------------- */
  const toggleViewMode   = () => setViewMode(v => v === 'bundled' ? 'individual' : 'bundled');
  const toggleDateRange  = () => {
    setShowDateRange(!showDateRange);
    if (!showDateRange) setTimeFilter('custom'); else setTimeFilter('all');
  };

  function clearAll() {
    if (!window.confirm('This will delete ALL saved data. Continue?')) return;
    chrome.runtime.sendMessage({ action: 'clearAll' });
    setHistory([]);
    setMetrics({ totalConversations: 0, totalUsers: 0, activeServer: '', mostActiveTime: '' });
  }

  function copyFilteredConversations() {
    const out =
      viewMode === 'bundled'
        ? groupedConversations.map(g =>
            `--- ${g.server_name} (${new Date(g.extractedAt).toLocaleString()}) ---\n\n` +
            g.conversations.map(c =>
              `${c.username} (${new Date(c.timestamp).toLocaleString()}):\n${c.content}\n\n`
            ).join('') + '-'.repeat(50) + '\n\n'
          ).join('')
        : filteredHistory.map(c =>
            `${c.username} (${new Date(c.timestamp).toLocaleString()}):\n${c.content}\n\n`
          ).join('');

    if (!out) {
      setCopySuccess('No conversations to copy');
      return;
    }

    navigator.clipboard.writeText(out)
      .then(() => {
        setCopySuccess('Copied!');
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopySuccess(''), 3000);
      })
      .catch(() => setCopySuccess('Copy failed'));
  }

  /* ---------------- render ---------------- */
  return (
    <div className="history-page">
      <h2 className="history-title luxury-heading">Conversation History</h2>

      {/* metrics */}
      <div className="dashboard-metrics">
        <div className="metric-card"><div>Total Messages</div><div>{metrics.totalConversations}</div></div>
        <div className="metric-card"><div>Total Users</div><div>{metrics.totalUsers}</div></div>
        <div className="metric-card"><div>Most Active Server</div><div>{metrics.activeServer || 'N/A'}</div></div>
        <div className="metric-card"><div>Peak Activity Time</div><div>{metrics.mostActiveTime || 'N/A'}</div></div>
      </div>

      {/* controls */}
      <div className="dashboard-controls">
        <input
          className="search-bar"
          placeholder="Search conversations…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* time filters */}
        {!showDateRange && (
          <>
            {['all','today','week','month'].map(t => (
              <Button key={t} variant="secondary"
                className={timeFilter === t ? 'active' : ''}
                onClick={() => setTimeFilter(t)}>
                {t === 'all' ? 'All Time' :
                 t === 'today' ? 'Today' :
                 t === 'week' ? 'This Week' : 'This Month'}
              </Button>
            ))}
          </>
        )}

        <Button variant="secondary" onClick={toggleDateRange}>
          {showDateRange ? 'Simple Filters' : 'Date Range'}
        </Button>

        {showDateRange && (
          <div className="date-range-controls">
            <label>From:
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <label>To:
              <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)} />
            </label>
          </div>
        )}

        <Button variant="secondary" onClick={toggleViewMode}>
          {viewMode === 'bundled' ? 'Individual View' : 'Bundled View'}
        </Button>

        <div style={{ flexGrow: 1 }} />

        <Button variant="primary" onClick={copyFilteredConversations}>Copy Results</Button>
        {copySuccess && <span className="copy-message">{copySuccess}</span>}

        <Button onClick={loadHistory} title="Refresh">⟳</Button>
        <Button variant="secondary" onClick={clearAll}>Clear All</Button>
      </div>

      {/* list */}
      {loading ? (
        <div className="loading-indicator">Loading…</div>
      ) : !filteredHistory.length ? (
        <div className="empty-state">
          <h3 className="luxury-heading">No History Found</h3>
          <p>{searchTerm ? 'No results match your search.' : 'Your history is empty.'}</p>
        </div>
      ) : viewMode === 'bundled' ? (
        <div className="history-bundles">
          {groupedConversations.map(g => (
            <ConversationBundle
              key={g.extractedAt}
              conversations={g.conversations}
              serverName={g.server_name}
              timestamp={g.extractedAt}
              onClear={() => clearTicket(g.extractedAt)}
            />
          ))}
        </div>
      ) : (
        <div className="history-grid">
          {filteredHistory.map((c, i) => (
            <ConversationItem key={i} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
