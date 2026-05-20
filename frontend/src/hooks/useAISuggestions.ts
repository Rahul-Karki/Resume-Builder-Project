import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type AiRequestOptions = {
  signal: AbortSignal;
  timeoutMs: number;
  requestId: string;
};

export type AiRequestFn<T = unknown> = (body: Record<string, unknown>, options: AiRequestOptions) => Promise<T>;

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
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
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
    async function fetchWithRetryInner(
      requestFn: AiRequestFn,
      body: Record<string, unknown>,
      requestKey: string,
      currentRetry: number = 0
    ): Promise<{ success: boolean; data?: unknown; error?: string }> {
      const { requestId, controller } = requestManager.createRequest(requestKey);

      setState({ loading: true, error: null, requestId });

      try {
        const data = await requestFn(body, {
          signal: controller.signal,
          timeoutMs: finalConfig.timeoutMs,
          requestId,
        });
        setSuggestions(data);
        setState({ loading: false, error: null, requestId });
        requestManager.completeRequest(requestKey);
        return { success: true, data };
      } catch (error) {
        const axiosErr = error as { code?: string; message?: string; response?: { status?: number; data?: unknown } };
        const isAborted = axiosErr?.code === "ERR_CANCELED" || (error instanceof Error && error.name === "AbortError");
        const isTimeout = axiosErr?.code === "ECONNABORTED" || axiosErr?.message === "Request timeout";
        const status = axiosErr?.response?.status;
        const errorMsg = axiosErr?.message || "Unknown error";

        if (isAborted) {
          requestManager.completeRequest(requestKey);
          return { success: false, error: "Request cancelled" };
        }

        // Retry on timeout or 5xx errors (only if we haven't exhausted retries)
        if (
          (isTimeout || (status && status >= 500)) &&
          currentRetry < finalConfig.maxRetries
        ) {
          retryCountRef.current.set(requestKey, currentRetry + 1);
          const backoffMs = Math.pow(3, currentRetry) * 100;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          return fetchWithRetryInner(requestFn, body, requestKey, currentRetry + 1);
        }

        // Use server message if available, otherwise the generic message
        const displayMsg = axiosErr?.response?.data && typeof axiosErr.response.data === 'object'
          ? String((axiosErr.response.data as Record<string, unknown>)?.message ?? errorMsg)
          : errorMsg;

        setState({ loading: false, error: displayMsg, requestId });
        requestManager.completeRequest(requestKey);
        return { success: false, error: displayMsg };
      }
    },
    [requestManager, finalConfig]
  );

  /**
   * Request suggestions with debouncing and deduplication.
   * Automatically cancels previous request if a new one is initiated.
   */
  const requestSuggestions = useCallback(
    (requestFn: AiRequestFn, body: Record<string, unknown>, fieldId: string, requestType: string) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const requestKey = requestManager.getRequestKey(requestType, fieldId);

      // Skip if request already in-flight
      if (requestManager.isRequestInFlight(requestKey)) {
        return;
      }

      // Debounce the actual request
      debounceTimerRef.current = setTimeout(() => {
        retryCountRef.current.set(requestKey, 0);
        void fetchWithRetry(requestFn, body, requestKey);
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
