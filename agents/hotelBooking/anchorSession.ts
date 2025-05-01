import axios from 'axios';

export interface AnchorSession {
  id: string;
  cdp_url: string;
  live_view_url: string;
}

class AnchorSessionManager {
  private session: AnchorSession | null = null;
  private sessionId: string | null = null;
  private apiKey: string | null = null;

  async initializeSession(apiKey: string): Promise<AnchorSession> {
    if (this.session && this.apiKey === apiKey) {
      return this.session;
    }
    try {
      const resp = await axios.post(
        'https://api.anchorbrowser.io/v1/sessions',
        {
          session: {
            proxy: { type: 'anchor_residential' },
            recording: { active: false },
            live_view: { read_only: true },
          },
          browser: {
            headless: {
              active: false
            }
          }
        },
        { 
          headers: {
            'anchor-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = resp.data;
      this.session = data.data;
      this.sessionId = data.data.id;
      this.apiKey = apiKey;
      if (this.session) {
        return this.session;
      }
      throw new Error('Session creation failed: session is null');
    } catch (err: any) {
      console.error('Full error details:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      }
      throw new Error(`Failed to create session: ${err.message || err}`);
    }
  }

  async performWebTask(apiKey: string, url: string, prompt: string): Promise<any> {
    if (!this.sessionId) throw new Error('Session not initialized');
    try {
      const resp = await axios.post(
        `https://api.anchorbrowser.io/v1/tools/perform-web-task?sessionId=${this.sessionId}`,
        {
          url,
          prompt,
        },
        {
          headers: {
            'anchor-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      return resp.data.data;
    } catch (err: any) {
      throw new Error(`Failed to perform web task: ${err.message || err}`);
    }
  }

  async deleteSession(apiKey: string): Promise<void> {
    if (!this.sessionId) return;
    try {
      const resp = await axios.delete(
        `https://api.anchorbrowser.io/v1/sessions/${this.sessionId}`,
        {
          headers: {
            'anchor-api-key': apiKey,
          },
          timeout: 10000
        }
      );
      if (resp.data?.data?.status !== 'success') {
        throw new Error(`Failed to delete session: ${JSON.stringify(resp.data)}`);
      }
      this.session = null;
      this.sessionId = null;
      this.apiKey = null;
    } catch (err: any) {
      throw new Error(`Failed to delete session: ${err.message || err}`);
    }
  }
}

export const anchorSessionManager = new AnchorSessionManager();
