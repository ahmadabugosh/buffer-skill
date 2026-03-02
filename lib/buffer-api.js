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
        throw new Error(`Buffer API error: ${first.message}`);
      }

      return data.data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw new Error(
          `Authentication failed (${status}). Check BUFFER_API_KEY in .env and try again.`,
        );
      }

      if (status === 429) {
        throw new Error('Rate limit exceeded (429). Please wait and retry in about a minute.');
      }

      if (status) {
        throw new Error(`Buffer API request failed (${status}). ${error.message}`);
      }

      throw new Error(`Network error while calling Buffer API. ${error.message}`);
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
}

export { GET_PROFILES_QUERY, CREATE_POST_MUTATION };
