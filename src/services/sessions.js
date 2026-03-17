import { BaseService } from './base-service.js';

export class SessionsService extends BaseService {
  async terminateSession(sessionId) {
    return this.call('tonTerminateSession', { session_id: sessionId });
  }
}
