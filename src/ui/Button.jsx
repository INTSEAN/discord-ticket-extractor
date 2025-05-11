import { useState } from 'react';
import '../styles/ui.css';

/**
 * Button component that matches the luxury style from the original design
 * 
 * @param {Object} props
 * @param {string} props.variant - 'primary', 'secondary', or 'icon'
 * @param {string} props.children - Button content
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional class names
 * @param {boolean} props.wide - Whether button should be wide (for icon buttons with text)
 * @param {string} props.title - Button tooltip
 * @param {Object} props.icon - Icon component to display
 * @returns {JSX.Element}
 */
export default function Button({ 
  variant = 'primary', 
  children, 
  onClick, 
  className = '', 
  wide = false,
  title,
  icon,
  ...props
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => isPressed && setIsPressed(false);

  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'primary-button';
      case 'secondary': return 'secondary-button';
      case 'icon': return 'icon-button';
      default: return 'primary-button';
    }
  };

  return (
    <button
      className={`${getVariantClass()} ${wide ? 'wide-button' : ''} ${className}`}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={title}
      {...props}
    >
      {children}
      {icon && <span className="button-icon">{icon}</span>}
    </button>
  );
} 