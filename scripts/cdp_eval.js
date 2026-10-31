const http = require('http');
const WebSocket = require('ws');

const port = process.env.CDP_PORT || '9222';
const expr = process.argv[2];

if (!expr) {
  console.error('Usage: node scripts/cdp_eval.js "<javascript-expression>"');
  process.exit(1);
}

http.get(`http://127.0.0.1:${port}/json`, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const targets = JSON.parse(body);
      const page = targets.find(t => t.type === 'page' || !t.type);
      if (!page || !page.webSocketDebuggerUrl) {
        console.error('No page target found');
        process.exit(1);
      }

      const ws = new WebSocket(page.webSocketDebuggerUrl);
      const timer = setTimeout(() => {
        console.error('CDP timeout');
        try { ws.terminate(); } catch (e) {}
        process.exit(1);
      }, 7000);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
          }
        }));
      });

      ws.on('message', (msg) => {
        clearTimeout(timer);
        try {
          const resp = JSON.parse(msg);
          if (resp.id === 1) {
            if (resp.result && resp.result.result) {
              console.log(JSON.stringify(resp.result.result.value, null, 2));
            } else if (resp.result && resp.result.exceptionDetails) {
              console.error('Exception:', resp.result.exceptionDetails);
            } else {
              console.log(resp);
            }
            try { ws.close(); } catch (e) {}
            process.exit(0);
          }
        } catch (e) {
          console.error('Parse error:', e);
          process.exit(1);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        console.error('WS error:', err);
        process.exit(1);
      });
    } catch (e) {
      console.error('JSON error:', e);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('HTTP error:', e);
  process.exit(1);
});
