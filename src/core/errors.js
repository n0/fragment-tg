export class FragmentError extends Error {
  constructor(message, { method, response } = {}) {
    super(message);
    this.name = 'FragmentError';
    this.method = method;
    this.response = response;
  }
}

export class HashExpiredError extends FragmentError {
  constructor() {
    super('API hash expired');
    this.name = 'HashExpiredError';
  }
}

export class AuthError extends FragmentError {
  constructor(message) {
    super(message || 'Authentication failed — cookies may be invalid or expired');
    this.name = 'AuthError';
  }
}
