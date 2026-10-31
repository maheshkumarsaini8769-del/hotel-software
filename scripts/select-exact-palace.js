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

    // 1. Click "Change Hotel"
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Change Hotel'));
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Find card whose innerText has 'Mahesh Palace'
    const selectPalace = await send('Runtime.evaluate', {
      expression: `(() => {
        const allDivs = Array.from(document.querySelectorAll('*'));
        const palaceDiv = allDivs.find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'Mahesh Palace');
        if (!palaceDiv) return 'Mahesh Palace text not found';
        
        let card = palaceDiv;
        while (card && card.parentElement && !card.innerText.includes('Select Hotel')) {
          card = card.parentElement;
        }
        if (!card) return 'card parent not found';
        
        card.scrollIntoView({ behavior: 'instant', block: 'center' });
        const selectBtn = Array.from(card.querySelectorAll('button, div, span')).find(b => b.innerText && b.innerText.includes('Select Hotel'));
        if (selectBtn) {
          selectBtn.click();
          return 'clicked Select Hotel on Mahesh Palace card';
        }
        card.click();
        return 'clicked card';
      })()`,
      returnByValue: true
    });
    console.log('Select Palace Result:', selectPalace.result.value);

    await new Promise(r => setTimeout(r, 1200));

    const currentState = await send('Runtime.evaluate', {
      expression: `({
        text: document.body.innerText.slice(0, 500),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().slice(0, 40))
      })`,
      returnByValue: true
    });
    console.log('Current State:', JSON.stringify(currentState.result.value, null, 2));

    ws.close();
  });
}

main().catch(console.error);
