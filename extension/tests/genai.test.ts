import { describe, expect, it } from "vitest";
import { GoogleGenerativeAI } from "@core/mocks/genai";

describe("GoogleGenerativeAI Mock", () => {
  const genAI = new GoogleGenerativeAI("test-api-key");
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  it("should initialize with an API key", () => {
    expect(genAI).toBeDefined();
  });

  it("should generate mock content", async () => {
    const result = await model.generateContent("Hello");
    expect(result.response.text()).toContain("simulated response");
    expect(result.response.candidates).toHaveLength(1);
    expect(result.response.functionCalls()).toHaveLength(0);
  });

  it("should support streaming mock content", async () => {
    const stream = model.generateContentStream("Hello stream");
    let text = "";
    for await (const chunk of stream) {
      text += chunk.text();
    }
    expect(text).toContain("simulated streaming response");
  });

  it("should handle tool calls in mock mode", async () => {
    const toolModel = genAI.getGenerativeModel({
      model: "gemini-pro",
      tools: [
        {
          functionDeclarations: [
            {
              name: "get_weather",
              description: "Get the weather",
            },
          ],
        },
      ],
    });

    const result = await toolModel.generateContent("What is the weather?");
    const calls = result.response.functionCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("get_weather");
    expect(calls[0].args).toEqual({
      mock: true,
      message: "Simulated tool call",
    });
  });
});
