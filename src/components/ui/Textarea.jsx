// src/components/ui/Textarea.jsx
import React from 'react';

const Textarea = React.forwardRef(({ className = '', rows = 4, ...props }, ref) => (
    <textarea
        ref={ref}
        rows={rows}
        className={`
      w-full
      border border-slate-300
      rounded-md
      p-2
      text-sm
      focus:outline-none
      focus:ring-2
      focus:ring-blue-300
      ${className}
    `}
        {...props}
    />
));

Textarea.displayName = 'Textarea';

export default Textarea;
