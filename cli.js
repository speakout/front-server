#! /usr/bin/env node

const server = require('./index')

let conf = process.argv[2]
if (!conf) {
  console.log(`Error: config file required`)
  process.exit()
}

server.start(conf)