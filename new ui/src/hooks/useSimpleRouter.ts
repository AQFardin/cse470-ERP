import { useState, useEffect } from 'react';

// Simplified client-side router
export interface RouterState {
  path: string;
  navigate: (newPath: string) => void;
  params: Record<string, string>;
}

export function useSimpleRouter(): RouterState {
  const [path, setPath] = useState<string>(() => {
    // Read from window location path if it's there, or default to '/'
    const hash = window.location.hash;
    if (hash.startsWith('#')) {
      return hash.substring(1) || '/';
    }
    return window.location.pathname || '/';
  });

  const navigate = (newPath: string) => {
    window.location.hash = newPath;
    setPath(newPath);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#')) {
        setPath(hash.substring(1) || '/');
      } else {
        setPath(window.location.pathname || '/');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Parse parameters (e.g. /employees/:id -> /employees/EMP001)
  const params: Record<string, string> = {};
  
  if (path.startsWith('/employees/') && path !== '/employees/new') {
    const parts = path.split('/');
    if (parts.length > 2) {
      params.id = parts[2];
    }
  }

  return {
    path,
    navigate,
    params,
  };
}
