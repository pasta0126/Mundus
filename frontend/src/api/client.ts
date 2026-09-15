import createClient from 'openapi-fetch'
import type { paths } from './schema'

// Same-origin "/api" in both dev (Vite proxy) and prod (nginx proxy) - see
// vite.config.ts and frontend/nginx.conf.
export const api = createClient<paths>({ baseUrl: '/' })
