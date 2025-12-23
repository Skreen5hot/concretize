/**
 * Vitest test setup file
 * Adds missing browser APIs to jsdom environment
 */

// Add arrayBuffer() method to File prototype for jsdom
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
    // Read the file as text first (jsdom supports this)
    const text = await this.text();

    // Convert text to ArrayBuffer
    const encoder = new TextEncoder();
    return encoder.encode(text).buffer;
  };
}

// Add text() method if it's missing
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = async function (): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this as unknown as Blob);
    });
  };
}

export {};
