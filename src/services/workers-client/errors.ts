export class WorkersAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "WorkersAPIError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
