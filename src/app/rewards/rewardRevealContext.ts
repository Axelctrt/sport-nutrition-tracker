import { routePaths } from "@/app/routePaths";

export function rewardRevealContextIsSafe(
  pathname: string,
  root: Document = document,
): boolean {
  if (pathname !== routePaths.dashboard && pathname !== routePaths.rewards) {
    return false;
  }
  const activeElement = root.activeElement;
  if (
    activeElement instanceof HTMLInputElement
    || activeElement instanceof HTMLTextAreaElement
    || activeElement instanceof HTMLSelectElement
    || (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  ) {
    return false;
  }
  return root.querySelector([
    '[role="dialog"]',
    '[aria-busy="true"]',
    "[data-bottom-sheet-content]",
    "form[data-submitting='true']",
  ].join(",")) === null;
}
