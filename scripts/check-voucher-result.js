const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const voucher = document.querySelector('[data-testid="departure-settled-voucher-admin"]');
        const dismissBtn = document.querySelector('[data-testid="btn-dismiss-success-modal"]');
        const modal = document.querySelector('[data-testid="front-desk-departure-modal"]');
        return {
          voucherVisible: !!voucher,
          voucherText: voucher ? voucher.innerText : null,
          dismissBtnVisible: !!dismissBtn,
          modalText: modal ? modal.innerText.slice(0, 400) : null
        };
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
  }, 1000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 2) {
    console.log('VOUCHER RESULT:', JSON.stringify(msg.result, null, 2));
    process.exit(0);
  }
});
