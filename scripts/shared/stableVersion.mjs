const SEMANTIC_VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

export function isStableVersionAtLeast(version, minimumMinor) {
  const match = SEMANTIC_VERSION.exec(String(version));
  if (!match) return false;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return Number.isInteger(major)
    && Number.isInteger(minor)
    && Number.isInteger(patch)
    && (major >= 1 || minor >= minimumMinor);
}

export function stableVersionExpectation(minimumMinor) {
  return `une version SemVer compatible à partir de 0.${minimumMinor}.0`;
}
