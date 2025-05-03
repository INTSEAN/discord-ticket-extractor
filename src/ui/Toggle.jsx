import '../styles/ui.css';

/**
 * Toggle switch component that matches the luxury style from the original design
 * 
 * @param {Object} props
 * @param {boolean} props.checked - Whether the toggle is checked
 * @param {function} props.onChange - Change handler
 * @param {string} props.label - Label text
 * @param {string} props.className - Additional class names
 * @returns {JSX.Element}
 */
export default function Toggle({ 
  checked = false, 
  onChange, 
  label, 
  className = '',
  ...props
}) {
  return (
    <label className={`toggle-switch ${className}`}>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange}
        {...props}
      />
      <span className="toggle-slider"></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
} 