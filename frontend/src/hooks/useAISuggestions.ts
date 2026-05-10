import { useCallback, useEffect, useRef, useState } from "react";
import type { AiGrammarResult, AiRewriteResult, AiTone } from "@/types/resume-types";
import { useRequestManager } from "./useRequestManager";

/**
 * Hook for debounced AI suggestion requests with automatic deduplication and cancellation.
 * Prevents excessive API calls and cancels previous requests when new ones are initiated.
 */

export interface SuggestionState {
  loading: boolean;
  error: string | null;
  requestId: string | null;
}

interface DebounceConfig {
  debounceMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_CONFIG: Required<DebounceConfig> = {
  debounceMs: 500,
  timeoutMs: 8000,
  maxRetries: 2,
};

export const useAISuggestions = (config: DebounceConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const requestManager = useRequestManager();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  const [suggestions, setSuggestions] = useState<AiRewriteResult | AiGrammarResult | null>(null);
  const [state, setState] = useState<SuggestionState>({
    loading: false,
    error: null,
    requestId: null,
  });

  /**
   * Clean up debounce timer on unmount.
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      requestManager.cancelAll();
    };
  }, [requestManager]);

  /**
   * Fetch suggestions from backend with retry logic and timeout.
   */
  const fetchWithRetry = useCallback(
    async (
      endpoint: string,
      body: Record<string, unknown>,
      requestKey: string,
      currentRetry: number = 0
    ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
      const { requestId, controller } = requestManager.createRequest(requestKey);

      setState({ loading: true, error: null, requestId });

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout")),
            finalConfig.timeoutMs
          )
        );

        const fetchPromise = fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
          },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify(body),
        });

        const response = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Response;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as Record<string, unknown>)?.message || `HTTP ${response.status}`
          );
        }

        const data = await response.json();
        setSuggestions(data);
        setState({ loading: false, error: null, requestId });
        requestManager.completeRequest(requestKey);
        return { success: true, data };
      } catch (error) {
        const isAborted = error instanceof Error && error.name === "AbortError";
        const isTimeout = error instanceof Error && error.message === "Request timeout";
        const errorMsg = error instanceof Error ? error.message : "Unknown error";

        // Don't retry on abort or network errors; do retry on timeout
        if (isAborted) {
          requestManager.completeRequest(requestKey);
          return { success: false, error: "Request cancelled" };
        }

        // Retry on timeout or 5xx errors
        if (
          (isTimeout || (error instanceof Error && errorMsg.includes("5"))) &&
          currentRetry < finalConfig.maxRetries
        ) {
          retryCountRef.current.set(requestKey, currentRetry + 1);
          // Exponential backoff: 100ms, 300ms, 900ms
          const backoffMs = Math.pow(3, currentRetry) * 100;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          return fetchWithRetry(endpoint, body, requestKey, currentRetry + 1);
        }

        setState({ loading: false, error: errorMsg, requestId });
        requestManager.completeRequest(requestKey);
        return { success: false, error: errorMsg };
      }
    },
    [requestManager, finalConfig]
  );

  /**
   * Request suggestions with debouncing and deduplication.
   * Automatically cancels previous request if a new one is initiated.
   */
  const requestSuggestions = useCallback(
    (endpoint: string, body: Record<string, unknown>, fieldId: string) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const requestKey = requestManager.getRequestKey(endpoint.split("/").pop() || "unknown", fieldId);

      // Skip if request already in-flight
      if (requestManager.isRequestInFlight(requestKey)) {
        return;
      }

      // Debounce the actual request
      debounceTimerRef.current = setTimeout(() => {
        retryCountRef.current.set(requestKey, 0);
        void fetchWithRetry(endpoint, body, requestKey);
      }, finalConfig.debounceMs);
    },
    [requestManager, finalConfig, fetchWithRetry]
  );

  /**
   * Cancel pending suggestion requests.
   */
  const cancelSuggestions = useCallback(
    (fieldId: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Cancel by field ID (the hook doesn't directly know the request key)
      requestManager.cancelAll();
      setSuggestions(null);
      setState({ loading: false, error: null, requestId: null });
    },
    [requestManager]
  );

  return {
    suggestions,
    state,
    requestSuggestions,
    cancelSuggestions,
    getActiveRequests: requestManager.getActiveRequests,
  };
};
