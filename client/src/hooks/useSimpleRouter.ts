import { useEffect, useState } from "react";

export interface RouterState {
  path: string;
  navigate: (newPath: string) => void;
  params: Record<string, string>;
}

function getCurrentPath(): string {
  const hash = window.location.hash;

  if (hash.startsWith("#/")) {
    return hash.substring(1) || "/";
  }

  if (hash === "#") {
    return "/";
  }

  return window.location.pathname || "/";
}

export function useSimpleRouter(): RouterState {
  const [path, setPath] = useState<string>(getCurrentPath);

  const navigate = (newPath: string) => {
    // Make sure the path always starts with /
    const normalizedPath = newPath.startsWith("/")
      ? newPath
      : `/${newPath}`;

    // Update browser URL
    window.location.hash = normalizedPath;

    // Immediately update React state
    setPath(normalizedPath);
  };

  useEffect(() => {
    const handleHashChange = () => {
      setPath(getCurrentPath());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const params: Record<string, string> = {};

  // /employees/:id
  if (path.startsWith("/employees/") && path !== "/employees/new") {
    const parts = path.split("/");

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