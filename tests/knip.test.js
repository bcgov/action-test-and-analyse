import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeKnip } from '../src/knip.js';
import fs from 'node:fs';
import * as core from '@actions/core';

vi.mock('node:fs');
vi.mock('@actions/core');

describe('analyzeKnip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly parse knip output and count issues', () => {
    const mockData = {
      files: ['src/unused.js'],
      issues: [
        {
          file: 'package.json',
          dependencies: [{ name: 'lodash', line: 10 }]
        },
        {
          file: 'src/main.js',
          exports: [{ name: 'oldFunc', line: 5 }]
        }
      ]
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const result = analyzeKnip('mock.json', 'test-dir');

    expect(result.unusedFiles).toBe(1);
    expect(result.unusedDeps).toBe(1);
    expect(result.unusedExports).toBe(1);
    expect(result.totalIssues).toBe(3);

    // Verify warnings were called
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Unused file'),
      expect.objectContaining({ file: expect.stringContaining('src/unused.js') })
    );
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Unused dependency: lodash'),
      expect.objectContaining({ startLine: 10 })
    );
    expect(core.notice).toHaveBeenCalledWith(
      expect.stringContaining('Unused export: oldFunc'),
      expect.objectContaining({ startLine: 5 })
    );
  });

  it('should throw error if file is missing', () => {
    fs.existsSync.mockReturnValue(false);
    expect(() => analyzeKnip('missing.json', '.')).toThrow('Knip output file not found');
  });

  it('should throw error if JSON is invalid', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('invalid json');
    expect(() => analyzeKnip('bad.json', '.')).toThrow('Failed to parse Knip JSON');
  });
});
