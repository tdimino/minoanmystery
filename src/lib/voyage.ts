/**
 * VoyageAI Client Wrapper
 *
 * Provides embedding generation for Kothar RAG using VoyageAI Voyage 4 models.
 * Uses asymmetric retrieval: voyage-4-large for documents, voyage-4-lite for queries.
 *
 * @see https://docs.voyageai.com/docs/embeddings
 */

export interface VoyageEmbeddingOptions {
  model?: 'voyage-4-large' | 'voyage-4' | 'voyage-4-lite';
  inputType?: 'query' | 'document' | null;
  outputDimension?: 256 | 512 | 1024 | 2048;
  outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
  truncation?: boolean;
}

export interface VoyageEmbeddingResponse {
  embeddings: number[][];
  totalTokens: number;
  model: string;
}

/**
 * VoyageAI client for generating embeddings
 */
export class VoyageClient {
  private apiKey: string;
  private baseUrl = 'https://api.voyageai.com/v1/embeddings';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.VOYAGE_API_KEY || import.meta.env?.VOYAGE_API_KEY;
    if (!key) {
      throw new Error('VOYAGE_API_KEY is required');
    }
    this.apiKey = key;
  }

  /**
   * Generate embeddings for text(s)
   *
   * @param texts - Single text or array of texts to embed
   * @param options - Embedding options
   * @returns Embedding response with vectors and token count
   */
  async embed(
    texts: string | string[],
    options: VoyageEmbeddingOptions = {}
  ): Promise<VoyageEmbeddingResponse> {
    const {
      model = 'voyage-4-large',
      inputType = null,
      outputDimension = 1024,
      outputDtype = 'float',
      truncation = true,
    } = options;

    const input = Array.isArray(texts) ? texts : [texts];

    // Validate batch size
    if (input.length > 1000) {
      throw new Error('Maximum batch size is 1000 texts');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input,
        model,
        ...(inputType && { input_type: inputType }),
        output_dimension: outputDimension,
        output_dtype: outputDtype,
        truncation,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`VoyageAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      embeddings: data.data.map((item: { embedding: number[] }) => item.embedding),
      totalTokens: data.usage?.total_tokens || 0,
      model: data.model,
    };
  }

  /**
   * Generate document embeddings optimized for storage
   * Uses voyage-4-large for maximum retrieval accuracy
   */
  async embedDocuments(
    texts: string[],
    dimension: 256 | 512 | 1024 | 2048 = 1024
  ): Promise<VoyageEmbeddingResponse> {
    return this.embed(texts, {
      model: 'voyage-4-large',
      inputType: 'document',
      outputDimension: dimension,
      outputDtype: 'float',
    });
  }

  /**
   * Generate query embedding optimized for retrieval
   * Uses voyage-4-lite for cost efficiency (same embedding space as voyage-4-large)
   */
  async embedQuery(
    query: string,
    dimension: 256 | 512 | 1024 | 2048 = 1024
  ): Promise<number[]> {
    const response = await this.embed(query, {
      model: 'voyage-4-lite',
      inputType: 'query',
      outputDimension: dimension,
      outputDtype: 'float',
    });
    return response.embeddings[0];
  }
}

// Singleton instance for convenience
let clientInstance: VoyageClient | null = null;

/**
 * Get or create VoyageAI client singleton
 */
export function getVoyageClient(): VoyageClient {
  if (!clientInstance) {
    clientInstance = new VoyageClient();
  }
  return clientInstance;
}

/**
 * Generate query embedding (convenience function)
 */
export async function embedQuery(query: string): Promise<number[]> {
  return getVoyageClient().embedQuery(query);
}

/**
 * Generate document embeddings (convenience function)
 */
export async function embedDocuments(texts: string[]): Promise<VoyageEmbeddingResponse> {
  return getVoyageClient().embedDocuments(texts);
}
