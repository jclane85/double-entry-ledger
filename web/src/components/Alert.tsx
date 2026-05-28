import React from 'react';

interface Props {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

const colors: Record<string, React.CSSProperties> = {
  error:   { background: '#fff1f0', border: '1px solid #ffccc7', color: '#a8071a' },
  success: { background: '#f6ffed', border: '1px solid #b7eb8f', color: '#237804' },
  warning: { background: '#fffbe6', border: '1px solid #ffe58f', color: '#876800' },
  info:    { background: '#e6f7ff', border: '1px solid #91d5ff', color: '#0050b3' },
};

export function Alert({ message, type = 'info' }: Props) {
  return (
    <div style={{ ...colors[type], borderRadius: 6, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
      {message}
    </div>
  );
}
