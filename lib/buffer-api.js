import axios from 'axios';

const GET_PROFILES_QUERY = `
  query GetProfiles {
    profiles {
      id
      service
      username
    }
  }
`;

const CREATE_POST_MUTATION = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      text
      scheduledAt
      profiles {
        id
        service
      }
    }
  }
`;

const GET_SCHEDULED_POSTS_QUERY = `
  query GetScheduledPosts($profileId: ID) {
    scheduledPosts(profileId: $profileId) {
      id
      text
      scheduledAt
      profiles {
        service
        username
      }
    }
  }
`;

const CREATE_IDEA_MUTATION = `
  mutation CreateIdea($input: CreateIdeaInput!) {
    createIdea(input: $input) {
      id
      text
    }
  }
`;

const GET_IDEAS_QUERY = `
  query GetIdeas {
    ideas {
      id
      text
      createdAt
    }
  }
`;

function formatActionableError(whatFailed, reason, fixes) {
  return [
    `Failed: ${whatFailed}`,
    `Reason: ${reason}`,
    'Fix:',
    ...fixes.map((fix, index) => `${index + 1}. ${fix}`),
  ].join('\n');
}

export class BufferApi {
  /**
   * @param {{apiKey: string, apiUrl: string}} config
   * @param {import('axios').AxiosInstance} [httpClient]
   */
  constructor(config, httpClient) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.http =
      httpClient ||
      axios.create({
        baseURL: this.apiUrl,
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
  }

  async gql(query, variables = {}) {
    try {
      const { data } = await this.http.post('', { query, variables });

      if (data.errors?.length) {
        const first = data.errors[0];
        throw new Error(
          formatActionableError('Buffer GraphQL request', first.message, [
            'Verify your input values (profile IDs, date format, and required fields).',
            'Check Buffer API docs: https://developers.buffer.com/',
          ]),
        );
      }

      return data.data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw new Error(
          formatActionableError(`Buffer API request (${status})`, 'Authentication failed', [
            'Check BUFFER_API_KEY in .env.',
            'Generate a new key at https://publish.buffer.com/settings/api if needed.',
            'Retry the command after updating your key.',
          ]),
        );
      }

      if (status === 429) {
        throw new Error(
          formatActionableError('Buffer API request (429)', 'Rate limit exceeded', [
            'Wait about 60 seconds before retrying.',
            'Reduce request bursts when scripting multiple commands.',
          ]),
        );
      }

      if (status) {
        throw new Error(
          formatActionableError(`Buffer API request (${status})`, error.message, [
            'Retry in a moment in case the API is temporarily unavailable.',
            'If this keeps happening, check Buffer status/docs for incident details.',
          ]),
        );
      }

      throw new Error(
        formatActionableError('Buffer API network call', error.message, [
          'Check internet connectivity or VPN/proxy settings.',
          'Retry the command. If it times out repeatedly, increase network stability.',
        ]),
      );
    }
  }

  async getProfiles() {
    const data = await this.gql(GET_PROFILES_QUERY);
    return data.profiles || [];
  }

  /**
   * @param {{text: string, profileIds: string[], scheduledAt?: string, queue?: boolean}} input
   */
  async createPost(input) {
    const data = await this.gql(CREATE_POST_MUTATION, { input });
    return data.createPost;
  }

  /**
   * @param {string | undefined} profileId
   */
  async getScheduledPosts(profileId) {
    const data = await this.gql(GET_SCHEDULED_POSTS_QUERY, { profileId });
    return data.scheduledPosts || [];
  }

  /**
   * @param {{text: string, profileIds?: string[]}} input
   */
  async createIdea(input) {
    const data = await this.gql(CREATE_IDEA_MUTATION, { input });
    return data.createIdea;
  }

  async getIdeas() {
    const data = await this.gql(GET_IDEAS_QUERY);
    return data.ideas || [];
  }
}

export {
  GET_PROFILES_QUERY,
  CREATE_POST_MUTATION,
  GET_SCHEDULED_POSTS_QUERY,
  CREATE_IDEA_MUTATION,
  GET_IDEAS_QUERY,
};
