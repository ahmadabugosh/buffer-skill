import { describe, it, expect, vi } from 'vitest';
import { BufferApi, CREATE_POST_MUTATION } from '../lib/buffer-api.js';

describe('BufferApi', () => {
  it('returns profiles from GraphQL response', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          profiles: [{ id: 'p1', service: 'twitter', username: 'learnopenclaw' }],
        },
      },
    });

    const api = new BufferApi(
      { apiKey: 'valid_api_key_12345', apiUrl: 'https://api.buffer.com/graphql' },
      { post },
    );

    const profiles = await api.getProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('p1');
  });

  it('creates a post with GraphQL mutation', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          createPost: {
            id: 'post_123',
            text: 'Hello Buffer',
            scheduledAt: '2026-03-03T14:00:00Z',
            profiles: [{ id: 'p1', service: 'twitter' }],
          },
        },
      },
    });

    const api = new BufferApi(
      { apiKey: 'valid_api_key_12345', apiUrl: 'https://api.buffer.com/graphql' },
      { post },
    );

    const input = { text: 'Hello Buffer', profileIds: ['p1'] };
    const result = await api.createPost(input);

    expect(result.id).toBe('post_123');
    expect(post).toHaveBeenCalledWith('', {
      query: CREATE_POST_MUTATION,
      variables: { input },
    });
  });

  it('maps 401/403 to auth-friendly error', async () => {
    const post = vi.fn().mockRejectedValue({
      message: 'Request failed with status code 401',
      response: { status: 401 },
    });

    const api = new BufferApi(
      { apiKey: 'bad_key_12345', apiUrl: 'https://api.buffer.com/graphql' },
      { post },
    );

    await expect(api.getProfiles()).rejects.toThrow(/Authentication failed/);
  });
});
