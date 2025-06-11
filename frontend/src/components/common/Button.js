// frontend/src/components/common/Button.js
import React from 'react';

function Button({ children, onClick, type = 'button', className = '', small = false, disabled = false }) {
  const baseStyle = `inline-flex items-center justify-center font-bold border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 ease-in-out`;
  const sizeStyle = small ? `px-3 py-1.5 text-sm` : `px-4 py-2 text-base`;
  const disabledStyle = disabled ? `opacity-50 cursor-not-allowed` : ``;

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${sizeStyle} ${className} ${disabledStyle}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
