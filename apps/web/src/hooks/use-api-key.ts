"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "signaldesk_api_key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setApiKeyState(stored);
    setIsLoading(false);
  }, []);

  const setApiKey = useCallback((key: string | null) => {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKeyState(key);
  }, []);

  return { apiKey, setApiKey, isLoading };
}
