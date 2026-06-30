import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { shareBackupFile } from '@/features/backup/shareBackupFile';

const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
const originalCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');

function defineNavigatorMethod(
  name: 'share' | 'canShare',
  value: unknown,
): void {
  Object.defineProperty(navigator, name, {
    configurable: true,
    value,
  });
}

function restoreNavigatorMethod(
  name: 'share' | 'canShare',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(navigator, name, descriptor);
    return;
  }

  Reflect.deleteProperty(navigator, name);
}

describe('shareBackupFile', () => {
  beforeEach(() => {
    defineNavigatorMethod('share', undefined);
    defineNavigatorMethod('canShare', undefined);
  });

  afterAll(() => {
    restoreNavigatorMethod('share', originalShare);
    restoreNavigatorMethod('canShare', originalCanShare);
  });

  it('partage un fichier JSON lorsque le navigateur le permet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    defineNavigatorMethod('share', share);
    defineNavigatorMethod('canShare', canShare);

    await expect(
      shareBackupFile('{"format":"sportpilot-backup"}', 'sportpilot-test.json'),
    ).resolves.toBe('shared');

    expect(canShare).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();

    const shareData = share.mock.calls[0]?.[0] as ShareData;
    expect(shareData.title).toBe('Sauvegarde SportPilot');
    expect(shareData.files).toHaveLength(1);
    expect(shareData.files?.[0]).toBeInstanceOf(File);
    expect(shareData.files?.[0]?.name).toBe('sportpilot-test.json');
    expect(shareData.files?.[0]?.type).toBe(
      'application/json;charset=utf-8',
    );
  });

  it('signale que le partage est indisponible sans API native', async () => {
    await expect(
      shareBackupFile('{}', 'sportpilot-test.json'),
    ).resolves.toBe('unsupported');
  });

  it('utilise le fallback lorsque le partage de fichiers est refusé', async () => {
    const share = vi.fn();
    defineNavigatorMethod('share', share);
    defineNavigatorMethod('canShare', vi.fn().mockReturnValue(false));

    await expect(
      shareBackupFile('{}', 'sportpilot-test.json'),
    ).resolves.toBe('unsupported');
    expect(share).not.toHaveBeenCalled();
  });

  it('ne traite pas une annulation utilisateur comme une erreur', async () => {
    defineNavigatorMethod(
      'share',
      vi.fn().mockRejectedValue(new DOMException('Annulé', 'AbortError')),
    );
    defineNavigatorMethod('canShare', vi.fn().mockReturnValue(true));

    await expect(
      shareBackupFile('{}', 'sportpilot-test.json'),
    ).resolves.toBe('cancelled');
  });

  it('propage une erreur technique réelle', async () => {
    defineNavigatorMethod(
      'share',
      vi.fn().mockRejectedValue(new Error('Partage indisponible')),
    );
    defineNavigatorMethod('canShare', vi.fn().mockReturnValue(true));

    await expect(
      shareBackupFile('{}', 'sportpilot-test.json'),
    ).rejects.toThrow('Partage indisponible');
  });
});
