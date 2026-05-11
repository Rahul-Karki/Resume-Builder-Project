import { Request, Response, NextFunction } from "express";
import { logger } from "../observability";
import { cacheGet, cacheSet } from "../utils/redis";
import { createTextHash } from "../utils/hashUtils";

export interface DeduplicationOptions {
  ttlSeconds?: number;
  scope?: string;
  maxCacheSize?: number;
}

const DEFAULT_OPTIONS: Required<DeduplicationOptions> = {
  ttlSeconds: 300, // 5 minutes
  scope: "ai-request",
  maxCacheSize: 1000,
};

/**
 * Middleware to prevent duplicate AI requests for identical content.
 * Reduces AI API calls and improves response times for repeated requests.
 */
export const deduplicationMiddleware = (options: DeduplicationOptions = {}) => {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const requestId = String(req.headers["x-request-id"] || "");
    const userId = req.user?.id || "anonymous";
    
    try {
      // Skip deduplication for non-AI routes or if cache is disabled
      if (!isAiRequest(req) || finalOptions.ttlSeconds <= 0) {
        return next();
      }
      
      // Create unique cache key based on request content
      const cacheKey = createDeduplicationKey(req, finalOptions.scope);
      
      logger.debug({
        requestId,
        userId,
        cacheKey,
        scope: finalOptions.scope,
      }, "Checking for duplicate request");
      
      // Check if identical request was made recently
      const cachedResponse = await cacheGet(cacheKey);
      if (cachedResponse) {
        logger.info({
          requestId,
          userId,
          cacheKey,
          scope: finalOptions.scope,
        }, "Duplicate request found - returning cached response");
        
        // Return cached response with appropriate headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': String(finalOptions.ttlSeconds),
        });
        
        return res.status(200).json(JSON.parse(cachedResponse));
      }
      
      // Store original res.json to capture response
      const originalJson = res.json.bind(res);
      
      res.json = function (body: any) {
        // Only cache successful responses (status 200)
        if (res.statusCode === 200) {
          void cacheResponse(cacheKey, body, finalOptions.ttlSeconds, finalOptions.maxCacheSize);
          logger.debug({
            requestId,
            userId,
            cacheKey,
            scope: finalOptions.scope,
          }, "Response cached for future deduplication");
        }
        
        // Call original json method
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      logger.error({
        requestId,
        userId,
        error: error instanceof Error ? error.message : String(error),
        scope: finalOptions.scope,
      }, "Deduplication middleware error");
      
      // Don't fail the request if deduplication fails
      next();
    }
  };
};

/**
 * Check if request is an AI request that should be deduplicated.
 */
const isAiRequest = (req: Request): boolean => {
  const aiPaths = [
    '/api/ai/improve-text',
    '/api/ai/check-grammar', 
    '/api/ai/enhance-bullet',
    '/api/ai/ats-analysis'
  ];
  
  return aiPaths.some(path => req.path.startsWith(path));
};

/**
 * Create unique cache key for deduplication.
 */
const createDeduplicationKey = (req: Request, scope: string): string => {
  const userId = req.user?.id || "anonymous";
  const text = String(req.body?.text || "");
  const section = String(req.body?.section || "");
  const operation = req.path.split('/').pop() || "unknown";
  
  // Create hash of request content for consistent keying
  const contentHash = createTextHash(`${operation}:${section}:${text}`);
  
  return `dedup:${scope}:${userId}:${contentHash}`;
};

/**
 * Cache response with size limiting.
 */
const cacheResponse = async (
  key: string, 
  response: any, 
  ttlSeconds: number,
  maxSize: number
): Promise<void> => {
  try {
    // Simple size check - don't cache excessively large responses
    const responseSize = JSON.stringify(response).length;
    if (responseSize > 50 * 1024) { // 50KB limit
      logger.debug({ key, size: responseSize }, "Response too large to cache");
      return;
    }
    
    await cacheSet(key, JSON.stringify(response), ttlSeconds);
  } catch (error) {
    logger.warn({
      key,
      error: error instanceof Error ? error.message : String(error),
    }, "Failed to cache response");
  }
};

/**
 * Create a simplified deduplication middleware for specific operations.
 */
export const createOperationDeduplication = (operation: string, ttlSeconds: number = 300) => {
  return deduplicationMiddleware({
    scope: `ai-${operation}`,
    ttlSeconds,
  });
};
