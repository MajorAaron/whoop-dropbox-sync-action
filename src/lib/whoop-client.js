/**
 * Whoop API Client
 * Handles authentication and data fetching from Whoop API v1
 */

const https = require('https');
const logger = require('../utils/logger');

class WhoopClient {
  constructor(clientId, clientSecret, refreshToken) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.accessToken = null;
    this.newRefreshToken = null;
    this.apiBase = 'https://api.prod.whoop.com';
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken() {
    logger.info('Refreshing access token...');
    
    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    const bodyString = data.toString();
    logger.debug('Token refresh body:', bodyString);

    try {
      const response = await this.makeRequest('/oauth/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(bodyString)
        },
        body: bodyString
      }, false);

      if (response.access_token) {
        this.accessToken = response.access_token;
        
        // Check if refresh token was rotated
        if (response.refresh_token && response.refresh_token !== this.refreshToken) {
          this.newRefreshToken = response.refresh_token;
          this.refreshToken = response.refresh_token;
          logger.info('Refresh token was rotated');
        }
        
        logger.success('Access token refreshed successfully');
        return true;
      }
    } catch (error) {
      logger.error('Failed to refresh access token:', error.message);
      throw error;
    }
    
    throw new Error('Failed to refresh access token - no token in response');
  }

  /**
   * Make an HTTP request to the Whoop API
   */
  async makeRequest(endpoint, options = {}, useAuth = true) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBase}${endpoint}`;
    
    logger.debug(`Making request to: ${url}`);
    
    const headers = {
      ...options.headers
    };
    
    if (useAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(parsed);
            } else if (res.statusCode === 401 && useAuth) {
              reject(new Error('Authentication failed - token may be expired'));
            } else {
              reject(new Error(`API error (${res.statusCode}): ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Fetch all data types from Whoop API
   */
  async fetchAllData(daysBack = 7) {
    // First ensure we have a valid access token
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const dateParams = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      limit: 25
    });

    logger.info(`Fetching Whoop data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`);
    
    try {
      // Fetch all data types in parallel
      const [profile, sleep, recovery, cycles, workouts, bodyMeasurements] = await Promise.all([
        // Profile doesn't need date params
        this.makeRequest('/developer/v1/user/profile/basic')
          .catch(async (error) => {
            if (error.message.includes('Authentication failed')) {
              logger.info('Token expired, refreshing and retrying...');
              await this.refreshAccessToken();
              return this.makeRequest('/developer/v1/user/profile/basic');
            }
            logger.error('Failed to fetch profile:', error.message);
            return null;
          }),
        
        // Sleep data
        this.makeRequest(`/developer/v1/activity/sleep?${dateParams}`)
          .catch(async (error) => {
            if (error.message.includes('Authentication failed')) {
              await this.refreshAccessToken();
              return this.makeRequest(`/developer/v1/activity/sleep?${dateParams}`);
            }
            logger.error('Failed to fetch sleep:', error.message);
            return { records: [] };
          }),
        
        // Recovery data - separate endpoint
        this.makeRequest(`/developer/v1/recovery?${dateParams}`)
          .catch(async (error) => {
            if (error.message.includes('Authentication failed')) {
              await this.refreshAccessToken();
              return this.makeRequest(`/developer/v1/recovery?${dateParams}`);
            }
            logger.error('Failed to fetch recovery:', error.message);
            return { records: [] };
          }),
        
        // Cycles (includes strain)
        this.makeRequest(`/developer/v1/cycle?${dateParams}`)
          .catch(async (error) => {
            if (error.message.includes('Authentication failed')) {
              await this.refreshAccessToken();
              return this.makeRequest(`/developer/v1/cycle?${dateParams}`);
            }
            logger.error('Failed to fetch cycles:', error.message);
            return { records: [] };
          }),
        
        // Workouts
        this.makeRequest(`/developer/v1/activity/workout?${dateParams}`)
          .catch(async (error) => {
            if (error.message.includes('Authentication failed')) {
              await this.refreshAccessToken();
              return this.makeRequest(`/developer/v1/activity/workout?${dateParams}`);
            }
            logger.error('Failed to fetch workouts:', error.message);
            return { records: [] };
          }),
        
        // Body measurements
        this.makeRequest(`/developer/v1/user/measurement/body?${dateParams}`)
          .catch(async (error) => {
            if (error.message.includes('Authentication failed')) {
              await this.refreshAccessToken();
              return this.makeRequest(`/developer/v1/user/measurement/body?${dateParams}`);
            }
            logger.error('Failed to fetch body measurements:', error.message);
            return { records: [] };
          })
      ]);

      return {
        profile,
        sleep: sleep.records || [],
        recovery: recovery.records || [],
        cycles: cycles.records || [],
        workouts: workouts.records || [],
        bodyMeasurements: bodyMeasurements.records || []
      };
    } catch (error) {
      logger.error('Error fetching data:', error.message);
      throw error;
    }
  }

  /**
   * Get the new refresh token if it was rotated
   */
  getNewRefreshToken() {
    return this.newRefreshToken;
  }
}

module.exports = WhoopClient;