import '@fastify/cookie'

declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string>
  }
  interface FastifyReply {
    setCookie(name: string, value: string, options?: object): this
    clearCookie(name: string, options?: object): this
  }
}

