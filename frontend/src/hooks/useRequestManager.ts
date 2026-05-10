import { useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * Manages in-flight AI requests with deduplication and cancellation.
 * Prevents duplicate concurrent requests and allows cancellation of previous requests.
 */

export type RequestKey = string;

export interface ManagedRequest {
  requestId: string;
  controller: AbortController;
  createdAt: number;
}

interface RequestManagerState {
  requests: Map<RequestKey, ManagedRequest>;
}

export const useRequestManager = () => {
  const stateRef = useRef<RequestManagerState>({ requests: new Map() });

  /**
   * Generate a unique key for deduplication based on request parameters.
   * Example: "improve-text:experience" for improving experience section
   */
  const getRequestKey = useCallback((type: string, fieldId: string): RequestKey => {
    return `${type}:${fieldId}`;
  }, []);

  /**
   * Check if a request is already in-flight.
   */
  const isRequestInFlight = useCallback(
    (key: RequestKey): boolean => {
      return stateRef.current.requests.has(key);
    },
    []
  );

  /**
   * Create a new managed request. Cancels any previous request with the same key.
   * Returns the request ID and AbortController for the new request.
   */
  const createRequest = useCallback(
    (key: RequestKey): { requestId: string; controller: AbortController } => {
      // Cancel previous request with same key if it exists
      const previous = stateRef.current.requests.get(key);
      if (previous) {
        previous.controller.abort();
      }

      const requestId = uuidv4();
      const controller = new AbortController();
      const request: ManagedRequest = {
        requestId,
        controller,
        createdAt: Date.now(),
      };

      stateRef.current.requests.set(key, request);

      return { requestId, controller };
    },
    []
  );

  /**
   * Clean up a completed request (success or error).
   */
  const completeRequest = useCallback((key: RequestKey): void => {
    stateRef.current.requests.delete(key);
  }, []);

  /**
   * Cancel a request and remove it from tracking.
   */
  const cancelRequest = useCallback((key: RequestKey): void => {
    const request = stateRef.current.requests.get(key);
    if (request) {
      request.controller.abort();
      stateRef.current.requests.delete(key);
    }
  }, []);

  /**
   * Cancel all in-flight requests. Useful on unmount or navigation.
   */
  const cancelAll = useCallback((): void => {
    stateRef.current.requests.forEach((request) => {
      request.controller.abort();
    });
    stateRef.current.requests.clear();
  }, []);

  /**
   * Get all in-flight request IDs for debugging.
   */
  const getActiveRequests = useCallback((): string[] => {
    return Array.from(stateRef.current.requests.values()).map((r) => r.requestId);
  }, []);

  return {
    getRequestKey,
    isRequestInFlight,
    createRequest,
    completeRequest,
    cancelRequest,
    cancelAll,
    getActiveRequests,
  };
};
