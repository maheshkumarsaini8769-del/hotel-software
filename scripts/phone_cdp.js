/**
 * Chrome DevTools Protocol (CDP) helper for driving and inspecting
 * the physical phone's WebView over Wi-Fi/ADB.
 */
const http = require('http');
const CDP_PORT = process.env.CDP_PORT || 9222;

async function getPage(targetUrlMatch = 'localhost') {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const list = JSON.parse(raw);
          const page = list.find((p) => p.type === 'page' && (!targetUrlMatch || p.url.includes(targetUrlMatch))) || list[0];
          if (!page) return reject(new Error('No devtools page found'));
          resolve(page);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function evalInPhone(expression) {
  const page = await getPage();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true, awaitPromise: true },
        })
      );
    };
    ws.onmessage = (e) => {
      try {
        const resp = JSON.parse(e.data);
        ws.close();
        if (resp.result?.exceptionDetails) {
          return reject(new Error(JSON.stringify(resp.result.exceptionDetails)));
        }
        resolve(resp.result?.result?.value);
      } catch (err) {
        reject(err);
      }
    };
    ws.onerror = (err) => reject(err);
  });
}

const command = process.argv[2];
const arg = process.argv.slice(3).join(' ');

(async () => {
  try {
    if (command === 'eval') {
      const res = await evalInPhone(arg);
      console.log(typeof res === 'object' ? JSON.stringify(res, null, 2) : res);
    } else if (command === 'text') {
      const res = await evalInPhone('document.body.innerText');
      console.log(res);
    } else if (command === 'click') {
      const res = await evalInPhone(`
        (() => {
          const el = document.querySelector(${JSON.stringify(arg)});
          if (!el) return 'NOT_FOUND: ' + ${JSON.stringify(arg)};
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
          return 'CLICKED: ' + ${JSON.stringify(arg)};
        })()
      `);
      console.log(res);
    } else {
      console.log('Usage: node scripts/phone_cdp.js [eval <expr> | text | click <selector>]');
    }
  } catch (err) {
    console.error('CDP Error:', err.message);
    process.exit(1);
  }
})();
