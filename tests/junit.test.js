import { describe, it, expect } from 'vitest';
import { parseJUnitXmlContent, summarizeJUnitXmlFiles, findJUnitXmlFiles } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('JUnit XML Parsing', () => {
    it('should parse a standard single testsuite XML', () => {
        const xml = `
        <testsuite tests="3" failures="1" errors="0" skipped="1">
            <testcase name="test1" />
            <testcase name="test2"><failure message="failed" /></testcase>
            <testcase name="test3"><skipped /></testcase>
        </testsuite>`;
        const results = parseJUnitXmlContent(xml);
        expect(results.total).toBe(3);
        expect(results.failed).toBe(1);
        expect(results.skipped).toBe(1);
    });

    it('should parse a nested testsuites XML', () => {
        const xml = `
        <testsuites>
            <testsuite tests="2" failures="0" errors="1" skipped="0">
                <testcase name="test1" />
                <testcase name="test2"><error message="error" /></testcase>
            </testsuite>
            <testsuite tests="1" failures="1" errors="0" skipped="0">
                <testcase name="test3"><failure message="failed" /></testcase>
            </testsuite>
        </testsuites>`;
        const results = parseJUnitXmlContent(xml);
        expect(results.total).toBe(3);
        expect(results.failed).toBe(2); // 1 failure + 1 error
        expect(results.skipped).toBe(0);
    });

    it('should handle missing attributes gracefully', () => {
        const xml = `<testsuite><testcase name="test" /></testsuite>`;
        const results = parseJUnitXmlContent(xml);
        expect(results.total).toBe(0);
        expect(results.failed).toBe(0);
    });

    it('should summarize multiple files correctly', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junit-test-'));
        const file1 = path.join(tempDir, 'res1.xml');
        const file2 = path.join(tempDir, 'res2.xml');
        
        fs.writeFileSync(file1, '<testsuite tests="2" failures="0" />');
        fs.writeFileSync(file2, '<testsuite tests="3" failures="1" />');

        const summary = summarizeJUnitXmlFiles([file1, file2]);
        expect(summary.total).toBe(5);
        expect(summary.failed).toBe(1);
        expect(summary.passed).toBe(4);

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should find reports while ignoring node_modules', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junit-find-'));
        const projDir = path.join(tempDir, 'project');
        const nmDir = path.join(projDir, 'node_modules', 'some-pkg');
        const targetDir = path.join(projDir, 'target', 'surefire-reports');
        
        fs.mkdirSync(nmDir, { recursive: true });
        fs.mkdirSync(targetDir, { recursive: true });
        
        const validReport = path.join(targetDir, 'TEST-valid.xml');
        const invalidReport = path.join(nmDir, 'junit.xml');
        
        fs.writeFileSync(validReport, '<testsuite tests="1" />');
        fs.writeFileSync(invalidReport, '<testsuite tests="1" />');

        const found = findJUnitXmlFiles(projDir);
        expect(found).toHaveLength(1);
        expect(found[0]).toContain('TEST-valid.xml');
        expect(found).not.toContain(invalidReport);

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
});
