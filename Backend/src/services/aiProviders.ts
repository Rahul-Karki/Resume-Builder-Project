/**
 * AI Provider Abstraction Layer
 * Enables easy integration of multiple AI providers (OpenAI, Gemini, Claude, etc.)
 * Provides a unified interface for AI operations regardless of the underlying provider.
 */

export type AiProviderType = "openai" | "gemini" | "claude" | "anthropic" | "custom";

export interface TokenUsageInfo {
  input: number;
  output: number;
  total: number;
}

export interface AiProviderConfig {
  name: AiProviderType;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  temperature?: number;
}

export interface AiProviderResponse<T> {
  data: T;
  tokens: TokenUsageInfo;
  model: string;
  timestamp: number;
}

/**
 * Abstract base class for AI providers.
 * Subclass this to add new AI providers.
 */
export abstract class BaseAiProvider {
  protected config: AiProviderConfig;
  protected lastError: Error | null = null;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  /**
   * Generate structured JSON response from AI.
   * Should implement provider-specific logic for JSON mode.
   */
  abstract generateStructuredResponse<T>(
    systemPrompt: string,
    userPrompt: string,
    schema?: Record<string, unknown>
  ): Promise<AiProviderResponse<T>>;

  /**
   * Generate text response from AI (not necessarily JSON).
   */
  abstract generateTextResponse(
    systemPrompt: string,
    userPrompt: string
  ): Promise<AiProviderResponse<string>>;

  /**
   * Check if provider is available and credentials are valid.
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get provider name.
   */
  getName(): AiProviderType {
    return this.config.name;
  }

  /**
   * Get last error (if any).
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Validate configuration.
   */
  protected validateConfig(): boolean {
    if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
      throw new Error(`${this.config.name} API key is required`);
    }
    return true;
  }

  /**
   * Apply timeout to async operation.
   */
  protected withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
      ),
    ]);
  }

  /**
   * Implement retry logic with exponential backoff.
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retries || 2
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors
        if (lastError.message.includes("400") || lastError.message.includes("validation")) {
          throw lastError;
        }

        // Exponential backoff
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 100;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    this.lastError = lastError;
    throw lastError;
  }
}

/**
 * Factory for creating AI provider instances.
 */
export class AiProviderFactory {
  private static providers: Map<AiProviderType, new (config: AiProviderConfig) => BaseAiProvider> = new Map();

  /**
   * Register a new provider type.
   */
  static registerProvider(
    type: AiProviderType,
    ProviderClass: new (config: AiProviderConfig) => BaseAiProvider
  ) {
    this.providers.set(type, ProviderClass);
  }

  /**
   * Create a provider instance.
   */
  static createProvider(config: AiProviderConfig): BaseAiProvider {
    const ProviderClass = this.providers.get(config.name);

    if (!ProviderClass) {
      throw new Error(
        `Unknown AI provider: ${config.name}. Registered providers: ${Array.from(this.providers.keys()).join(", ")}`
      );
    }

    return new ProviderClass(config);
  }

  /**
   * Get list of registered providers.
   */
  static getRegisteredProviders(): AiProviderType[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * AI Provider Manager - handles multiple providers with fallback logic.
 */
export class AiProviderManager {
  private providers: Map<AiProviderType, BaseAiProvider> = new Map();
  private preferredProvider: AiProviderType;
  private fallbackProviders: AiProviderType[] = [];

  constructor(
    providers: BaseAiProvider[],
    preferredProvider: AiProviderType,
    fallbackProviders: AiProviderType[] = []
  ) {
    providers.forEach((provider) => {
      this.providers.set(provider.getName(), provider);
    });

    this.preferredProvider = preferredProvider;
    this.fallbackProviders = fallbackProviders;
  }

  /**
   * Generate structured response with automatic fallback.
   */
  async generateStructuredResponseWithFallback<T>(
    systemPrompt: string,
    userPrompt: string,
    schema?: Record<string, unknown>
  ): Promise<{ response: AiProviderResponse<T>; provider: AiProviderType }> {
    const providersToTry = [
      this.preferredProvider,
      ...this.fallbackProviders,
    ].filter((p) => this.providers.has(p));

    let lastError: Error | null = null;

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);

      if (!provider) {
        continue;
      }

      try {
        const response = await provider.generateStructuredResponse<T>(
          systemPrompt,
          userPrompt,
          schema
        );

        return { response, provider: providerName };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error("No AI providers available");
  }

  /**
   * Get provider by name.
   */
  getProvider(name: AiProviderType): BaseAiProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Check which providers are available.
   */
  async getAvailableProviders(): Promise<AiProviderType[]> {
    const available: AiProviderType[] = [];

    for (const [name, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          available.push(name);
        }
      } catch {
        // Provider is not available
      }
    }

    return available;
  }

  /**
   * Set preferred provider.
   */
  setPreferredProvider(name: AiProviderType) {
    if (this.providers.has(name)) {
      this.preferredProvider = name;
    }
  }

  /**
   * Set fallback providers (in order of preference).
   */
  setFallbackProviders(names: AiProviderType[]) {
    this.fallbackProviders = names.filter((name) => this.providers.has(name));
  }
}
