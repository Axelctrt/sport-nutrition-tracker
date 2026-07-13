const STABLE_ZERO_MAJOR_VERSION = /^0\.(\d+)\.(\d+)$/;

export function isStableVersionAtLeast(version, minimumMinor) {
  const match = STABLE_ZERO_MAJOR_VERSION.exec(String(version));
  if (!match) return false;

  const minor = Number(match[1]);
  const patch = Number(match[2]);
  return Number.isInteger(minor)
    && Number.isInteger(patch)
    && minor >= minimumMinor;
}

export function stableVersionExpectation(minimumMinor) {
  return `une version stable 0.x.y à partir de 0.${minimumMinor}.0`;
}
