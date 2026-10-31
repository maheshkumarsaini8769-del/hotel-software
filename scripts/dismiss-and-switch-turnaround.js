const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        // 1. Dismiss voucher modal
        const dismissBtn = document.querySelector('[data-testid="btn-dismiss-success-modal"]');
        if (dismissBtn) dismissBtn.click();

        // 2. Switch to Turnaround Tab
        setTimeout(() => {
          const turnaroundTab = document.querySelector('[data-testid="tab-turnaround"]');
          if (turnaroundTab) turnaroundTab.click();
        }, 500);

        return { initiated: true };
      })()
    `;
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: expr,
        contextId: 3,
        returnByValue: true
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 2) {
    console.log('TRANSITION RESULT:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 1500);
  }
});
