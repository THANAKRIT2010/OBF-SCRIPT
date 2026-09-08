'use strict';

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;
  res.end(JSON.stringify({
    success: true,
    service: 'Flexozy Lua Obfuscator API',
    endpoint: 'POST /api/obfuscate',
    version: '0.1.0'
  }));
};
