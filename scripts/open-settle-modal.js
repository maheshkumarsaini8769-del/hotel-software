const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    // Click settle button for Room 101
    const expr = `
      (() => {
        const settleBtn101 = document.querySelector('[data-testid="btn-settle-checkout-101"]');
        if (settleBtn101) {
          settleBtn101.click();
          return { clicked: true };
        }
        return { clicked: false };
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
    console.log('SETTLE MODAL OPENED:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 1500);
  }
});
