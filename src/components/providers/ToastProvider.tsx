'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#333',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '14px',
        },
        // Phase 2c (#224): general single-meaning semantics → trendy tokens.
        success: {
          duration: 3000,
          iconTheme: {
            primary: 'var(--success)',
            secondary: '#fff',
          },
          style: {
            border: '1px solid var(--success)',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: 'var(--danger)',
            secondary: '#fff',
          },
          style: {
            border: '1px solid var(--danger)',
          },
        },
        loading: {
          iconTheme: {
            primary: '#8b5cf6',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #8b5cf6',
          },
        },
      }}
    />
  );
}
