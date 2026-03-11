import { vi } from 'vitest';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(0) }),
  putImageData: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  drawRectangle: vi.fn(),
  createLinearGradient: vi.fn(),
  createPattern: vi.fn(),
});

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock');

HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined);
