const http = require('http');
const WebSocket = require('ws');
const { execSync } = require('child_process');

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

  const contexts = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.executionContextCreated') {
      contexts.push(msg.params.context);
    }
  });

  ws.on('open', async () => {
    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 1000));

    const waiterCtx = contexts.find(c => c.origin.includes('3002') || c.origin.includes('10.208.156.216'));
    const contextId = waiterCtx.id;
    console.log('Using waiter contextId:', contextId);

    // 1. Check Guest Requests section on Dashboard
    const reqRes = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div, li, tr')).filter(el => {
          return el.innerText && (el.innerText.includes('Water') || el.innerText.includes('Room 101'));
        });
        return cards.map(c => ({
          text: c.innerText.slice(0, 150),
          buttons: Array.from(c.querySelectorAll('button')).map(b => b.innerText.trim())
        }));
      })()`,
      returnByValue: true
    });
    console.log('Water / Room 101 requests found:', JSON.stringify(reqRes.result.value, null, 2));

    // 2. Click "Done" on water request
    const clickDone = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const doneButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === 'Done');
        if (doneButtons.length > 0) {
          doneButtons[0].click();
          return 'clicked first Done button';
        }
        return 'no Done button';
      })()`,
      returnByValue: true
    });
    console.log('Click Done on buzzer alert:', clickDone.result.value);
    await new Promise(r => setTimeout(r, 1000));

    // 3. Navigate to Live Orders & KOT
    const navOrders = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const kotBtn = document.querySelector('[data-testid="bottom-nav-live-kot"]') ||
          document.querySelector('[data-testid="nav-item-live-orders-kot"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Live Orders & KOT'));
        if (kotBtn) {
          kotBtn.click();
          return 'clicked Live Orders & KOT';
        }
        return 'KOT button not found';
      })()`,
      returnByValue: true
    });
    console.log('Nav Live Orders:', navOrders.result.value);
    await new Promise(r => setTimeout(r, 1500));

    // 4. Inspect Live Orders page
    const liveOrdersState = await send('Runtime.evaluate', {
      contextId,
      expression: `({
        text: document.body.innerText.slice(0, 800),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.innerText.trim().slice(0, 40),
          testId: b.getAttribute('data-testid')
        }))
      })`,
      returnByValue: true
    });
    console.log('Live Orders page:', JSON.stringify(liveOrdersState.result.value, null, 2));

    ws.close();
  });
}

main().catch(console.error);
