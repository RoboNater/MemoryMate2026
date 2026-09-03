const semver = require('semver');

const MATERIAL_FIELDS = [
  'package',
  'title',
  'severity',
  'vulnerableVersions',
  'cwes',
  'cvss',
  'nodes',
  'effects',
];

function advisoryId(advisory) {
  if (typeof advisory.url === 'string') {
    const match = advisory.url.match(/\/advisories\/([^/?#]+)/);
    if (match) return match[1];
  }

  return String(advisory.source);
}

function normalizeAdvisory(advisory, vulnerability = {}) {
  return {
    id: advisoryId(advisory),
    package: advisory.dependency ?? advisory.name,
    title: advisory.title,
    severity: advisory.severity,
    vulnerableVersions: advisory.range,
    cwes: [...(advisory.cwe ?? [])].sort(),
    cvss: {
      score: advisory.cvss?.score ?? null,
      vectorString: advisory.cvss?.vectorString ?? null,
    },
    nodes: [...(vulnerability.nodes ?? [])].sort(),
    effects: [...(vulnerability.effects ?? [])].sort(),
  };
}

function collectRootAdvisories(report) {
  const advisories = new Map();

  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== 'object' || via === null) continue;
      const advisory = normalizeAdvisory(via, vulnerability);
      const existing = advisories.get(advisory.id);
      if (existing) {
        advisory.nodes = [...new Set([...existing.nodes, ...advisory.nodes])].sort();
        advisory.effects = [...new Set([...existing.effects, ...advisory.effects])].sort();
      }
      advisories.set(advisory.id, advisory);
    }
  }

  return advisories;
}

function isPackagePath(packagePath, packageName) {
  return (
    packagePath === `node_modules/${packageName}` ||
    packagePath.endsWith(`/node_modules/${packageName}`)
  );
}

function resolveDependency(packages, parentPath, dependencyName) {
  let packagePath = parentPath;

  while (true) {
    const nestedPath = `${packagePath}/node_modules/${dependencyName}`;
    if (packages[nestedPath]) return { path: nestedPath, ...packages[nestedPath] };

    const marker = packagePath.lastIndexOf('/node_modules/');
    if (marker === -1) break;
    packagePath = packagePath.slice(0, marker);
  }

  const rootPath = `node_modules/${dependencyName}`;
  return packages[rootPath] ? { path: rootPath, ...packages[rootPath] } : null;
}

function getOverride(packageJson, protection) {
  const selectedOverride = packageJson.overrides?.[protection.overrideSelector];
  return Object.hasOwn(protection, 'ancestor')
    ? selectedOverride?.[protection.package]
    : selectedOverride;
}

function parseOverrideSelector(selector) {
  if (typeof selector !== 'string') return null;
  const separator = selector.lastIndexOf('@');
  if (separator <= 0 || separator === selector.length - 1) return null;

  const packageName = selector.slice(0, separator);
  const requestedRange = selector.slice(separator + 1);
  const installedRange = semver.validRange(requestedRange);
  return installedRange ? { packageName, requestedRange, installedRange } : null;
}

function validateProtection(protection) {
  const label = `${protection.overrideSelector ?? '<missing selector>'} -> ${protection.package ?? '<missing package>'}`;
  const errors = [];

  for (const field of ['overrideSelector', 'package', 'expectedOverride', 'safeRange']) {
    if (typeof protection[field] !== 'string' || !protection[field].trim()) {
      errors.push(`${label} needs a non-empty ${field}`);
    }
  }
  if (typeof protection.rationale !== 'string' || !protection.rationale.trim()) {
    errors.push(`${label} needs a rationale`);
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(protection.trackingIssue ?? '')) {
    errors.push(`${label} needs a full GitHub tracking issue URL`);
  }

  const hasAncestor = Object.hasOwn(protection, 'ancestor');
  if (hasAncestor) {
    if (typeof protection.ancestor !== 'string' || !protection.ancestor.trim()) {
      errors.push(`${label} needs a non-empty ancestor`);
    }
  }

  for (const field of ['selectedRange', 'ancestorRange']) {
    if (Object.hasOwn(protection, field)) {
      errors.push(`${label} must derive its selected range; remove ${field}`);
    }
  }

  if (typeof protection.safeRange === 'string' && semver.validRange(protection.safeRange) === null) {
    errors.push(`${label} has an invalid safeRange: ${protection.safeRange}`);
  }

  const selector = parseOverrideSelector(protection.overrideSelector);
  if (!selector) {
    errors.push(`${label} needs a version-selected overrideSelector`);
  } else {
    const selectedPackage = hasAncestor ? protection.ancestor : protection.package;
    if (selector.packageName !== selectedPackage) {
      errors.push(
        `${label} selects ${selector.packageName}, expected ${selectedPackage ?? '<missing package>'}`,
      );
    }
  }

  return errors;
}

function checkProtection(protection, packageJson, packageLock) {
  const errors = validateProtection(protection);
  const matches = [];
  if (errors.length > 0) return { errors, matches };

  const actualOverride = getOverride(packageJson, protection);
  const selector = parseOverrideSelector(protection.overrideSelector);

  if (actualOverride !== protection.expectedOverride) {
    errors.push(
      `${protection.overrideSelector} -> ${protection.package}: expected package.json override ` +
        `${JSON.stringify(protection.expectedOverride)}, found ${JSON.stringify(actualOverride)}`,
    );
  }

  const packages = packageLock.packages ?? {};
  if (!Object.hasOwn(protection, 'ancestor')) {
    for (const [packagePath, pkg] of Object.entries(packages)) {
      if (!isPackagePath(packagePath, protection.package)) continue;
      if (!semver.satisfies(pkg.version, selector.installedRange, { includePrerelease: true })) {
        continue;
      }

      matches.push({ dependencyPath: packagePath, dependencyVersion: pkg.version });
      if (!semver.satisfies(pkg.version, protection.safeRange, { includePrerelease: true })) {
        errors.push(
          `${packagePath}@${pkg.version} is outside safe range ${protection.safeRange}`,
        );
      }
    }

    if (matches.length === 0) {
      errors.push(
        `no installed ${protection.package} matches ${selector.requestedRange}; ` +
          'the version-scoped override may be inert',
      );
    }

    return { errors, matches };
  }

  for (const [packagePath, pkg] of Object.entries(packages)) {
    if (!isPackagePath(packagePath, protection.ancestor)) continue;
    if (!semver.satisfies(pkg.version, selector.installedRange, { includePrerelease: true })) continue;

    if (!Object.prototype.hasOwnProperty.call(pkg.dependencies ?? {}, protection.package)) {
      errors.push(
        `${packagePath}@${pkg.version} no longer declares ${protection.package}; ` +
          'review or remove the scoped override deliberately',
      );
      continue;
    }

    const dependency = resolveDependency(packages, packagePath, protection.package);
    if (!dependency) {
      errors.push(`${packagePath}@${pkg.version} cannot resolve ${protection.package}`);
      continue;
    }

    matches.push({
      ancestorPath: packagePath,
      ancestorVersion: pkg.version,
      dependencyPath: dependency.path,
      dependencyVersion: dependency.version,
    });

    if (!semver.satisfies(dependency.version, protection.safeRange, { includePrerelease: true })) {
      errors.push(
        `${packagePath}@${pkg.version} resolves ${protection.package}@${dependency.version}, ` +
          `outside safe range ${protection.safeRange}`,
      );
    }
  }

  if (matches.length === 0) {
    errors.push(
      `no installed ${protection.ancestor} matches ${selector.requestedRange}; ` +
        'the version-scoped override may be inert',
    );
  }

  return { errors, matches };
}

function validateBaseline(baseline) {
  const errors = [];
  const ids = new Set();

  if (baseline.schemaVersion !== 2) errors.push('baseline schemaVersion must be 2');

  for (const advisory of baseline.acceptedAdvisories ?? []) {
    if (ids.has(advisory.id)) errors.push(`duplicate accepted advisory ${advisory.id}`);
    ids.add(advisory.id);
    for (const field of ['id', 'package', 'title', 'severity', 'vulnerableVersions']) {
      if (typeof advisory[field] !== 'string' || !advisory[field].trim()) {
        errors.push(`${advisory.id ?? '<missing advisory>'} needs a non-empty ${field}`);
      }
    }
    for (const field of ['cwes', 'nodes', 'effects']) {
      if (!Array.isArray(advisory[field])) {
        errors.push(`${advisory.id ?? '<missing advisory>'} needs an array ${field}`);
      }
    }
    if (advisory.cvss === null || typeof advisory.cvss !== 'object') {
      errors.push(`${advisory.id ?? '<missing advisory>'} needs cvss metadata`);
    }
    if (typeof advisory.rationale !== 'string' || !advisory.rationale.trim()) {
      errors.push(`${advisory.id} needs a rationale`);
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(advisory.trackingIssue ?? '')) {
      errors.push(`${advisory.id} needs a full GitHub tracking issue URL`);
    }
  }

  return errors;
}

function checkAuditBaseline(report, baseline, packageJson, packageLock) {
  const errors = validateBaseline(baseline);
  const current = collectRootAdvisories(report);
  const rootAdvisoryCount = current.size;
  const accepted = [];

  for (const expected of baseline.acceptedAdvisories ?? []) {
    const actual = current.get(expected.id);
    if (!actual) {
      errors.push(
        `${expected.id} (${expected.package}) is no longer reported; remediate or remove its baseline entry`,
      );
      continue;
    }

    current.delete(expected.id);
    const changedFields = MATERIAL_FIELDS.filter(
      (field) => JSON.stringify(actual[field]) !== JSON.stringify(expected[field]),
    );
    if (changedFields.length > 0) {
      errors.push(`${expected.id} changed materially: ${changedFields.join(', ')}`);
    }
    accepted.push({ ...actual, rationale: expected.rationale, trackingIssue: expected.trackingIssue });
  }

  for (const advisory of current.values()) {
    errors.push(
      `new advisory ${advisory.id}: ${advisory.package} ${advisory.vulnerableVersions} ` +
        `(${advisory.severity}) — ${advisory.title}`,
    );
  }

  const protections = [];
  for (const protection of baseline.protectedOverrides ?? []) {
    const result = checkProtection(protection, packageJson, packageLock);
    errors.push(...result.errors);
    protections.push({ ...protection, matches: result.matches });
  }

  return {
    errors,
    accepted,
    protections,
    affectedPackageEntries: Object.keys(report.vulnerabilities ?? {}).length,
    rootAdvisoryCount,
  };
}

function isVulnerabilityReport(report) {
  return (
    report !== null &&
    typeof report === 'object' &&
    !report.error &&
    typeof report.vulnerabilities === 'object' &&
    report.vulnerabilities !== null &&
    !Array.isArray(report.vulnerabilities)
  );
}

module.exports = {
  MATERIAL_FIELDS,
  advisoryId,
  checkAuditBaseline,
  checkProtection,
  collectRootAdvisories,
  isVulnerabilityReport,
  normalizeAdvisory,
  resolveDependency,
};
