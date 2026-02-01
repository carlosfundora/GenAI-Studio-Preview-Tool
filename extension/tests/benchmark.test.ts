import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActiveWebviewProvider } from "../src/activeWebview";
import { PreviewManager } from "../src/previewManager";

// Mocks
vi.mock("vscode", () => ({
  WebviewView: class {},
  commands: {
    executeCommand: vi.fn(),
  },
}));

vi.mock("qrcode", () => ({
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
}));

vi.mock("os", () => ({
  networkInterfaces: vi.fn().mockReturnValue({
    eth0: [
      {
        family: "IPv4",
        internal: false,
        address: "192.168.1.100",
      },
    ],
  }),
}));

describe("ActiveWebviewProvider Performance", () => {
  let provider: ActiveWebviewProvider;
  let previewManager: PreviewManager;
  let webviewView: any;

  beforeEach(() => {
    // Mock PreviewManager
    previewManager = {
      getRunningPreviews: vi.fn(),
      getPreviewUrl: vi.fn(),
    } as any;

    provider = new ActiveWebviewProvider(previewManager);

    // Mock WebviewView
    webviewView = {
      webview: {
        options: {},
        html: "",
        onDidReceiveMessage: vi.fn(),
      },
    };
    provider.resolveWebviewView(webviewView);
  });

  it("should refresh efficiently", async () => {
    const PROJECT_COUNT = 1000;
    const projects = Array.from({ length: PROJECT_COUNT }, (_, i) => ({
      name: `Project ${i}`,
      path: `/path/to/project/${i}`,
      config: {} as any,
    }));

    (previewManager.getRunningPreviews as any).mockReturnValue(projects);
    (previewManager.getPreviewUrl as any).mockImplementation((path: string) => `http://localhost:3000${path}`);

    const start = performance.now();
    await provider.refresh();
    const end = performance.now();
    const duration = end - start;

    console.log(`Refresh took ${duration.toFixed(2)}ms for ${PROJECT_COUNT} projects`);

    // Basic assertion to ensure it ran
    expect(webviewView.webview.html).toContain("Project 999");
  });
});
