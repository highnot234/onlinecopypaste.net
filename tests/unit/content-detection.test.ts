import { describe, it, expect } from 'vitest';
import { detectContentType, detectLanguage } from '@/lib/content-detection';

describe('detectContentType', () => {
  // URLs
  it('detects http URLs', () => {
    expect(detectContentType('http://example.com')).toBe('url');
  });

  it('detects https URLs', () => {
    expect(detectContentType('https://github.com/user/repo')).toBe('url');
  });

  it('does not treat plain text starting with "http" in a sentence as URL', () => {
    // "http" embedded in a sentence is not a URL
    expect(detectContentType('visit http://example.com for more info')).toBe('text');
  });

  // JSON
  it('detects valid JSON objects', () => {
    expect(detectContentType('{"key": "value", "num": 42}')).toBe('json');
  });

  it('detects valid JSON arrays', () => {
    expect(detectContentType('[1, 2, 3]')).toBe('json');
  });

  it('does not misidentify invalid JSON as json', () => {
    expect(detectContentType('{invalid json}')).toBe('text');
  });

  // Code
  it('detects JavaScript code', () => {
    const js = `const greet = (name) => {\n  return \`Hello, \${name}\`;\n};`;
    expect(detectContentType(js)).toBe('code');
  });

  it('detects Python code', () => {
    const py = `def hello(name):\n    print(f"Hello, {name}")`;
    expect(detectContentType(py)).toBe('code');
  });

  // Text
  it('classifies plain sentences as text', () => {
    expect(detectContentType('Hello, this is a plain sentence.')).toBe('text');
  });

  it('classifies empty string as text', () => {
    expect(detectContentType('')).toBe('text');
  });
});

describe('detectLanguage', () => {
  it('detects TypeScript', () => {
    const ts = `interface User { name: string; age: number; }`;
    expect(detectLanguage(ts)).toBe('typescript');
  });

  it('detects JavaScript', () => {
    const js = `const x = require('module'); module.exports = x;`;
    expect(detectLanguage(js)).toBe('javascript');
  });

  it('detects Python', () => {
    const py = `def hello():\n    print("world")`;
    expect(detectLanguage(py)).toBe('python');
  });

  it('detects CSS', () => {
    const css = `.container { display: flex; }\n@media (max-width: 768px) {}`;
    expect(detectLanguage(css)).toBe('css');
  });

  it('detects JSON', () => {
    const json = `{"a": 1}`;
    expect(detectLanguage(json)).toBe('json');
  });

  it('falls back to plaintext for unrecognized content', () => {
    expect(detectLanguage('Hello world')).toBe('plaintext');
  });
});
