#!/usr/bin/env node
/* eslint-disable no-control-regex */

import * as core from '@actions/core';
import { analyzeKnip } from './knip.js';
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

/**
 * Main entry point for the action/CLI.
 */
async function run() {
  try {
    // Inputs from GitHub Actions (or fallback to environment/defaults for CLI)
    const dir = core.getInput('dir') || process.env.KNIP_DIR || '.';
    const language = core.getInput('language') || process.env.INPUT_LANGUAGE || 'node';
    const knipOutputFile = core.getInput('knip_output') || 'knip-output.json';
    const depScan = core.getInput('dep_scan') || 'warn';
    const knipSummaryFile = 'knip-summary.txt';

    core.info(`Starting logic for language: ${language} in directory: ${dir}`);

    let stats = {
       unusedFiles: 0,
       unusedDeps: 0,
       unusedDevDeps: 0,
       unusedExports: 0,
       totalIssues: 0
    };

    // Knip analysis (only for Node)
    if (language === 'node' && fs.existsSync(knipOutputFile)) {
      try {
        stats = analyzeKnip(knipOutputFile, dir);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.warning(`Failed to analyze Knip output at ${knipOutputFile}: ${message}. Skipping Knip analysis.`);
      }
    }

    // Generic Test Results (JUnit XML) - for Java, Python, or even Node if configured
    const testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    };

    // Only look for tests if Java or Python (Node usually runs its own tests before Knip)
    if (language === 'java' || language === 'python') {
        const potentialReportPaths = [
            path.join(dir, 'target/surefire-reports'),
            path.join(dir, 'build/test-results/test'),
            path.join(dir, 'test-results'),
            dir
        ];

        const xmlFiles = [];
        potentialReportPaths.forEach(p => {
            if (fs.existsSync(p)) {
                 const files = fs.readdirSync(p).filter(f => f.endsWith('.xml'));
                 files.forEach(f => xmlFiles.push(path.join(p, f)));
            }
        });

        if (xmlFiles.length > 0) {
            core.info(`Found ${xmlFiles.length} XML test reports. Parsing...`);
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            xmlFiles.forEach(file => {
                try {
                    const xmlContent = fs.readFileSync(file, 'utf8');
                    const jsonObj = parser.parse(xmlContent);
                    const testsuite = jsonObj.testsuite || (jsonObj.testsuites && jsonObj.testsuites.testsuite);
                    
                    if (testsuite) {
                        const suites = Array.isArray(testsuite) ? testsuite : [testsuite];
                        suites.forEach(s => {
                            testResults.total += parseInt(s.tests || 0);
                            testResults.failed += parseInt(s.failures || 0) + parseInt(s.errors || 0);
                            testResults.skipped += parseInt(s.skipped || 0);
                        });
                    }
                } catch (err) {
                    core.debug(`Failed to parse XML report ${file}: ${err.message}`);
                }
            });
            testResults.passed = testResults.total - testResults.failed - testResults.skipped;
        }
    }
    
    // Set outputs for the action (Knip stats)
    core.setOutput('unused_files', stats.unusedFiles);
    core.setOutput('unused_deps', stats.unusedDeps);
    core.setOutput('total_issues', stats.totalIssues);

    // Create Step Summary
    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = core.summary.addHeading(`🔍 ${language.toUpperCase()} Analysis Results`);
      
      if (language === 'node') {
        summary.addTable([
          ['Category', 'Count'],
          ['Unused files', stats.unusedFiles.toString()],
          ['Unused dependencies', stats.unusedDeps.toString()],
          ['Unused devDependencies', stats.unusedDevDeps.toString()],
          ['Unused exports', stats.unusedExports.toString()]
        ]);
        
        if (fs.existsSync(knipSummaryFile)) {
          const detail = fs.readFileSync(knipSummaryFile, 'utf8');
          summary.addHeading('📋 Knip Full Output', 3)
            .addCodeBlock(detail.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, ''));
        }
      }

      if (testResults.total > 0) {
          summary.addHeading('🧪 Test Results', 3)
            .addTable([
                ['Result', 'Count'],
                ['Total Tests', testResults.total.toString()],
                ['✅ Passed', testResults.passed.toString()],
                ['❌ Failed', testResults.failed.toString()],
                ['⏭️ Skipped', testResults.skipped.toString()]
            ]);
      }

      const hasKnipIssues = language === 'node' && stats.totalIssues > 0;
      const hasTestFailures = testResults.failed > 0;

      if (hasKnipIssues || hasTestFailures) {
        summary.addRaw(`\n⚠️ **Issues found** - See annotations or check workflow logs for details`);
      } else if (testResults.total > 0 || (language === 'node' && stats.totalIssues === 0)) {
        summary.addRaw(`\n✅ **Success**`);
      }

      await summary.write();
    }

    // Handle failure mode (Knip)
    if (language === 'node' && stats.totalIssues > 0) {
      if (depScan === 'error') {
        core.setFailed(`Knip found ${stats.totalIssues} unused items.`);
      } else {
        core.info(`Knip found ${stats.totalIssues} unused items (running in warn mode).`);
      }
    }

    // Handle failure mode (Tests for Java/Python)
    if (testResults.failed > 0) {
        core.setFailed(`${testResults.failed} tests failed in the ${language} project.`);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
