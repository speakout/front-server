import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as mime from 'mime'
import * as moment from 'moment'
import * as httpProxy from 'http-proxy'

const VERSION = '0.3.0'

const FAVICON = `AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAApzYMAKc2DACnNgxApzYNsKc2D2ynNg9kpzYNoKc2DDSnNgwAqzoQAAAAAAAAAAAAAAAAAAAAAAAAAAAApzYMAKc2DACnOgwEpzYNQKc2DtynNg18pzYNgKc2DwynNg64pzYM/Kc2DBCnNgwAAAAAAAAAAACnNgwApzYMBKc2DKynNg4gpzYOqKc2DYSnNgxApzIIAKc2DACnNgxopzYN+Kc2DzinNg5QpzYMnKM2DACnNgwApzYMGKc2DbCnNg84pzYObKc2DiinNg9MpzYMjKc2DAAAAAAApzYMAKs+CACnNgyspzYObKc2DzSnNg2cpzYMEKc2DLinNg88pzYNRKc2EAinNgxspzYPLKc2DNCnNgw0pzYNDKc2DXinNg1UpzYMkKc2DBSnNg1UpzYPNKc2DJynNgzcpzYPEKc2DGSnNgwApzYMaKc2DyCnNg0spzYOpKc2DxSnNg6gpzYOxKc2DyynNg04pzYMcKc2DxinNgzApzYM3Kc2DxCnNgxkpzYMAKc2DGinNg8YpzYN3Kc2DsCnNgxwpzYMAKc2DCCnNg5spzYOlKc2DICnNg8YpzYMwKc2DNynNg8QpzYMZKc2DACnNgxopzYPJKc2DPinNgzQpzYNpKc2DjinNg6spzYPZKc2DcCnNgx0pzYPGKc2DMCnNgzcpzYPEKc2DGSnNgwApzYMaKc2DyCnNg0wpzYO9Kc2DxCnNg5UpzYNyKc2DWynNgxwpzYMdKc2DxinNgzApzYM3Kc2DxCnNgxkpzYMAKc2DGinNg8cpzYNdKc2D1ynNg1YpzYMQKc2DJinNg7cpzYNaKc2DGynNg8YpzYMwKc2DNynNg8QpzYMZKc2DACnNgxYpzYOrKc2DMynNg3wpzYPLKc2DwinNg8spzYOkKc2DFynNgx0pzYPGKc2DMCnNgy0pzYPPKc2DVCnNgwUpzYMCKc2DEynNgwQpzYMEKc2DIinNgzYpzYMpKc2DCCnNgwYpzYNbKc2DzSnNgyYpzYMFKc2DaCnNg84pzYOdKc2DLinNhAEpzYMAAAAAAAAAAAApzYMAKc6EASnNgzEpzYOiKc2DzCnNg2IpzYMEKc2DACnNggApzYMnKc2DlSnNg88pzYN/Kc2DGinNhAApzYMAKc2DHCnNg4MpzYPQKc2DkCnNgyQqzoMAKc2DAAAAAAAAAAAAKc2DACnNgwQpzYNAKc2DrynNg8QpzYNhKc2DZSnNg8YpzYOsKc2DPCnNgwMpzYMAAAAAAAAAAAAAAAAAAAAAAAAAAAAo0IgAKc2DACnNgw0pzYNrKc2D2SnNg9cpzYNmKc2DDCnNgwAqzoYAAAAAAAAAAAAAAAAA+B8AAOAHAACAgQAAAcAAAAAAAAAQAAAAEEAAABAAAAAQAAAAEAAAABAAAAAAAAAAA8AAAIGBAADgBwAA+B8AAA==`

interface Condition {
  operator: string
  value: string
}

interface Action {
  name: string
  value: string[]
}

interface Location {
  condition: Condition
  actions: Action[]
}

interface Config {
  port: number
  locations: Location[]
}

let config: Config

let proxyServer = httpProxy.createProxyServer({})

proxyServer.on('error', (proxyRes, req, res) => {
  res.statusCode = 502
  res.setHeader('Content-Type', 'text/html')
  res.end(`<html>
<head><title>502 Bad Gateway</title></head>
<body bgcolor="white">
<center><h1>502 Bad Gateway</h1></center>
<hr><center>front-server/${VERSION}</center>
</body>
</html>`)
})

/**
 * http request class
 */
class Request {
  private vars = {
    $request_uri: '',
    $request_method: '',
    $http_user_agent: '',
    $host: '',
    $hostname: '',
    $uri: '',
    $args: '',
    $remote_addr: ''
  }

  private currentUri: string

  private logger(...args: string[]) {
    let info = [
      `[${moment().format('YYYY-MM-DD HH:mm:ss')}]`,
      this.vars.$request_method.padEnd(4),
      (this.res.statusCode + '').padEnd(5),
      this.vars.$remote_addr.padEnd(15),
      this.vars.$request_uri,
      ...args
    ]
    console.log(info.join(' '))
  }

  private err(code: number, message: string) {
    this.res.statusCode = code || 500
    this.logger()
    this.res.setHeader('Content-Type', 'text/html')
    this.res.end(`<html>
<head><title>${code} ${message}</title></head>
<body bgcolor="white">
<center><h1>${code} ${message}</h1></center>
<hr><center>front-server/${VERSION}</center>
</body>
</html>`)
  }

  private err404() {
    this.err(404, 'Not Found')
  }

  private err403() {
    this.err(403, 'Forbidden')
  }

  private asyncExists(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(filePath, exists => {
        resolve(exists)
      })
    })
  }

  private asyncStat(filePath: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(err)
        } else {
          resolve(stats)
        }
      })
    })
  }

  private async sendFile(filePath: string, index?: string) {
    try {
      index = index || 'index.html'
      let exists = await this.asyncExists(filePath)
      if (exists === false) {
        if (this.vars.$uri === '/favicon.ico') {
          let buf = Buffer.from(FAVICON, 'base64')
          this.res.setHeader('Content-Type', 'image/x-icon')
          this.res.end(buf)
          this.logger()
          return
        }
        return this.err404()
      }
      let stats = await this.asyncStat(filePath)
      let size = stats.size
      if (stats.isDirectory() === true) {
        if (this.vars.$uri.endsWith('/') === false) {
          this.res.statusCode = 301
          this.res.setHeader('Location', this.vars.$uri + '/' + this.vars.$args)
          this.res.end()
          return
        }
        let indexFile = path.join(filePath, index)
        let indexExists = await this.asyncExists(indexFile)
        if (indexExists === false) {
          return this.err403()
        }
        filePath = indexFile
        stats = await this.asyncStat(filePath)
        size = stats.size
      }
      let type = mime.getType(filePath) || 'application/octet-stream'
      this.res.setHeader('Content-Type', type)
      this.res.setHeader('Content-Length', size)
      fs.createReadStream(filePath)
        .on('error', error => {
          this.err(500, 'Internal Server Error')
        })
        .pipe(this.res)
      this.logger('->', filePath.replace(/\\/g, '/'))
    } catch (error) {
      this.err(500, 'Internal Server Error')
    }
  }

  /**
   * match location
   */
  private matchLocation(uri?: string) {
    uri = uri || this.currentUri
    let result: Location = null
    let locations = config.locations
    for (let i = 0; i < locations.length; i++) {
      let item = locations[i]
      if (item.condition.operator === '=' && uri === item.condition.value) {
        return result
      }
      if (['~', '~*'].indexOf(item.condition.operator) > -1) {
        let exp: RegExp
        if (item.condition.operator === '~') {
          exp = new RegExp(item.condition.value)
        }
        if (item.condition.operator === '~*') {
          exp = new RegExp(item.condition.value, 'i')
        }
        if (
          exp.test(uri) === true &&
          (result === null ||
            (result !== null &&
              ['~', '~*'].indexOf(result.condition.operator) > -1 &&
              item.condition.value.length > result.condition.value.length) ||
            (result !== null && result.condition.operator === ''))
        ) {
          result = item
        }
      }
      if (
        item.condition.operator === '' &&
        uri.toLowerCase().startsWith(item.condition.value.toLowerCase()) &&
        (result === null ||
          (result !== null &&
            result.condition.operator === '' &&
            item.condition.value.length > result.condition.value.length))
      ) {
        result = item
      }
    }
    return result
  }

  private getIndex(location: Location) {
    let index = 'index.html'
    for (let i = 0; i < location.actions.length; i++) {
      let action = location.actions[i]
      if (action.name === 'index') {
        index = action.value[0]
      }
    }
    return index
  }

  private getProxyHeader(location: Location) {
    let headers = {}
    for (let i = 0; i < location.actions.length; i++) {
      let action = location.actions[i]
      if (action.name === 'proxy_set_header') {
        headers[action.value[0]] = action.value[1]
      }
    }
    return headers
  }

  private getTryFiles(location: Location) {
    let files: string[] = null
    for (let i = 0; i < location.actions.length; i++) {
      let action = location.actions[i]
      if (action.name === 'try_files') {
        files = action.value
      }
    }
    return files
  }

  private getProxyPass(location: Location) {
    let proxy: string = null
    for (let i = 0; i < location.actions.length; i++) {
      let action = location.actions[i]
      if (action.name === 'proxy_pass') {
        proxy = action.value[0]
      }
    }
    return proxy
  }

  private getLocalFile(location: Location) {
    let filePath: string = null
    for (let i = 0; i < location.actions.length; i++) {
      let action = location.actions[i]
      if (action.name === 'root') {
        filePath = path.join(action.value[0], this.currentUri)
      }
      if (action.name === 'alias') {
        filePath = path.join(
          action.value[0],
          this.currentUri.replace(new RegExp(location.condition.value), '')
        )
      }
    }
    return filePath
  }

  private async matchAction(location: Location, tryFiles: boolean = true) {
    let proxy = this.getProxyPass(location)
    if (proxy !== null) {
      this.logger('->', proxy + this.currentUri)
      let headers = this.getProxyHeader(location)
      return proxyServer.web(this.req, this.res, {
        changeOrigin: true,
        target: proxy,
        headers: headers
      })
    }
    let local = this.getLocalFile(location)
    if (local !== null) {
      let index = this.getIndex(location)
      let files = this.getTryFiles(location)
      if (files !== null && tryFiles === true) {
        for (let i = 0; i < files.length; i++) {
          let file = files[i]
          for (let key in this.vars) {
            file = file.replace(key, this.vars[key])
          }
          this.currentUri = file
          if (i < files.length - 1) {
            let filePath = this.getLocalFile(location)
            let exists = await this.asyncExists(filePath)
            if (exists === true) {
              return this.sendFile(filePath, index)
            }
          } else {
            return this.matchAction(location, false)
          }
        }
      } else {
        return this.sendFile(local, index)
      }
    }
    return null
  }

  parse() {
    this.vars = {
      $request_uri: this.req.url,
      $uri: this.req.url.split('?')[0],
      $request_method: this.req.method,
      $http_user_agent: this.req.headers['user-agent'] as string,
      $host: this.req.headers['host'] as string,
      $hostname: (this.req.headers['host'] as string).replace(/(\:\d+)$/, ''),
      $remote_addr: this.req.connection.localAddress.replace('::ffff:', ''),
      $args:
        this.req.url.split('?').length > 1
          ? '?' + this.req.url.split('?')[1]
          : ''
    }
    this.res.setHeader('Server', `front-server/${VERSION}`)
    this.currentUri = this.vars.$uri
    let location = this.matchLocation()
    if (location !== null) {
      this.matchAction(location).then(result => {
        if (result === null) {
          return this.err404()
        }
      })
    } else {
      return this.err404()
    }
  }

  constructor(
    private req: http.IncomingMessage,
    private res: http.ServerResponse
  ) {}
}

/**
 * config file parser class
 */
class Parser {
  /**
   * config file content
   */
  private content: string

  /**
   * parse listen port
   */
  private getPort() {
    let str = this.content.trim()
    let exp = /listen\s*(\d+);/
    let result = str.match(exp)
    if (result !== null) {
      return parseInt(result[1])
    }
    return 3000
  }

  /**
   * parse locations
   * @param str
   */
  private getLocationGroup() {
    let str = this.content.trim()
    let exp = /location([^{]+)\{([^\}]+)\}/g
    let result = str.match(exp)
    if (result !== null) {
      let locations = result.map(item => {
        return this.getLocation(item)
      })
      return locations
    }
    return []
  }

  /**
   * parse one action
   * @param str
   */
  private getAction(str: string) {
    let exp = /(\w+)\s+([^;]+)/
    let result = str.match(exp)
    if (result !== null) {
      return {
        name: result[1],
        value: result[2].replace(/(\s{2,})/g, ' ').split(' ')
      }
    }
    return null
  }

  /**
   * parse location contents
   * @param str
   */
  private getActions(str: string) {
    let exp = /(\w+)\s+([^;]+)/g
    let result = str.match(exp)
    let rows: { name: string; value: string[] }[] = []
    if (result !== null) {
      result.forEach(item => {
        let val = this.getAction(item)
        if (val !== null) {
          rows.push(val)
        }
      })
    }
    return rows
  }

  /**
   * parse location expression
   * @param str
   */
  private getLocationExpression(str: string) {
    str = str.trim()
    let exp = /([=~*]{1,2})\s*(.+)/
    let result = str.match(exp)
    if (result !== null) {
      return {
        operator: result[1].trim(),
        value: result[2].trim()
      }
    } else {
      return {
        operator: '',
        value: str
      }
    }
  }

  /**
   * parse location blocks
   * @param string
   */
  private getLocation(str: string): Location {
    str = str.trim()
    let exp = /location([^{]+)\{([^\}]+)\}/
    let result = str.match(exp)
    if (result !== null) {
      let condition = this.getLocationExpression(result[1])
      let actions = this.getActions(result[2])
      return {
        condition: condition,
        actions: actions
      }
    }
  }

  /**
   * start parse
   */
  parse() {
    let port = this.getPort()
    let locations = this.getLocationGroup()
    return {
      port: port,
      locations: locations
    }
  }

  /**
   * constructor
   * @param content
   */
  constructor(content: string) {
    this.content = content.replace(/(#.*)$/gm, '')
  }
}

module.exports = {
  start(conf: string) {
    let content = fs.readFileSync(conf, 'utf-8')
    config = new Parser(content).parse()

    let server = http.createServer((req, res) => {
      let request = new Request(req, res)
      request.parse()
    })

    server.on('error', err => {
      console.trace(err)
      process.exit()
    })

    server.listen(config.port)
    console.log(`front-server listening on http://127.0.0.1:${config.port}/`)
  }
}
