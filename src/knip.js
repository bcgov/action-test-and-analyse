import fs from 'node:fs';
import path from 'node:path';
import * as core from '@actions/core';

/**
 * Analyzes Knip JSON output and generates GitHub annotations.
 * @param {string} outputFile - Path to the knip-output.json file
 * @param {string} baseDir - The directory where the app/package being analyzed resides
 * @returns {object} Summary statistics
 */
export function analyzeKnip(outputFile, baseDir) {
  if (!fs.existsSync(outputFile)) {
    throw new Error(`Knip output file not found: ${outputFile}`);
  }

  const content = fs.readFileSync(outputFile, 'utf8');
  if (!content.trim()) {
    throw new Error('Knip output file is empty');
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse Knip JSON: ${error.message}`);
  }

  const files = Array.isArray(data.files) ? data.files : [];
  const issues = Array.isArray(data.issues) ? data.issues : [];

  const unusedFiles = files.length;
  const unusedDeps = issues.flatMap(i => i.dependencies || []).length;
  const unusedDevDeps = issues.flatMap(i => i.devDependencies || []).length;
  const unusedExports = issues.flatMap(i => i.exports || []).length;

  // Create annotations for unused files
  files.forEach(file => {
    core.warning('Unused file', {
      file: path.join(baseDir, file),
      title: 'Knip: Unused File',
      startLine: 1
    });
  });

  // Create annotations for other issues
  issues.forEach(issue => {
    const file = path.join(baseDir, issue.file || 'package.json');
    
    (issue.dependencies || []).forEach(dep => {
      core.warning(`Unused dependency: ${dep.name}`, {
        file,
        title: 'Knip: Unused Dependency',
        startLine: dep.line || 1
      });
    });

    (issue.devDependencies || []).forEach(dep => {
      core.warning(`Unused devDependency: ${dep.name}`, {
        file,
        title: 'Knip: Unused devDependency',
        startLine: dep.line || 1
      });
    });

    (issue.exports || []).forEach(exp => {
      // Exports are often just 'notices' rather than warnings depending on preference,
      // but let's stick to the current action's behavior.
      core.notice(`Unused export: ${exp.name}`, {
        file,
        title: 'Knip: Unused Export',
        startLine: exp.line || 1
      });
    });
  });

  return {
    unusedFiles,
    unusedDeps,
    unusedDevDeps,
    unusedExports,
    totalIssues: unusedFiles + unusedDeps + unusedDevDeps + unusedExports
  };
}
