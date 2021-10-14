// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 15.5.1
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';

const common = require('../common');

const net = require('net');

const server = net.createServer();

server.listen(common.mustCall(() => {
  const socket = net.createConnection(server.address().port);
  socket.on('close', common.mustCall(() => server.close()));
  socket.end();
}));
