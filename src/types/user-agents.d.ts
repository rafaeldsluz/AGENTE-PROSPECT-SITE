declare module "user-agents" {
  interface UserAgentOptions {
    deviceCategory?: "desktop" | "mobile" | "tablet";
    [key: string]: unknown;
  }
  class UserAgent {
    constructor(options?: UserAgentOptions);
    toString(): string;
    data: { userAgent: string; [key: string]: unknown };
  }
  export = UserAgent;
}
