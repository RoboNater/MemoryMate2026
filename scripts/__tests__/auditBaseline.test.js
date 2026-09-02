const { describe, expect, test } = require('@jest/globals');

const { checkAuditBaseline } = require('../auditBaseline');

const advisory = {
  source: 123,
  name: 'example-package',
  dependency: 'example-package',
  title: 'Example vulnerability',
  url: 'https://github.com/advisories/GHSA-1111-2222-3333',
  severity: 'high',
  cwe: ['CWE-400'],
  cvss: { score: 7.5, vectorString: 'CVSS:3.1/example' },
  range: '<2.0.0',
};

const acceptedAdvisory = {
  id: 'GHSA-1111-2222-3333',
  package: 'example-package',
  title: 'Example vulnerability',
  severity: 'high',
  vulnerableVersions: '<2.0.0',
  cwes: ['CWE-400'],
  cvss: { score: 7.5, vectorString: 'CVSS:3.1/example' },
  rationale: 'The vulnerable package is used only by a local build tool.',
  trackingIssue: 'https://github.com/RoboNater/MemoryMate2026/issues/42',
};

const protection = {
  overrideSelector: 'parent@10',
  ancestor: 'parent',
  ancestorRange: '>=10 <11',
  package: 'child',
  expectedOverride: '^5.0.9',
  safeRange: '>=5.0.9',
  rationale: 'Keep the selected parent major on the patched child release.',
  trackingIssue: 'https://github.com/RoboNater/MemoryMate2026/issues/42',
};

function fixtures() {
  return {
    report: {
      vulnerabilities: {
        'example-package': { via: [advisory] },
        parent: { via: ['example-package'] },
      },
    },
    baseline: {
      schemaVersion: 1,
      acceptedAdvisories: [acceptedAdvisory],
      protectedOverrides: [protection],
    },
    packageJson: {
      overrides: { 'parent@10': { child: '^5.0.9' } },
    },
    packageLock: {
      packages: {
        'node_modules/parent': { version: '10.2.0', dependencies: { child: '^5.0.5' } },
        'node_modules/child': { version: '5.0.9' },
      },
    },
  };
}

describe('audit baseline comparison', () => {
  test('matches root advisory identities without comparing derived counts', () => {
    const input = fixtures();
    const result = checkAuditBaseline(
      input.report,
      input.baseline,
      input.packageJson,
      input.packageLock,
    );

    expect(result.errors).toEqual([]);
    expect(result.rootAdvisoryCount).toBe(1);
    expect(result.affectedPackageEntries).toBe(2);
    expect(result.accepted).toHaveLength(1);
  });

  test('rejects a new advisory identity', () => {
    const input = fixtures();
    input.report.vulnerabilities.other = {
      via: [
        {
          ...advisory,
          dependency: 'other',
          name: 'other',
          url: 'https://github.com/advisories/GHSA-4444-5555-6666',
        },
      ],
    };

    const result = checkAuditBaseline(
      input.report,
      input.baseline,
      input.packageJson,
      input.packageLock,
    );

    expect(result.errors).toContainEqual(expect.stringContaining('new advisory GHSA-4444-5555-6666'));
  });

  test('rejects material changes to an accepted advisory', () => {
    const input = fixtures();
    input.report.vulnerabilities['example-package'].via[0] = { ...advisory, severity: 'critical' };

    const result = checkAuditBaseline(
      input.report,
      input.baseline,
      input.packageJson,
      input.packageLock,
    );

    expect(result.errors).toContain('GHSA-1111-2222-3333 changed materially: severity');
  });

  test('rejects a stale accepted advisory after it disappears', () => {
    const input = fixtures();
    input.report.vulnerabilities = {};

    const result = checkAuditBaseline(
      input.report,
      input.baseline,
      input.packageJson,
      input.packageLock,
    );

    expect(result.errors).toContainEqual(expect.stringContaining('is no longer reported'));
  });

  test('rejects an inert version-scoped override', () => {
    const input = fixtures();
    input.packageLock.packages['node_modules/parent'].version = '11.0.0';

    const result = checkAuditBaseline(
      input.report,
      input.baseline,
      input.packageJson,
      input.packageLock,
    );

    expect(result.errors).toContainEqual(expect.stringContaining('override may be inert'));
  });

  test('rejects a protected dependency below its safe range', () => {
    const input = fixtures();
    input.packageLock.packages['node_modules/child'].version = '5.0.8';

    const result = checkAuditBaseline(
      input.report,
      input.baseline,
      input.packageJson,
      input.packageLock,
    );

    expect(result.errors).toContainEqual(expect.stringContaining('outside safe range >=5.0.9'));
  });
});
