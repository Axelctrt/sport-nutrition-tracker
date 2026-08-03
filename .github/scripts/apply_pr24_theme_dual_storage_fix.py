from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one occurrence, found {count}')
    return source.replace(old, new, 1)


helper_path = Path('e2e/helpers/performanceGlass.ts')
helper_source = helper_path.read_text()
helper_source = replace_once(
    helper_source,
    "  if (persistedAppearance.deviceAppearance !== appearance) {",
    """  if (
    persistedAppearance.localAppearance !== appearance
    || persistedAppearance.deviceAppearance !== appearance
  ) {""",
    'dual storage stabilization condition',
)
helper_path.write_text(helper_source)

audit_path = Path('scripts/audit-release-consolidation.mjs')
audit_source = audit_path.read_text()
audit_source = replace_once(
    audit_source,
    "    'if (persistedAppearance.deviceAppearance !== appearance)',",
    """    'persistedAppearance.localAppearance !== appearance',
    'persistedAppearance.deviceAppearance !== appearance',""",
    'dual storage audit markers',
)
audit_path.write_text(audit_source)
