// src/components/ui/Card.jsx

import React from 'react';

function CardBase({
  children,
  className = '',
  title = '',
  icon: Icon = null,
  titleColor = 'text-gray-800',
  noPadding = false,
  noBorder = false,
  noShadow = false,
  onClick, // ✅ onClick 추가
}) {
  const safeTitle = typeof title === 'string'
    ? title
    : (title?.tierFullName ?? title?.toString?.() ?? '');

  return (
    <div
      onClick={onClick} // ✅ div에 이벤트 전달
      className={`
        bg-white 
        ${noPadding ? '' : 'p-5 sm:p-6'} 
        rounded-xl 
        ${noShadow ? '' : 'shadow-lg'} 
        ${noBorder ? '' : 'border border-gray-200'} 
        flex flex-col 
        ${className}
      `}
    >
      {safeTitle && (
        <h2 className={`text-lg sm:text-xl font-bold ${titleColor} mb-4 flex items-center gap-2`}>
          {Icon && <Icon className={`h-6 w-6 ${titleColor}`} />}
          {safeTitle}
        </h2>
      )}
      <div className="flex-grow flex flex-col">
        {children}
      </div>
    </div>
  );
}

// Subcomponents
const CardHeader = ({ children, align = 'between' }) => {
  const justifyClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[align] || 'justify-between';

  return (
    <div className={`border-b border-slate-200 pb-2 mb-4 flex items-center ${justifyClass}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children }) => (
  <h3 className="text-base font-semibold text-slate-800">
    {children}
  </h3>
);

const CardDescription = ({ children }) => (
  <p className="text-sm text-slate-500 mt-1">
    {children}
  </p>
);

const CardContent = ({ children, noPadding = false }) => (
  <div className={`flex flex-col gap-3 ${noPadding ? '' : 'p-4'}`}>
    {children}
  </div>
);

const CardFooter = ({ children, align = 'end' }) => {
  const justifyClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[align] || 'justify-end';

  return (
    <div className={`border-t border-slate-200 pt-4 mt-4 flex ${justifyClass} gap-2`}>
      {children}
    </div>
  );
};

// Object.assign으로 static 속성 부여
const Card = Object.assign(CardBase, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter
});

export default Card;
