"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const http = require("http");
const mime = require("mime");
const moment = require("moment");
const httpProxy = require("http-proxy");
const FAVICON = `AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAApzYMAKc2DACnNgxApzYNsKc2D2ynNg9kpzYNoKc2DDSnNgwAqzoQAAAAAAAAAAAAAAAAAAAAAAAAAAAApzYMAKc2DACnOgwEpzYNQKc2DtynNg18pzYNgKc2DwynNg64pzYM/Kc2DBCnNgwAAAAAAAAAAACnNgwApzYMBKc2DKynNg4gpzYOqKc2DYSnNgxApzIIAKc2DACnNgxopzYN+Kc2DzinNg5QpzYMnKM2DACnNgwApzYMGKc2DbCnNg84pzYObKc2DiinNg9MpzYMjKc2DAAAAAAApzYMAKs+CACnNgyspzYObKc2DzSnNg2cpzYMEKc2DLinNg88pzYNRKc2EAinNgxspzYPLKc2DNCnNgw0pzYNDKc2DXinNg1UpzYMkKc2DBSnNg1UpzYPNKc2DJynNgzcpzYPEKc2DGSnNgwApzYMaKc2DyCnNg0spzYOpKc2DxSnNg6gpzYOxKc2DyynNg04pzYMcKc2DxinNgzApzYM3Kc2DxCnNgxkpzYMAKc2DGinNg8YpzYN3Kc2DsCnNgxwpzYMAKc2DCCnNg5spzYOlKc2DICnNg8YpzYMwKc2DNynNg8QpzYMZKc2DACnNgxopzYPJKc2DPinNgzQpzYNpKc2DjinNg6spzYPZKc2DcCnNgx0pzYPGKc2DMCnNgzcpzYPEKc2DGSnNgwApzYMaKc2DyCnNg0wpzYO9Kc2DxCnNg5UpzYNyKc2DWynNgxwpzYMdKc2DxinNgzApzYM3Kc2DxCnNgxkpzYMAKc2DGinNg8cpzYNdKc2D1ynNg1YpzYMQKc2DJinNg7cpzYNaKc2DGynNg8YpzYMwKc2DNynNg8QpzYMZKc2DACnNgxYpzYOrKc2DMynNg3wpzYPLKc2DwinNg8spzYOkKc2DFynNgx0pzYPGKc2DMCnNgy0pzYPPKc2DVCnNgwUpzYMCKc2DEynNgwQpzYMEKc2DIinNgzYpzYMpKc2DCCnNgwYpzYNbKc2DzSnNgyYpzYMFKc2DaCnNg84pzYOdKc2DLinNhAEpzYMAAAAAAAAAAAApzYMAKc6EASnNgzEpzYOiKc2DzCnNg2IpzYMEKc2DACnNggApzYMnKc2DlSnNg88pzYN/Kc2DGinNhAApzYMAKc2DHCnNg4MpzYPQKc2DkCnNgyQqzoMAKc2DAAAAAAAAAAAAKc2DACnNgwQpzYNAKc2DrynNg8QpzYNhKc2DZSnNg8YpzYOsKc2DPCnNgwMpzYMAAAAAAAAAAAAAAAAAAAAAAAAAAAAo0IgAKc2DACnNgw0pzYNrKc2D2SnNg9cpzYNmKc2DDCnNgwAqzoYAAAAAAAAAAAAAAAAA+B8AAOAHAACAgQAAAcAAAAAAAAAQAAAAEEAAABAAAAAQAAAAEAAAABAAAAAAAAAAA8AAAIGBAADgBwAA+B8AAA==`;
let config;
let proxyServer = httpProxy.createProxyServer({});
proxyServer.on('error', (proxyRes, req, res) => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html>
<head><title>502 Bad Gateway</title></head>
<body bgcolor="white">
<center><h1>502 Bad Gateway</h1></center>
<hr><center>front-server</center>
</body>
</html>`);
});
class Request {
    constructor(req, res) {
        this.req = req;
        this.res = res;
        this.vars = {
            $request_uri: '',
            $request_method: '',
            $http_user_agent: '',
            $host: '',
            $hostname: '',
            $uri: '',
            $args: '',
            $remote_addr: ''
        };
    }
    logger(...args) {
        let info = [
            `[${moment().format('YYYY-MM-DD HH:mm:ss')}]`,
            this.vars.$request_method.padEnd(4),
            (this.res.statusCode + '').padEnd(5),
            this.vars.$remote_addr.padEnd(15),
            this.vars.$request_uri,
            ...args
        ];
        console.log(info.join(' '));
    }
    err(code, message) {
        this.res.statusCode = code || 500;
        this.logger();
        this.res.setHeader('Content-Type', 'text/html');
        this.res.end(`<html>
<head><title>${code} ${message}</title></head>
<body bgcolor="white">
<center><h1>${code} ${message}</h1></center>
<hr><center>front-server</center>
</body>
</html>`);
    }
    err404() {
        this.err(404, 'Not Found');
    }
    err403() {
        this.err(403, 'Forbidden');
    }
    asyncExists(filePath) {
        return new Promise((resolve, reject) => {
            fs.exists(filePath, exists => {
                resolve(exists);
            });
        });
    }
    asyncStat(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(stats);
                }
            });
        });
    }
    async sendFile(filePath, index) {
        try {
            index = index || 'index.html';
            let exists = await this.asyncExists(filePath);
            if (exists === false) {
                if (this.vars.$uri === '/favicon.ico') {
                    let buf = Buffer.from(FAVICON, 'base64');
                    this.res.setHeader('Content-Type', 'image/x-icon');
                    this.res.end(buf);
                    this.logger();
                    return;
                }
                return this.err404();
            }
            let stats = await this.asyncStat(filePath);
            let size = stats.size;
            if (stats.isDirectory() === true) {
                if (this.vars.$uri.endsWith('/') === false) {
                    this.res.statusCode = 301;
                    this.res.setHeader('Location', this.vars.$uri + '/' + this.vars.$args);
                    this.res.end();
                    return;
                }
                let indexFile = path.join(filePath, index);
                let indexExists = await this.asyncExists(indexFile);
                if (indexExists === false) {
                    return this.err403();
                }
                filePath = indexFile;
                stats = await this.asyncStat(filePath);
                size = stats.size;
            }
            let type = mime.getType(filePath) || 'application/octet-stream';
            this.res.setHeader('Content-Type', type);
            this.res.setHeader('Content-Length', size);
            fs.createReadStream(filePath)
                .on('error', error => {
                this.err(500, 'Internal Server Error');
            })
                .pipe(this.res);
            this.logger('->', filePath.replace(/\\/g, '/'));
        }
        catch (error) {
            this.err(500, 'Internal Server Error');
        }
    }
    matchLocation(uri) {
        uri = uri || this.currentUri;
        let result = null;
        let locations = config.locations;
        for (let i = 0; i < locations.length; i++) {
            let item = locations[i];
            if (item.condition.operator === '=' && uri === item.condition.value) {
                return result;
            }
            if (['~', '~*'].indexOf(item.condition.operator) > -1) {
                let exp;
                if (item.condition.operator === '~') {
                    exp = new RegExp(item.condition.value);
                }
                if (item.condition.operator === '~*') {
                    exp = new RegExp(item.condition.value, 'i');
                }
                if (exp.test(uri) === true &&
                    (result === null ||
                        (result !== null &&
                            ['~', '~*'].indexOf(result.condition.operator) > -1 &&
                            item.condition.value.length > result.condition.value.length) ||
                        (result !== null && result.condition.operator === ''))) {
                    result = item;
                }
            }
            if (item.condition.operator === '' &&
                uri.toLowerCase().startsWith(item.condition.value.toLowerCase()) &&
                (result === null ||
                    (result !== null &&
                        result.condition.operator === '' &&
                        item.condition.value.length > result.condition.value.length))) {
                result = item;
            }
        }
        return result;
    }
    getIndex(location) {
        let index = 'index.html';
        for (let i = 0; i < location.actions.length; i++) {
            let action = location.actions[i];
            if (action.name === 'index') {
                index = action.value[0];
            }
        }
        return index;
    }
    getProxyHeader(location) {
        let headers = {};
        for (let i = 0; i < location.actions.length; i++) {
            let action = location.actions[i];
            if (action.name === 'proxy_set_header') {
                headers[action.value[0]] = action.value[1];
            }
        }
        return headers;
    }
    getTryFiles(location) {
        let files = null;
        for (let i = 0; i < location.actions.length; i++) {
            let action = location.actions[i];
            if (action.name === 'try_files') {
                files = action.value;
            }
        }
        return files;
    }
    getProxyPass(location) {
        let proxy = null;
        for (let i = 0; i < location.actions.length; i++) {
            let action = location.actions[i];
            if (action.name === 'proxy_pass') {
                proxy = action.value[0];
            }
        }
        return proxy;
    }
    getLocalFile(location) {
        let filePath = null;
        for (let i = 0; i < location.actions.length; i++) {
            let action = location.actions[i];
            if (action.name === 'root') {
                filePath = path.join(action.value[0], this.currentUri);
            }
            if (action.name === 'alias') {
                filePath = path.join(action.value[0], this.currentUri.replace(new RegExp(location.condition.value), ''));
            }
        }
        return filePath;
    }
    async matchAction(location, tryFiles = true) {
        let proxy = this.getProxyPass(location);
        if (proxy !== null) {
            this.logger('->', proxy + this.currentUri);
            let headers = this.getProxyHeader(location);
            return proxyServer.web(this.req, this.res, {
                changeOrigin: true,
                target: proxy,
                headers: headers
            });
        }
        let local = this.getLocalFile(location);
        if (local !== null) {
            let index = this.getIndex(location);
            let files = this.getTryFiles(location);
            if (files !== null && tryFiles === true) {
                for (let i = 0; i < files.length; i++) {
                    let file = files[i];
                    for (let key in this.vars) {
                        file = file.replace(key, this.vars[key]);
                    }
                    this.currentUri = file;
                    if (i < files.length - 1) {
                        let filePath = this.getLocalFile(location);
                        let exists = await this.asyncExists(filePath);
                        if (exists === true) {
                            return this.sendFile(filePath, index);
                        }
                    }
                    else {
                        return this.matchAction(location, false);
                    }
                }
            }
            else {
                return this.sendFile(local, index);
            }
        }
        return null;
    }
    parse() {
        this.vars = {
            $request_uri: this.req.url,
            $uri: this.req.url.split('?')[0],
            $request_method: this.req.method,
            $http_user_agent: this.req.headers['user-agent'],
            $host: this.req.headers['host'],
            $hostname: this.req.headers['host'].replace(/(\:\d+)$/, ''),
            $remote_addr: this.req.connection.localAddress.replace('::ffff:', ''),
            $args: this.req.url.split('?').length > 1
                ? '?' + this.req.url.split('?')[1]
                : ''
        };
        this.res.setHeader('Server', `front-server`);
        this.currentUri = this.vars.$uri;
        let location = this.matchLocation();
        if (location !== null) {
            this.matchAction(location).then(result => {
                if (result === null) {
                    return this.err404();
                }
            });
        }
        else {
            return this.err404();
        }
    }
}
class Parser {
    getPort() {
        let str = this.content.trim();
        let exp = /listen\s*(\d+);/;
        let result = str.match(exp);
        if (result !== null) {
            return parseInt(result[1]);
        }
        return 3000;
    }
    getLocationGroup() {
        let str = this.content.trim();
        let exp = /location([^{]+)\{([^\}]+)\}/g;
        let result = str.match(exp);
        if (result !== null) {
            let locations = result.map(item => {
                return this.getLocation(item);
            });
            return locations;
        }
        return [];
    }
    getAction(str) {
        let exp = /(\w+)\s+([^;]+)/;
        let result = str.match(exp);
        if (result !== null) {
            return {
                name: result[1],
                value: result[2].replace(/(\s{2,})/g, ' ').split(' ')
            };
        }
        return null;
    }
    getActions(str) {
        let exp = /(\w+)\s+([^;]+)/g;
        let result = str.match(exp);
        let rows = [];
        if (result !== null) {
            result.forEach(item => {
                let val = this.getAction(item);
                if (val !== null) {
                    rows.push(val);
                }
            });
        }
        return rows;
    }
    getLocationExpression(str) {
        str = str.trim();
        let exp = /([=~*]{1,2})\s*(.+)/;
        let result = str.match(exp);
        if (result !== null) {
            return {
                operator: result[1].trim(),
                value: result[2].trim()
            };
        }
        else {
            return {
                operator: '',
                value: str
            };
        }
    }
    getLocation(str) {
        str = str.trim();
        let exp = /location([^{]+)\{([^\}]+)\}/;
        let result = str.match(exp);
        if (result !== null) {
            let condition = this.getLocationExpression(result[1]);
            let actions = this.getActions(result[2]);
            return {
                condition: condition,
                actions: actions
            };
        }
    }
    parse() {
        let port = this.getPort();
        let locations = this.getLocationGroup();
        return {
            port: port,
            locations: locations
        };
    }
    constructor(content) {
        this.content = content.replace(/(#.*)$/gm, '');
    }
}
module.exports = {
    start(conf) {
        let content = fs.readFileSync(conf, 'utf-8');
        config = new Parser(content).parse();
        let server = http.createServer((req, res) => {
            let request = new Request(req, res);
            request.parse();
        });
        server.on('error', err => {
            console.trace(err);
            process.exit();
        });
        server.listen(config.port);
        console.log(`front-server listening on http://127.0.0.1:${config.port}/`);
    }
};
