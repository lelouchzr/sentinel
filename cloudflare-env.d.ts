declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS?: Fetcher;
    MODEL_API_KEY?: string;
  }
}
