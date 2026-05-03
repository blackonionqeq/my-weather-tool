import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { ServerConfig } from './config.js'
import type { RainAlertDatabase } from './db.js'
import { parseDeleteSubscriptionBody, parseUpsertSubscriptionBody } from './validation.js'

interface HttpServerDependencies {
  config: ServerConfig
  database: RainAlertDatabase
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function sendNoContent(response: ServerResponse): void {
  response.writeHead(204)
  response.end()
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = []
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

export function createHttpServer({ config, database }: HttpServerDependencies) {
  return createServer(async (request, response) => {
    const method = request.method ?? 'GET'
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

    try {
      if (url.pathname === '/api/rain-alert/public-key') {
        if (method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }

        sendJson(response, 200, { publicKey: config.vapidPublicKey })
        return
      }

      if (url.pathname === '/api/rain-alert/subscriptions') {
        if (method === 'POST') {
          const body = parseUpsertSubscriptionBody(await readJsonBody(request))
          database.upsertSubscription(body.subscription, body.location)
          sendJson(response, 200, { ok: true })
          return
        }

        if (method === 'DELETE') {
          const body = parseDeleteSubscriptionBody(await readJsonBody(request))
          database.deleteSubscription(body.endpoint)
          sendNoContent(response)
          return
        }

        response.writeHead(405, { allow: 'POST, DELETE' })
        response.end()
        return
      }

      if (url.pathname === '/api/rain-alert/subscriptions/delete') {
        if (method === 'POST') {
          const body = parseDeleteSubscriptionBody(await readJsonBody(request))
          database.deleteSubscription(body.endpoint)
          sendNoContent(response)
          return
        }
        
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }

      response.writeHead(404)
      response.end('Not found')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error'
      sendJson(response, 400, { error: message })
    }
  })
}