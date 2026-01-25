/**
 * Mock implementation of @google/genai
 * Used for local previews of AI Studio prototypes without API keys.
 */

export class GoogleGenerativeAI {
  constructor(apiKey: string) {
    console.log("[Mock GenAI] Initialized with key:", apiKey ? "***" : "none");
  }

  getGenerativeModel(config: { model: string }) {
    console.log("[Mock GenAI] Getting model:", config.model);
    return new GenerativeModel(config.model);
  }
}

export const GoogleGenAI = GoogleGenerativeAI;

class GenerativeModel {
  model: string;

  constructor(model: string) {
    this.model = model;
  }

  async generateContent(prompt: string | any) {
    console.log("[Mock GenAI] Generating content for prompt:", prompt);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      response: {
        text: () =>
          "This is a simulated response from the local Exhibitron Preview environment. The UI is functional, but actual AI generation is mocked to allow offline testing.",
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

  startChat() {
    return new ChatSession(this);
  }
}

class ChatSession {
  model: GenerativeModel;
  history: any[];

  constructor(model: GenerativeModel) {
    this.model = model;
    this.history = [];
  }

  async sendMessage(msg: string) {
    console.log("[Mock GenAI] Chat message:", msg);
    return this.model.generateContent(msg);
  }
}
