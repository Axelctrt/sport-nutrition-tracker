const SEMANTIC_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function hasValidPrereleaseIdentifiers(prerelease) {
  if (prerelease === undefined) return true;

  return prerelease.split('.').every((identifier) => (
    !/^\d+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0')
  ));
}

export function isStableVersionAtLeast(version, minimumMinor) {
  const match = SEMANTIC_VERSION.exec(String(version));
  if (
    !match
    || !Number.isSafeInteger(minimumMinor)
    || minimumMinor < 0
    || !hasValidPrereleaseIdentifiers(match[4])
  ) return false;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const versionCore = [major, minor, patch];
  const minimumCore = [0, minimumMinor, 0];

  if (!versionCore.every(Number.isSafeInteger)) return false;

  for (let index = 0; index < versionCore.length; index += 1) {
    if (versionCore[index] !== minimumCore[index]) {
      return versionCore[index] > minimumCore[index];
    }
  }

  // A prerelease has lower precedence than the stable version with the same core.
  return match[4] === undefined;
}

export function stableVersionExpectation(minimumMinor) {
  return `une version SemVer compatible à partir de 0.${minimumMinor}.0`;
}
