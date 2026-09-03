const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { checkAuditBaseline, isVulnerabilityReport } = require('./auditBaseline');

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

const audit = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (audit.error) {
  console.error(`Could not run npm audit: ${audit.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('npm audit did not return valid JSON.');
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

if (![0, 1].includes(audit.status)) {
  console.error(`npm audit failed with exit code ${audit.status}.`);
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

if (!isVulnerabilityReport(report)) {
  console.error(
    'npm audit did not return a vulnerability report; the advisory service may be unreachable.',
  );
  if (report.message) console.error(report.message);
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

const baseline = readJson('security/npm-audit-baseline.json');
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const result = checkAuditBaseline(report, baseline, packageJson, packageLock);

console.log(
  `npm audit reported ${result.affectedPackageEntries} affected package entries ` +
    `from ${result.rootAdvisoryCount} root advisory identities.`,
);
console.log('\nAccepted advisories:');
for (const advisory of result.accepted) {
  console.log(
    `- ${advisory.id}: ${advisory.package} ${advisory.vulnerableVersions} ` +
      `(${advisory.severity}; ${advisory.trackingIssue})`,
  );
}

console.log('\nProtected version-selected overrides:');
for (const protection of result.protections) {
  const resolutions = protection.matches
    .map((match) => `${protection.package}@${match.dependencyVersion}`)
    .join(', ');
  const label = Object.hasOwn(protection, 'ancestor')
    ? `${protection.overrideSelector} -> ${protection.package}`
    : protection.overrideSelector;
  console.log(
    `- ${label}: ${resolutions || 'no matching dependency path'} (safe: ${protection.safeRange})`,
  );
}

if (result.errors.length > 0) {
  console.error('\nAudit baseline check failed:');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\nAudit baseline matches.');
