/**
 * Mock implementation of @google/genai
 * Used for local previews of AI Studio prototypes without API keys.
 *
 * Features:
 * - Full enum exports (Modality, HarmCategory, etc.)
 * - Streaming support
 * - Tool/Function calling
 * - Embedding support
 * - Local LLM routing via configuration
 */

import { getConfigAsync } from "../config.js";

// ============================================================================
// ENUMS
// ============================================================================

export enum Modality {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
}

export enum HarmCategory {
  HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
  HARM_CATEGORY_DEROGATORY = "HARM_CATEGORY_DEROGATORY",
  HARM_CATEGORY_TOXICITY = "HARM_CATEGORY_TOXICITY",
  HARM_CATEGORY_SEXUAL = "HARM_CATEGORY_SEXUAL",
  HARM_CATEGORY_VIOLENT = "HARM_CATEGORY_VIOLENT",
  HARM_CATEGORY_MEDICAL = "HARM_CATEGORY_MEDICAL",
  HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
  HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
  HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
}

export enum HarmBlockThreshold {
  HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
  BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
  BLOCK_NONE = "BLOCK_NONE",
}

export enum SchemaType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
}

export enum TaskType {
  TASK_TYPE_UNSPECIFIED = "TASK_TYPE_UNSPECIFIED",
  RETRIEVAL_QUERY = "RETRIEVAL_QUERY",
  RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT",
  SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY",
  CLASSIFICATION = "CLASSIFICATION",
  CLUSTERING = "CLUSTERING",
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  fileData?: { mimeType: string; fileUri: string };
  functionCall?: { name: string; args: object };
  functionResponse?: { name: string; response: object };
}

export interface Content {
  role: "user" | "model" | "function" | "system";
  parts: Part[];
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: object;
  candidateCount?: number;
  stopSequences?: string[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: object;
}

export interface Tool {
  functionDeclarations?: FunctionDeclaration[];
}

export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

// ============================================================================
// MAIN CLASSES
// ============================================================================

export class GoogleGenerativeAI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.log("[Mock GenAI] Initialized with key:", apiKey ? "***" : "none");
  }

  getGenerativeModel(config: {
    model: string;
    generationConfig?: GenerationConfig;
    safetySettings?: SafetySetting[];
    tools?: Tool[];
    systemInstruction?: string | Content;
  }): GenerativeModel {
    console.log("[Mock GenAI] Getting model:", config.model);
    return new GenerativeModel(config.model, config);
  }
}

export const GoogleGenAI = GoogleGenerativeAI;

class GenerativeModel {
  model: string;
  private config: {
    generationConfig?: GenerationConfig;
    tools?: Tool[];
    systemInstruction?: string | Content;
  };

  constructor(
    model: string,
    config?: {
      generationConfig?: GenerationConfig;
      tools?: Tool[];
      systemInstruction?: string | Content;
    },
  ) {
    this.model = model;
    this.config = config || {};
  }

  async generateContent(
    prompt: string | Content | Content[],
  ): Promise<GenerateContentResult> {
    console.log("[Mock GenAI] Generating content for prompt:", prompt);

    const appConfig = await getConfigAsync();
    const promptText =
      typeof prompt === "string" ? prompt : JSON.stringify(prompt);

    // Route to local LLM if configured
    if (appConfig.ai.mode === "local") {
      try {
        const res = await fetch(`${appConfig.ai.endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(appConfig.ai.apiKey && {
              Authorization: `Bearer ${appConfig.ai.apiKey}`,
            }),
          },
          body: JSON.stringify({
            model: appConfig.ai.models.text,
            messages: [{ role: "user", content: promptText }],
            ...(this.config.tools && {
              tools: this.config.tools.flatMap(
                (t) =>
                  t.functionDeclarations?.map((f) => ({
                    type: "function",
                    function: f,
                  })) || [],
              ),
            }),
          }),
          signal: AbortSignal.timeout(appConfig.ai.timeout),
        });

        const data = await res.json();

        // Check for tool calls
        interface OpenAIResponseToolCall {
          function: {
            name: string;
            arguments: string;
          };
        }

        const toolCalls = data.choices?.[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          return {
            response: {
              text: () => "",
              functionCalls: () =>
                toolCalls.map((tc: OpenAIResponseToolCall) => ({
                  name: tc.function.name,
                  args: JSON.parse(tc.function.arguments || "{}"),
                })),
              candidates: [],
            },
          };
        }

        return {
          response: {
            text: () => data.choices?.[0]?.message?.content || "",
            functionCalls: () => [],
            candidates: data.choices?.map((c: any) => ({
              content: {
                parts: [{ text: c.message?.content }],
                role: "model",
              },
            })),
          },
        };
      } catch (e) {
        console.error("[Mock GenAI] Local LLM error:", e);
        // Fall through to mock response
      }
    }

    // Mock response
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if tools are configured - return mock function call
    if (this.config.tools && this.config.tools.length > 0) {
      const firstTool = this.config.tools[0].functionDeclarations?.[0];
      if (firstTool) {
        return {
          response: {
            text: () => "",
            functionCalls: () => [
              {
                name: firstTool.name,
                args: { mock: true, message: "Simulated tool call" },
              },
            ],
            candidates: [],
          },
        };
      }
    }

    return {
      response: {
        text: () =>
          "This is a simulated response from GenAI Studio Preview. " +
          "The UI is functional, but actual AI generation is mocked for offline testing.",
        functionCalls: () => [],
        candidates: [
          {
            content: {
              parts: [{ text: "Mock response part" }],
              role: "model",
            },
          },
        ],
      },
    };
  }

  async *generateContentStream(
    prompt: string | Content | Content[],
  ): AsyncGenerator<GenerateContentStreamChunk> {
    console.log("[Mock GenAI] Streaming content for prompt:", prompt);

    const appConfig = await getConfigAsync();
    const promptText =
      typeof prompt === "string" ? prompt : JSON.stringify(prompt);

    // Route to local LLM if configured
    if (appConfig.ai.mode === "local") {
      try {
        const res = await fetch(`${appConfig.ai.endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(appConfig.ai.apiKey && {
              Authorization: `Bearer ${appConfig.ai.apiKey}`,
            }),
          },
          body: JSON.stringify({
            model: appConfig.ai.models.text,
            messages: [{ role: "user", content: promptText }],
            stream: true,
          }),
          signal: AbortSignal.timeout(appConfig.ai.timeout),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk
              .split("\n")
              .filter((l) => l.startsWith("data: "));
            for (const line of lines) {
              if (line === "data: [DONE]") continue;
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  yield { text: () => content };
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
        return;
      } catch (e) {
        console.error("[Mock GenAI] Streaming error:", e);
        // Fall through to mock streaming
      }
    }

    // Mock streaming
    const words =
      "This is a simulated streaming response from GenAI Studio Preview.".split(
        " ",
      );
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 100));
      yield { text: () => word + " " };
    }
  }

  startChat(config?: { history?: Content[] }): ChatSession {
    return new ChatSession(this, config?.history || []);
  }
}

interface GenerateContentResult {
  response: {
    text: () => string;
    functionCalls: () => Array<{ name: string; args: object }>;
    candidates: any[];
  };
}

interface GenerateContentStreamChunk {
  text: () => string;
}

class ChatSession {
  private model: GenerativeModel;
  private history: Content[];

  constructor(model: GenerativeModel, history: Content[]) {
    this.model = model;
    this.history = history;
  }

  async sendMessage(msg: string): Promise<GenerateContentResult> {
    console.log("[Mock GenAI] Chat message:", msg);
    this.history.push({ role: "user", parts: [{ text: msg }] });
    const result = await this.model.generateContent(this.history);
    this.history.push({
      role: "model",
      parts: [{ text: result.response.text() }],
    });
    return result;
  }

  async *sendMessageStream(
    msg: string,
  ): AsyncGenerator<GenerateContentStreamChunk> {
    console.log("[Mock GenAI] Chat message (streaming):", msg);
    this.history.push({ role: "user", parts: [{ text: msg }] });
    yield* this.model.generateContentStream(this.history);
  }

  getHistory(): Content[] {
    return this.history;
  }
}

// ============================================================================
// EMBEDDING MODEL
// ============================================================================

export class EmbeddingModel {
  private model: string;

  constructor(model: string = "text-embedding-004") {
    this.model = model;
  }

  async embedContent(
    content: string | Content,
  ): Promise<{ embedding: { values: number[] } }> {
    const text =
      typeof content === "string" ? content : JSON.stringify(content);
    console.log("[Mock GenAI] Embedding content:", text.slice(0, 50) + "...");

    const appConfig = await getConfigAsync();

    if (appConfig.ai.mode === "local") {
      try {
        const res = await fetch(`${appConfig.ai.endpoint}/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: appConfig.ai.models.embedding || "nomic-embed-text",
            input: text,
          }),
          signal: AbortSignal.timeout(appConfig.ai.timeout),
        });
        const data = await res.json();
        return { embedding: { values: data.data?.[0]?.embedding || [] } };
      } catch (e) {
        console.error("[Mock GenAI] Embedding error:", e);
      }
    }

    // Mock: return deterministic 768-dimensional vector based on text hash
    const hash = text.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const values = Array(768)
      .fill(0)
      .map((_, i) => Math.sin(hash + i) * 0.5);
    return { embedding: { values } };
  }

  async batchEmbedContents(
    contents: string[],
  ): Promise<{ embeddings: Array<{ values: number[] }> }> {
    const results = await Promise.all(
      contents.map((c) => this.embedContent(c)),
    );
    return { embeddings: results.map((r) => r.embedding) };
  }
}

export function getGenerativeModel(config: {
  model: string;
  generationConfig?: GenerationConfig;
  tools?: Tool[];
}): GenerativeModel {
  return new GenerativeModel(config.model, config);
}

export function getEmbeddingModel(model?: string): EmbeddingModel {
  return new EmbeddingModel(model);
}

// ============================================================================
// LIVE API (Not Supported)
// ============================================================================

export class LiveAPI {
  constructor() {
    console.warn(
      "[GenAI Studio Preview] Live API is not supported in local preview mode. " +
        "This feature requires a real Gemini API connection.",
    );
  }

  async connect(): Promise<never> {
    throw new Error("Live API is not available in preview mode");
  }
}

// ============================================================================
// FILE MANAGER (Stub)
// ============================================================================

export class FileManager {
  constructor(apiKey: string) {
    console.log("[Mock GenAI] FileManager initialized (stub mode)");
  }

  async uploadFile(
    path: string,
    options?: { mimeType?: string; displayName?: string },
  ): Promise<{ file: { uri: string; name: string } }> {
    console.log("[Mock GenAI] File upload (stubbed):", path);
    return {
      file: {
        uri: `genai-preview://stub/${path}`,
        name: options?.displayName || path,
      },
    };
  }

  async getFile(
    name: string,
  ): Promise<{ file: { uri: string; name: string } }> {
    return { file: { uri: `genai-preview://stub/${name}`, name } };
  }
}
