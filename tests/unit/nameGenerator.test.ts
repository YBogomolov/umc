import { describe, expect, it } from 'vitest';

import { generateMiniName } from '@/lib/nameGenerator';

describe('nameGenerator', () => {
  it('generates a name with two words', () => {
    const name = generateMiniName();
    const words = name.split(' ');
    expect(words).toHaveLength(2);
  });

  it('generates capitalized words', () => {
    const name = generateMiniName();
    const words = name.split(' ');
    expect(words[0][0]).toBe(words[0][0].toUpperCase());
    expect(words[1][0]).toBe(words[1][0].toUpperCase());
  });

  it('generates valid adjective-noun format', () => {
    const name = generateMiniName();
    const [adj, noun] = name.split(' ');

    expect(adj).toMatch(/^[A-Z][a-z]+$/);
    expect(noun).toMatch(/^[A-Z][a-z]+$/);
  });

  it('generates different names on repeated calls', () => {
    const names = new Set<string>();
    for (let i = 0; i < 100; i++) {
      names.add(generateMiniName());
    }
    expect(names.size).toBeGreaterThan(1);
  });
});
