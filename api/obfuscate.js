'use strict';

const { obfuscate } = require('./src');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (_) { return { code: req.body }; }
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return send(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = parseBody(req);
    const source = typeof body.code === 'string' ? body.code : '';

    if (!source.trim()) {
      return send(res, 400, {
        success: false,
        error: 'Missing Lua source. Send JSON: {"code":"print(\\"Hello\\")"}'
      });
    }

    if (Buffer.byteLength(source, 'utf8') > 1024 * 1024) {
      return send(res, 413, { success: false, error: 'Lua source is too large. Maximum size is 1 MB.' });
    }

    const allowedLevels = [1, 2, 3];
    const requestedLevel = Number(body.level ?? 2);
    const level = allowedLevels.includes(requestedLevel) ? requestedLevel : 2;

    const opts = {
      level,
      strings: body.strings !== false,
      constants: body.constants !== false,
      antiTamper: body.antiTamper !== false,
      confusable: body.confusable !== false,
      opaque: body.opaque === true,
    };

    if (body.seed !== undefined && body.seed !== null && body.seed !== '') {
      opts.seed = typeof body.seed === 'number' ? body.seed : String(body.seed);
    }

    const result = obfuscate(source, opts);

    return send(res, 200, {
      success: true,
      code: result.code,
      seed: result.seed,
      config: result.config
    });
  } catch (error) {
    console.error(error);
    return send(res, 400, {
      success: false,
      error: error && error.message ? error.message : 'Obfuscation failed.'
    });
  }
};
