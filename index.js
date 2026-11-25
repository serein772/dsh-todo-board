/**
 * Host half of the Todo Board bundle.
 *
 * It owns one small durable task store (`<dsh home>/todo-board/state.json`), the
 * two same-origin HTTP routes the browser half reads and mutates it through, and a
 * route that serves the bundled OFL display font. Keeping the data on the Host
 * side means the list survives a browser restart, a changed GUI port, or a
 * different browser pointed at the same Harness home.
 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const STATE_ROUTE = '/todo-board/state'
const MUTATE_ROUTE = '/todo-board/mutate'
const FONT_ROUTE = '/todo-board/font'
const FONT_DIRECTORY = new URL('./fonts/', import.meta.url)
const FONT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:ttf|otf|woff2?)$/
const FONT_CONTENT_TYPES = Object.freeze({
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
})
const DATA_DIRECTORY = 'todo-board'
const BODY_LIMIT = 32 * 1024
const TEXT_LIMIT = 500
const MAX_TODOS = 500
const STATE_VERSION = 2

function dataFile(ctx) {
  const resolveHome = ctx.get('dshHomePath')
  if (typeof resolveHome === 'function') return join(resolveHome(DATA_DIRECTORY), 'state.json')
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, DATA_DIRECTORY, 'state.json')
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function cleanText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, TEXT_LIMIT)
}

/** Accept only a real local calendar day (`YYYY-MM-DD`); anything else means "no date". */
function cleanDate(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return value
}

function normalizeTodo(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const text = cleanText(raw.text)
  if (text === '') return null
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt !== '' ? raw.createdAt : new Date().toISOString()
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt !== '' ? raw.updatedAt : createdAt
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : randomUUID(),
    text,
    done: raw.done === true,
    dueDate: cleanDate(raw.dueDate),
    createdAt,
    updatedAt,
  }
}

function applyOperation(todos, operation) {
  if (operation === null || typeof operation !== 'object') throw httpError(400, 'invalid operation')
  const kind = operation.kind
  const now = new Date().toISOString()
  const id = typeof operation.id === 'string' ? operation.id : ''

  if (kind === 'add') {
    const text = cleanText(operation.text)
    if (text === '') throw httpError(400, 'empty text')
    if (todos.length >= MAX_TODOS) throw httpError(409, 'too many todos')
    return [
      ...todos,
      { id: randomUUID(), text, done: false, dueDate: cleanDate(operation.dueDate), createdAt: now, updatedAt: now },
    ]
  }
  if (kind === 'clearDone') return todos.filter((todo) => !todo.done)
  if (kind !== 'toggle' && kind !== 'edit' && kind !== 'remove' && kind !== 'schedule') {
    throw httpError(400, 'unknown operation')
  }

  const index = todos.findIndex((todo) => todo.id === id)
  if (index === -1) throw httpError(404, 'todo not found')
  if (kind === 'remove') return todos.filter((todo) => todo.id !== id)
  if (kind === 'schedule') {
    const dueDate = cleanDate(operation.dueDate)
    return todos.map((todo) => (todo.id === id ? { ...todo, dueDate, updatedAt: now } : todo))
  }
  if (kind === 'toggle') {
    return todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done, updatedAt: now } : todo))
  }
  const text = cleanText(operation.text)
  if (text === '') throw httpError(400, 'empty text')
  return todos.map((todo) => (todo.id === id ? { ...todo, text, updatedAt: now } : todo))
}

function createStore(ctx, file) {
  let todos = null
  let queue = Promise.resolve()

  const load = async () => {
    if (todos !== null) return todos
    let raw
    try {
      raw = await readFile(file, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        ctx.logger?.warn?.(`todo-board: cannot read ${file}: ${error?.message ?? String(error)}`)
      }
      todos = []
      return todos
    }
    try {
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed?.todos) ? parsed.todos : []
      todos = list.map(normalizeTodo).filter((todo) => todo !== null).slice(0, MAX_TODOS)
    } catch (error) {
      ctx.logger?.warn?.(`todo-board: ${file} is not valid JSON, starting empty: ${error?.message ?? String(error)}`)
      try {
        await rename(file, `${file}.corrupt-${Date.now()}`)
      } catch (backupError) {
        ctx.logger?.warn?.(`todo-board: cannot back up the unreadable state file: ${backupError?.message ?? String(backupError)}`)
      }
      todos = []
    }
    return todos
  }

  const persist = async (next) => {
    await mkdir(dirname(file), { recursive: true })
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`
    await writeFile(temporary, `${JSON.stringify({ version: STATE_VERSION, todos: next }, null, 2)}\n`, 'utf8')
    await rename(temporary, file)
  }

  /** Serialize every read-modify-write so two clicks cannot interleave. */
  const mutate = (operation) => {
    const run = queue.then(async () => {
      const current = await load()
      const next = applyOperation(current, operation)
      await persist(next)
      todos = next
      return next
    })
    queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  return { load, mutate }
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.byteLength),
    'cache-control': 'no-store',
  })
  res.end(body)
}

/**
 * Refuse a request that the Web carrier does not trust. Fails closed when the
 * connection service is missing, because these routes read and write user data.
 */
function refused(ctx, req, res) {
  const connection = ctx.get('connection')
  let rejection
  if (connection && typeof connection.requestRejection === 'function') {
    try {
      // The shipped gate reads the request's headers; pass the request itself so
      // the check keeps working if the implementation starts reading more of it.
      rejection = connection.requestRejection(req)
    } catch (error) {
      ctx.logger?.warn?.(`todo-board: trust check failed: ${error?.message ?? String(error)}`)
      rejection = 403
    }
  } else {
    rejection = 403
  }
  if (rejection === undefined || rejection === null) return false
  sendJson(res, rejection, { ok: false, error: rejection === 401 ? 'unauthorized' : 'forbidden' })
  return true
}

function readJsonBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    let settled = false
    req.on('data', (chunk) => {
      if (settled || tooLarge) return
      size += chunk.length
      if (size > limit) {
        tooLarge = true
        return
      }
      chunks.push(Buffer.from(chunk))
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      if (tooLarge) {
        reject(httpError(413, 'request body too large'))
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (parsed === null || typeof parsed !== 'object') throw new Error('not an object')
        resolve(parsed)
      } catch {
        reject(httpError(400, 'invalid json body'))
      }
    })
    req.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
  })
}

async function runHandler(res, work) {
  try {
    await work()
  } catch (error) {
    if (res.headersSent) {
      res.destroy()
      return
    }
    sendJson(res, error?.status ?? 500, { ok: false, error: String(error?.message ?? error) })
  }
}

export function apply(ctx) {
  const store = createStore(ctx, dataFile(ctx))
  const fontCache = new Map()

  const fontPayload = async (name) => {
    const cached = fontCache.get(name)
    if (cached !== undefined) return cached
    const bytes = await readFile(new URL(name, FONT_DIRECTORY))
    fontCache.set(name, bytes)
    return bytes
  }

  // The web server may be provided after this plugin activates on a cold start, so
  // wait for the service instead of reading it once: ctx.get('webServer') would have
  // returned undefined and the routes would silently never register.
  ctx.inject(['webServer'], (child) => {
    child.effect(() => {
      const server = child.webServer
      if (!server || typeof server.register !== 'function') {
        child.logger?.warn?.('todo-board: the web server service carries no route registry')
        return undefined
      }

      const disposers = [
        server.register({
          kind: 'exact',
          path: STATE_ROUTE,
          handler: (req, res) => {
            if (refused(ctx, req, res)) return
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.writeHead(405, { allow: 'GET, HEAD' })
              res.end()
              return
            }
            void runHandler(res, async () => {
              const todos = await store.load()
              sendJson(res, 200, { ok: true, todos })
            })
          },
        }),
        server.register({
          kind: 'exact',
          path: MUTATE_ROUTE,
          handler: (req, res) => {
            if (refused(ctx, req, res)) return
            if (req.method !== 'POST') {
              res.writeHead(405, { allow: 'POST' })
              res.end()
              return
            }
            void runHandler(res, async () => {
              const operation = await readJsonBody(req, BODY_LIMIT)
              const todos = await store.mutate(operation)
              sendJson(res, 200, { ok: true, todos })
            })
          },
        }),
        // Public assets from this package (`<route>/<file name>`), so they stay
        // outside the trust fence: no user data is involved and a browser font fetch
        // must never be able to fail on a cookie detail. Adding another font later
        // needs no Host change: drop the file into fonts/ and serve it by name.
        server.register({
          kind: 'prefix',
          path: FONT_ROUTE,
          handler: (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.writeHead(405, { allow: 'GET, HEAD' })
              res.end()
              return
            }
            void runHandler(res, async () => {
              const raw = new URL(req.url ?? '/', 'http://todo-board').pathname.slice(FONT_ROUTE.length + 1)
              let name = ''
              try {
                name = decodeURIComponent(raw)
              } catch {
                name = ''
              }
              if (!FONT_NAME_PATTERN.test(name)) {
                res.writeHead(404)
                res.end()
                return
              }
              let bytes
              try {
                bytes = await fontPayload(name)
              } catch (error) {
                if (error?.code === 'ENOENT') {
                  res.writeHead(404)
                  res.end()
                  return
                }
                throw error
              }
              const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
              res.writeHead(200, {
                'content-type': FONT_CONTENT_TYPES[extension] ?? 'application/octet-stream',
                'content-length': String(bytes.byteLength),
                'cache-control': 'public, max-age=31536000, immutable',
              })
              res.end(req.method === 'HEAD' ? undefined : bytes)
            })
          },
        }),
      ]

      return () => {
        for (const dispose of disposers) {
          try {
            dispose()
          } catch (error) {
            child.logger?.warn?.(`todo-board: route disposal failed: ${error?.message ?? String(error)}`)
          }
        }
      }
    }, 'todo-board: host routes')
  })
}
