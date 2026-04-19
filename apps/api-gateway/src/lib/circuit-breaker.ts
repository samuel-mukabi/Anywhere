import CircuitBreaker from 'opossum';
import { request, Dispatcher } from 'undici';

interface ProxyRequestOptions {
  method: Dispatcher.HttpMethod;
  url: string;
  headers: IncomingHttpHeaders;
  body?: Dispatcher.DispatchOptions['body'];
}
import { IncomingHttpHeaders } from 'http';

/**
 * Service Configuration Registry
 * Maps prefix boundaries to specific downstream service endpoints.
 */
export const SERVICE_REGISTRY: Record<string, string> = {
  '/api/search': process.env.SEARCH_SERVICE_URL || 'http://localhost:8001',
  '/api/pricing': process.env.PRICING_SERVICE_URL || 'http://localhost:8002',
  '/api/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:8003',
};

// Cache to hold CircuitBreakers per target downstream URL
const circuitBreakers = new Map<string, CircuitBreaker>();

// Create the circuit breaker core async action to be wrapped
async function executeDownstreamRequest(opts: ProxyRequestOptions) {
  // Undici is ultra-performant Native Node HTTP Request lib
  const response = await request(opts.url, {
    method: opts.method,
    headers: opts.headers,
    body: opts.body,
    // Add additional timeouts so slow downstream doesn't backlog the gateway
    headersTimeout: 10000, 
    bodyTimeout: 15000,
  });

  if (response.statusCode >= 500) {
    // Treat any internal server error as a circuit breakable failure
    throw new Error(`Downstream Service Error: ${response.statusCode}`);
  }

  return response;
}

/**
 * Execute Proxy Request with Circuit Breaker protections
 * Identifies if a route should be routed and returns the undici request wrapped
 * safely inside the localized Opossum circuit breaker limits for that URL target.
 */
export async function executeWithCircuitBreaker(targetDownstreamUrl: string, opts: ProxyRequestOptions): Promise<Dispatcher.ResponseData> {
  let breaker = circuitBreakers.get(targetDownstreamUrl);

  if (!breaker) {
    // If we've not created an Opossum circuit breaker for this domain, construct it.
    breaker = new CircuitBreaker(executeDownstreamRequest, {
      timeout: 10000,             // Time it takes to conclude its a failure
      errorThresholdPercentage: 50, // If 50% fail, break it.
      resetTimeout: 30000,        // After 30s let 1 request verify if endpoint lives
    });

    breaker.fallback(() => {
      throw new Error('Service Unavailable - Circuit Breaker Open');
    });

    circuitBreakers.set(targetDownstreamUrl, breaker);
  }

  // Fire within the breaker context
  return (breaker.fire(opts) as unknown) as Promise<Dispatcher.ResponseData>;
}
