const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://localhost:9223/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const tab = tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const msgId = id++;
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === msgId) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  ws.on('open', async () => {
    await send('Runtime.enable');
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div, section, article')).filter(el => {
          return el.innerText && el.innerText.includes('Mahesh Palace') && el.innerText.includes('Select Hotel');
        });
        const target = cards[cards.length - 1];
        if (target) {
          target.scrollIntoView({ behavior: 'instant', block: 'center' });
          const btn = Array.from(target.querySelectorAll('button, div, span, a')).find(el => el.innerText.includes('Select Hotel') || el.innerText.includes('Open Workstations'));
          if (btn) {
            btn.click();
            return { clicked: true, text: btn.innerText };
          }
          target.click();
          return { clickedTarget: true };
        }
        return { notFound: true };
      })()`,
      returnByValue: true
    });
    console.log('Select Mahesh Palace Result:', JSON.stringify(res.result.value, null, 2));

    await new Promise(r => setTimeout(r, 1200));

    const pageState = await send('Runtime.evaluate', {
      expression: `({
        text: document.body.innerText.slice(0, 600),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().slice(0, 30))
      })`,
      returnByValue: true
    });
    console.log('Page State:', JSON.stringify(pageState.result.value, null, 2));

    ws.close();
  });
}

main().catch(console.error);
