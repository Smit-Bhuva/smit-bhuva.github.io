'use strict';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const ipWindowStore = new Map();

const setCorsHeaders = (req, res) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
};

const json = (res, statusCode, payload) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(payload));
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const consumeRateLimit = (ip) => {
  const now = Date.now();
  const entry = ipWindowStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    ipWindowStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  ipWindowStore.set(ip, entry);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
};

const validatePayload = (body) => {
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim();
  const message = String(body?.message || '').trim();
  const subject = String(body?.subject || 'New portfolio message').trim();
  const botcheck = Boolean(body?.botcheck);
  const turnstileToken = body?.turnstileToken ? String(body.turnstileToken) : '';

  if (!name || name.length < 2 || name.length > 100) {
    return { error: 'Please provide a valid name.' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email) || email.length > 200) {
    return { error: 'Please provide a valid email address.' };
  }

  if (!message || message.length < 10 || message.length > 5000) {
    return { error: 'Please provide a message between 10 and 5000 characters.' };
  }

  if (subject.length > 160) {
    return { error: 'Subject is too long.' };
  }

  return {
    data: {
      name,
      email,
      message,
      subject,
      botcheck,
      turnstileToken,
    },
  };
};

const verifyTurnstile = async ({ secretKey, token, ip }) => {
  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    remoteip: ip,
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const result = await response.json().catch(() => ({}));
  return Boolean(result?.success);
};

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return json(res, 405, { success: false, message: 'Method not allowed.' });
  }

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return json(res, 500, {
      success: false,
      message: 'Server is not configured. Missing WEB3FORMS_ACCESS_KEY.',
    });
  }

  const ip = getClientIp(req);
  const limit = consumeRateLimit(ip);
  if (!limit.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((limit.retryAfterMs || WINDOW_MS) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return json(res, 429, {
      success: false,
      message: 'Too many requests. Please try again shortly.',
    });
  }

  const parsed = validatePayload(req.body || {});
  if (parsed.error) {
    return json(res, 400, { success: false, message: parsed.error });
  }

  const { name, email, message, subject, botcheck, turnstileToken } = parsed.data;

  if (botcheck) {
    return json(res, 200, { success: true });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!turnstileToken) {
      return json(res, 400, {
        success: false,
        message: 'Verification token is missing.',
      });
    }

    const verified = await verifyTurnstile({
      secretKey: turnstileSecret,
      token: turnstileToken,
      ip,
    }).catch(() => false);

    if (!verified) {
      return json(res, 400, {
        success: false,
        message: 'Verification failed. Please try again.',
      });
    }
  }

  const upstream = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      access_key: accessKey,
      name,
      email,
      message,
      subject,
      botcheck: false,
    }),
  }).catch(() => null);

  if (!upstream) {
    return json(res, 502, {
      success: false,
      message: 'Unable to reach the message service. Please try again later.',
    });
  }

  const responseBody = await upstream.json().catch(() => ({}));
  if (!upstream.ok || responseBody.success === false) {
    return json(res, 502, {
      success: false,
      message: responseBody.message || 'Message service rejected the request.',
    });
  }

  return json(res, 200, { success: true });
};
