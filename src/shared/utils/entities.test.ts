import { describe, expect, it, vi } from 'vitest';
import { createEntityId } from '@/shared/utils/entities';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createEntityId', () => {
  it('utilise randomUUID lorsqu’il est disponible', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');

    expect(createEntityId({ randomUUID })).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('génère un UUID v4 avec getRandomValues lorsque randomUUID est indisponible', () => {
    const fillRandomBytes = vi.fn((bytes: Uint8Array<ArrayBuffer>) => {
      bytes.forEach((_, index) => {
        bytes[index] = index + 1;
      });
    });

    const id = createEntityId({ fillRandomBytes });

    expect(id).toMatch(UUID_V4_PATTERN);
    expect(fillRandomBytes).toHaveBeenCalledOnce();
  });

  it('reste utilisable sans Web Crypto pour les contextes de développement non sécurisés', () => {
    const id = createEntityId(undefined);

    expect(id).toMatch(UUID_V4_PATTERN);
  });
});
