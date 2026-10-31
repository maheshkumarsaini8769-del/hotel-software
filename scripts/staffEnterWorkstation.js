const WebSocket = require('ws');

async function evaluate(code) {
  const res = await fetch('http://127.0.0.1:9224/json/list');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page');
  if (!page) throw new Error('No page found');

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: code,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.id === 1) {
        ws.close();
        if (data.result?.exceptionDetails) {
          reject(data.result.exceptionDetails);
        } else {
          resolve(data.result?.result?.value);
        }
      }
    });

    ws.on('error', reject);
  });
}

async function run() {
  // 1. Select Mahesh Palace hotel card
  console.log('Selecting Mahesh Palace...');
  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('button, div'));
    const mpCard = cards.find(el => el.textContent && el.textContent.includes('Mahesh Palace'));
    if (mpCard) mpCard.click();
    return !!mpCard;
  })()`);

  await new Promise(r => setTimeout(r, 1000));

  // 2. Select Waiter terminal card
  console.log('Selecting Waiter portal...');
  await evaluate(`(() => {
    const waiterBtn = document.querySelector('[data-testid="portal-card-waiter"]') || 
                      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Waiter'));
    if (waiterBtn) waiterBtn.click();
    return !!waiterBtn;
  })()`);

  await new Promise(r => setTimeout(r, 1000));

  // 3. Select staff person or enter PIN
  console.log('Selecting staff person...');
  await evaluate(`(() => {
    const staffCard = document.querySelector('[data-testid^="staff-profile-card-"]') ||
                      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Ramesh') || b.textContent.includes('Waiter'));
    if (staffCard) staffCard.click();
    return !!staffCard;
  })()`);

  await new Promise(r => setTimeout(r, 1000));

  // 4. If PIN modal opened, enter 1234
  console.log('Entering PIN 1234...');
  await evaluate(`(() => {
    for (const d of ['1', '2', '3', '4']) {
      const btn = document.querySelector('[data-testid="numpad-key-' + d + '"]');
      if (btn) btn.click();
    }
  })()`);

  await new Promise(r => setTimeout(r, 2000));

  const state = await evaluate(`(() => {
    return {
      hasWorkstationFrame: !!document.getElementById('workstation-frame'),
      frameSrc: document.getElementById('workstation-frame')?.src,
      outerHeader: !!document.querySelector('[data-testid="switch-station-btn"]'),
      bodySnippet: document.body.innerText.slice(0, 300)
    };
  })()`);

  console.log('Final State:', JSON.stringify(state, null, 2));
}

run().catch(console.error);
