// Shim for query-string v9 CJS interop with Metro / expo-router
let qs;
try {
  qs = require('query-string');
} catch (e) {
  qs = {};
}

const target = (qs && qs.default) ? qs.default : (qs || {});

function parseUrl(url, options) {
  if (target.parseUrl) {
    return target.parseUrl(url, options);
  }
  const [urlPath, query] = url.split('?');
  return {
    url: urlPath || '',
    query: parse(query || '')
  };
}

function parse(str, options) {
  if (target.parse) {
    return target.parse(str, options);
  }
  if (!str) return {};
  const clean = str.trim().replace(/^[?#]/, '');
  if (!clean) return {};
  const ret = {};
  for (const param of clean.split('&')) {
    if (!param) continue;
    const [key, val] = param.split('=');
    if (key) {
      ret[decodeURIComponent(key)] = val !== undefined ? decodeURIComponent(val) : '';
    }
  }
  return ret;
}

function stringify(obj, options) {
  if (target.stringify) {
    return target.stringify(obj, options);
  }
  if (!obj) return '';
  const pairs = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      for (const v of val) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
    } else {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return pairs.join('&');
}

function stringifyUrl(object, options) {
  if (target.stringifyUrl) {
    return target.stringifyUrl(object, options);
  }
  const { url, query } = object;
  const str = stringify(query, options);
  return str ? `${url}?${str}` : url;
}

function pick(url, keys, options) {
  if (target.pick) {
    return target.pick(url, keys, options);
  }
  return url;
}

function exclude(url, keys, options) {
  if (target.exclude) {
    return target.exclude(url, keys, options);
  }
  return url;
}

module.exports = {
  ...target,
  parse,
  stringify,
  parseUrl,
  stringifyUrl,
  pick,
  exclude,
  default: {
    ...target,
    parse,
    stringify,
    parseUrl,
    stringifyUrl,
    pick,
    exclude,
  }
};
