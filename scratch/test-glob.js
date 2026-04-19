import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

function findJUnitXmlFiles(dir) {
  const reports = [];
  const searchPaths = [
    '**/target/surefire-reports/*.xml',
    '**/target/failsafe-reports/*.xml',
    '**/test-results/**/*.xml'
  ];

  for (const pattern of searchPaths) {
    console.log(`Searching for ${pattern} in ${dir}...`);
    const files = glob.sync(pattern, {
      cwd: dir,
      absolute: true,
      ignore: ['**/node_modules/**']
    });
    console.log(`  Found ${files.length} files.`);
    reports.push(...files);
  }
  return [...new Set(reports)];
}

// Setup dummy structure
const base = './.tmp/test-glob';
if (fs.existsSync(base)) fs.rmSync(base, { recursive: true });
fs.mkdirSync(path.join(base, 'module-a/target/surefire-reports'), { recursive: true });
fs.writeFileSync(path.join(base, 'module-a/target/surefire-reports/TEST-1.xml'), '<testsuite></testsuite>');

console.log('--- Relative path test ---');
const foundRel = findJUnitXmlFiles(base);
console.log('Found:', foundRel);

console.log('\n--- Absolute path test ---');
const foundAbs = findJUnitXmlFiles(path.resolve(base));
console.log('Found:', foundAbs);
