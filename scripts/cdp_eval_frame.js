const http = require('http');
const WebSocket = require('ws');

const port = process.env.CDP_PORT || '9224';
const expr = process.argv[2];

if (!expr) {
  console.error('Usage: node scripts/cdp_eval_frame.js "<javascript-expression>"');
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
      let targetContextId = null;

      const timer = setTimeout(() => {
        console.error('CDP timeout');
        try { ws.terminate(); } catch (e) {}
        process.exit(1);
      }, 8000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      });

      ws.on('message', (msg) => {
        const resp = JSON.parse(msg);

        if (resp.method === 'Runtime.executionContextCreated') {
          const ctx = resp.params.context;
          if (ctx.origin.includes('3008') || ctx.origin.includes('127.0.0.1')) {
            targetContextId = ctx.id;
          }
        }

        if (resp.id === 1) {
          // Send evaluate in the target context or default
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 2,
              method: 'Runtime.evaluate',
              params: {
                expression: expr,
                contextId: targetContextId || 2,
                returnByValue: true,
                awaitPromise: true
              }
            }));
          }, 200);
        }

        if (resp.id === 2) {
          clearTimeout(timer);
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
