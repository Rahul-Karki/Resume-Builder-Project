/**
 * Token counting utilities for AI models.
 * Provides rough token estimates for both OpenAI and Gemini models.
 * Note: These are approximations. For precise counts, use provider-specific APIs.
 */

/**
 * Rough token count: approximately 1 token per 4 characters (English text)
 * This is a general approximation that works for both OpenAI and Gemini.
 */
export const estimateTokenCount = (text: string): number => {
  // Remove extra whitespace
  const normalized = text.trim();
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(normalized.length / 4);
};

/**
 * Token count for JSON-encoded content (includes JSON structure overhead)
 */
export const estimateJsonTokenCount = (obj: unknown): number => {
  const json = JSON.stringify(obj);
  return estimateTokenCount(json);
};

/**
 * Count tokens in OpenAI API request format.
 * Formula: input tokens + output tokens
 */
export const countOpenAITokens = (
  systemPrompt: string,
  userPrompt: string,
  responseText: string
): { input: number; output: number; total: number } => {
  const systemTokens = estimateTokenCount(systemPrompt);
  const userTokens = estimateTokenCount(userPrompt);
  const outputTokens = estimateTokenCount(responseText);

  // Add overhead for message structure (~10 tokens per message)
  const inputTokens = systemTokens + userTokens + 20;
  const totalTokens = inputTokens + outputTokens;

  return {
    input: inputTokens,
    output: outputTokens,
    total: totalTokens,
  };
};

/**
 * Count tokens in Google Gemini API request format.
 * Similar structure to OpenAI but slightly different overhead.
 */
export const countGeminiTokens = (
  systemPrompt: string,
  userPrompt: string,
  responseText: string
): { input: number; output: number; total: number } => {
  const systemTokens = estimateTokenCount(systemPrompt);
  const userTokens = estimateTokenCount(userPrompt);
  const outputTokens = estimateTokenCount(responseText);

  // Gemini has similar message overhead
  const inputTokens = systemTokens + userTokens + 20;
  const totalTokens = inputTokens + outputTokens;

  return {
    input: inputTokens,
    output: outputTokens,
    total: totalTokens,
  };
};

/**
 * Token usage tracking record for logging and cost calculation.
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  provider: "openai" | "gemini" | "fallback";
  model: string;
  cost?: {
    input: number; // Cost in USD
    output: number;
    total: number;
  };
}

/**
 * Calculate cost based on token usage and model pricing.
 * Prices current as of knowledge cutoff; update as needed.
 */
export const calculateAICost = (
  tokens: { input: number; output: number },
  provider: "openai" | "gemini",
  model: string
): { input: number; output: number; total: number } => {
  if (provider === "openai") {
    // OpenAI pricing (as of 2024)
    // gpt-4o: $5/M input, $15/M output
    // gpt-4o-mini: $0.15/M input, $0.60/M output
    const isGpt4o = model.includes("gpt-4o-mini") ? false : true;

    const inputPrice = isGpt4o ? 0.000005 : 0.00000015;
    const outputPrice = isGpt4o ? 0.000015 : 0.0000006;

    return {
      input: tokens.input * inputPrice,
      output: tokens.output * outputPrice,
      total: tokens.input * inputPrice + tokens.output * outputPrice,
    };
  }

  if (provider === "gemini") {
    // Gemini pricing (as of 2024)
    // gemini-2.0-flash: $0.075/M input, $0.30/M output
    const inputPrice = 0.000000075;
    const outputPrice = 0.0000003;

    return {
      input: tokens.input * inputPrice,
      output: tokens.output * outputPrice,
      total: tokens.input * inputPrice + tokens.output * outputPrice,
    };
  }

  return { input: 0, output: 0, total: 0 };
};

/**
 * Format cost as USD string for logging.
 */
export const formatCost = (cost: number): string => {
  if (cost < 0.00001) {
    return "< $0.00001";
  }
  return `$${cost.toFixed(5)}`;
};
