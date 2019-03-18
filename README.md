# front-server

用于开发环境的简单前端HTTP静态文件和反向代理服务器，支持Nginx风格的配置文件，便于嵌入与后端分离的前端工程，该项目主要用于学习研究，请勿用于生产环境或关键服务

## 配置示例

```
listen 3000;

location ~ ^/web/ {
  alias /www/html/;
}

location ~ ^/(api|upload) {
  proxy_pass http://192.168.1.50:8080;
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

## 支持特性

- listen
- location
- root
- alias
- try_files
- proxy_pass