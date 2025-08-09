import React from 'react';

const Input = ({ value, onChange, placeholder, className = '', ...props }) => (
    <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2 text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${className}`}
        {...props}
    />
);

export default Input;
