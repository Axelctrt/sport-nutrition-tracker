const storedPositions = new Map<string, number>();

export function saveScrollPosition(key: string, position: number): void {
  storedPositions.set(key, position);
}

export function getScrollPosition(key: string): number | undefined {
  return storedPositions.get(key);
}

export function clearStoredScrollPositions(): void {
  storedPositions.clear();
}
