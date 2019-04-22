# front-server

用于开发环境的简单前端HTTP静态文件和反向代理服务器，支持Nginx风格的配置文件，便于嵌入与后端分离的前端工程，该项目主要用于学习研究，请勿用于生产环境或关键服务

## 配置示例

```
listen 3000;
auto_refresh on;

location ~ ^/web/ {
  alias /www/html/;
}

location ~ ^/(api|upload) {
  proxy_pass http://192.168.1.50:8080;
}

location ~ ^/test {
  proxy_set_header Host www.example.com;
  proxy_pass http://192.168.1.80;
}

location / {
  root dist;
  try_files $uri $uri/ /index.html;
}
```

## 本地安装使用

```
npm i front-server --save-dev
```

在工程根目录添加配置文件，配置格式参考示例，命名为 `server.conf`

`package.json` 添加 `scripts` 项

```
"scripts": {
  "serve": "node_modules/.bin/front-server server.conf"
}
```

执行启动命令

```
npm run serve
```

## 全局安装使用

```
npm i front-server -g
```

在工程根目录添加配置文件，配置格式参考示例，命名为 `server.conf`

`package.json` 添加 `scripts` 项

```
"scripts": {
  "serve": "front-server server.conf"
}
```

执行启动命令

```
npm run serve
```

或者直接通过命令行启动

```
front-server server.conf
```

## 自动刷新

通过设置 `auto_refresh on;` 可以启用自动刷新功能，该功能监控根目录下的文件变化，然后自动刷新html页面，和hot reload机制并不相同，配置参考如下

```
listen 3000;
auto_refresh on;

location / {
  root dist; # 根目录dist下的文件变化会受到监控
}
```

## Cookie处理

反向代理会自动清除cookie的domain，并将path置为 /

## 支持特性

- listen
- auto_refresh
- location
- root
- alias
- try_files
- proxy_pass
- proxy_set_header