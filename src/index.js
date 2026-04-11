#!/usr/bin/env node
/* eslint-disable no-control-regex */

import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import * as core from '@actions/core';
import { analyzeKnip } from './knip.js';

export function findJUnitXmlFiles(dir) {
  const potentialReportPaths = [
    path.join(dir, 'target/surefire-reports'),
    path.join(dir, 'build/test-results/test'),
    path.join(dir, 'test-results')
  ];
  const xmlFiles = [];
  potentialReportPaths.forEach(p => {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        const files = fs.readdirSync(p).filter(f => f.endsWith('.xml'));
        files.forEach(f => xmlFiles.push(path.join(p, f)));
      }
    } catch (err) {
      core.debug(`Failed to inspect potential test report path ${p}: ${err.message}`);
    }
  });
  return xmlFiles;
}

export function parseJUnitXmlContent(xmlContent) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const jsonObj = parser.parse(xmlContent);
  const suitesRoot = jsonObj.testsuite
    || (jsonObj.testsuites && (jsonObj.testsuites.testsuite || jsonObj.testsuites.testsuites));
  
  const suites = Array.isArray(suitesRoot) ? suitesRoot : (suitesRoot ? [suitesRoot] : []);
  const results = { total: 0, failed: 0, skipped: 0 };

  suites.forEach(suite => {
    results.total += parseInt(suite.tests || 0);
    results.failed += parseInt(suite.failures || 0) + parseInt(suite.errors || 0);
    results.skipped += parseInt(suite.skipped || 0);
  });
  return results;
}

export function summarizeJUnitXmlFiles(xmlFiles) {
  const testResults = { total: 0, passed: 0, failed: 0, skipped: 0 };
  xmlFiles.forEach(file => {
    try {
      const xmlContent = fs.readFileSync(file, 'utf8');
      const parsed = parseJUnitXmlContent(xmlContent);
      testResults.total += parsed.total;
      testResults.failed += parsed.failed;
      testResults.skipped += parsed.skipped;
    } catch (err) {
      core.debug(`Failed to parse XML report ${file}: ${err.message}`);
    }
  });
  testResults.passed = testResults.total - testResults.failed - testResults.skipped;
  return testResults;
}

/**
 * Main entry point for the action/CLI.
 */
async function run() {
  try {
    const dir = core.getInput('dir') || '.';
    const depScan = core.getInput('dep_scan') || 'off';
    const knipOutputFile = core.getInput('knip_output') || 'knip-output.json';
    const language = core.getInput('language') || 'node';
    const knipSummaryFile = 'knip-summary.txt';

    core.info(`Starting logic for language: ${language} in directory: ${dir}`);

    let stats = { unusedFiles: 0, unusedDeps: 0, unusedDevDeps: 0, unusedExports: 0, totalIssues: 0 };

    if (language === 'node' && fs.existsSync(knipOutputFile)) {
      try {
        stats = analyzeKnip(knipOutputFile, dir);
      } catch (error) {
        core.warning(`Failed to analyze Knip output: ${error.message}`);
      }
    }

    let testResults = { total: 0, passed: 0, failed: 0, skipped: 0 };
    if (language === 'java' || language === 'python') {
        const xmlFiles = findJUnitXmlFiles(dir);
        if (xmlFiles.length > 0) {
            core.info(`Found ${xmlFiles.length} XML test reports.`);
            testResults = summarizeJUnitXmlFiles(xmlFiles);
        }
    }
    
    core.setOutput('unused_files', stats.unusedFiles);
    core.setOutput('unused_deps', stats.unusedDeps);
    core.setOutput('total_issues', stats.totalIssues);

    const hasKnipIssues = language === 'node' && stats.totalIssues > 0;
    const hasTestFailures = testResults.failed > 0;

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
          summary.addHeading('📋 Knip Full Output', 3).addCodeBlock(detail.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, ''));
        }
      }

      if (testResults.total > 0) {
          summary.addHeading('🧪 Test Results', 3).addTable([
                ['Result', 'Count'],
                ['Total Tests', testResults.total.toString()],
                ['✅ Passed', testResults.passed.toString()],
                ['❌ Failed', testResults.failed.toString()],
                ['⏭️ Skipped', testResults.skipped.toString()]
            ]);
      }

      if (hasKnipIssues || hasTestFailures) {
        summary.addRaw(`\n⚠️ **Issues found** - See annotations or check workflow logs for details`);
      } else if (testResults.total > 0 || language === 'node') {
        summary.addRaw(`\n✅ **Success**`);
      }
      await summary.write();
    } else {
       // CLI Fallback Output
       core.info(`\n🔍 ${language.toUpperCase()} Analysis Results`);
       if (language === 'node') {
         core.info(`Knip: ${stats.totalIssues} issues (${stats.unusedFiles} files, ${stats.unusedDeps} deps)`);
       }
       if (testResults.total > 0) {
         core.info(`Tests: ${testResults.total} total, ${testResults.passed} passed, ${testResults.failed} failed`);
       }
    }

    if (language === 'node' && hasKnipIssues && depScan === 'error') {
      core.setFailed(`Knip found ${stats.totalIssues} unused items.`);
    }

    if (hasTestFailures) {
        core.setFailed(`${testResults.failed} tests failed in the ${language} project.`);
    }

  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
