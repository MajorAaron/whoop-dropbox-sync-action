const https = require('https');
const path = require('path');

class DropboxClient {
  constructor(appKey, appSecret, accessToken, refreshToken, tokenManager) {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenManager = tokenManager;
  }

  async request(endpoint, options = {}, retryOnAuth = true) {
    const apiType = options.apiType || 'api';
    const hostname = apiType === 'content' ? 'content.dropboxapi.com' : 'api.dropboxapi.com';

    const requestOptions = {
      hostname,
      path: endpoint,
      method: options.method || 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    };

    if (options.body && apiType !== 'content') {
      const bodyStr = JSON.stringify(options.body);
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    return new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
          if (res.statusCode === 401 && retryOnAuth && this.refreshToken) {
            console.log('Access token expired, refreshing...');
            await this.refreshAccessToken();
            const retryResult = await this.request(endpoint, options, false);
            resolve(retryResult);
            return;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = data ? JSON.parse(data) : {};
              if (res.headers['dropbox-api-result']) {
                result.metadata = JSON.parse(res.headers['dropbox-api-result']);
              }
              resolve(result);
            } catch (e) {
              resolve({ content: data, headers: res.headers });
            }
          } else {
            reject(new Error(`Dropbox API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);

      if (options.body && apiType !== 'content') {
        req.write(JSON.stringify(options.body));
      } else if (options.content) {
        req.write(options.content);
      }

      req.end();
    });
  }

  async refreshAccessToken() {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.appKey,
      client_secret: this.appSecret
    });

    const requestOptions = {
      hostname: 'api.dropbox.com',
      path: '/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(params.toString())
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            this.accessToken = response.access_token;
            
            if (this.tokenManager) {
              this.tokenManager.setNewTokens(response.access_token, response.refresh_token || this.refreshToken);
            }
            
            console.log('Access token refreshed successfully');
            resolve(response);
          } else {
            reject(new Error(`Failed to refresh token: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(params.toString());
      req.end();
    });
  }

  async uploadFile(dropboxPath, content) {
    const args = {
      path: dropboxPath,
      mode: 'overwrite',
      autorename: false,
      mute: false
    };

    return await this.request('/2/files/upload', {
      apiType: 'content',
      headers: {
        'Dropbox-API-Arg': JSON.stringify(args),
        'Content-Type': 'application/octet-stream'
      },
      content: Buffer.from(content, 'utf-8')
    });
  }

  async createFolder(dropboxPath) {
    try {
      return await this.request('/2/files/create_folder_v2', {
        body: {
          path: dropboxPath,
          autorename: false
        }
      });
    } catch (error) {
      if (error.message.includes('409')) {
        console.log(`Folder already exists: ${dropboxPath}`);
        return { metadata: { path_lower: dropboxPath.toLowerCase() } };
      }
      throw error;
    }
  }

  async ensurePathExists(filePath) {
    const parts = path.dirname(filePath).split('/').filter(p => p);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      await this.createFolder(currentPath);
    }
  }

  async testConnection() {
    try {
      const result = await this.request('/2/users/get_current_account', {
        body: null
      });
      console.log(`Connected to Dropbox as: ${result.name.display_name}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to Dropbox:', error.message);
      return false;
    }
  }
}

module.exports = DropboxClient;