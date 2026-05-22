import { useCallback, useMemo, useRef } from "react";


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

export interface RequestManager {
  getRequestKey: (type: string, fieldId: string) => RequestKey;
  isRequestInFlight: (key: RequestKey) => boolean;
  createRequest: (key: RequestKey) => { requestId: string; controller: AbortController };
  completeRequest: (key: RequestKey) => void;
  cancelRequest: (key: RequestKey) => void;
  cancelAll: () => void;
  getActiveRequests: () => string[];
}

export const createRequestManager = (): RequestManager => {
  const state: RequestManagerState = { requests: new Map() };

  const getRequestKey = (type: string, fieldId: string): RequestKey => {
    return `${type}:${fieldId}`;
  };

  const isRequestInFlight = (key: RequestKey): boolean => {
    return state.requests.has(key);
  };

  const createRequest = (key: RequestKey): { requestId: string; controller: AbortController } => {
    const previous = state.requests.get(key);
    if (previous) {
      previous.controller.abort();
    }

    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    const request: ManagedRequest = {
      requestId,
      controller,
      createdAt: Date.now(),
    };

    state.requests.set(key, request);

    return { requestId, controller };
  };

  const completeRequest = (key: RequestKey): void => {
    state.requests.delete(key);
  };

  const cancelRequest = (key: RequestKey): void => {
    const request = state.requests.get(key);
    if (request) {
      request.controller.abort();
      state.requests.delete(key);
    }
  };

  const cancelAll = (): void => {
    Array.from(state.requests.values()).forEach((request) => {
      request.controller.abort();
    });
    state.requests.clear();
  };

  const getActiveRequests = (): string[] => {
    return Array.from(state.requests.values()).map((request) => request.requestId);
  };

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

export const useRequestManager = () => {
  const managerRef = useRef<RequestManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = createRequestManager();
  }

  const { getRequestKey, isRequestInFlight, createRequest, completeRequest, cancelRequest, cancelAll, getActiveRequests } = managerRef.current;

  return useMemo(() => ({
    getRequestKey,
    isRequestInFlight,
    createRequest,
    completeRequest,
    cancelRequest,
    cancelAll,
    getActiveRequests,
  }), [getRequestKey, isRequestInFlight, createRequest, completeRequest, cancelRequest, cancelAll, getActiveRequests]);
};
