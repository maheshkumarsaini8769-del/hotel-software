const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    // Check in-house guests and settle button
    const expr = `
      (() => {
        const cards = Array.from(document.querySelectorAll('[data-testid^="inhouse-guest-card-"]')).map(c => ({
          testId: c.getAttribute('data-testid'),
          text: c.innerText.trim()
        }));
        const settleBtn101 = document.querySelector('[data-testid="btn-settle-checkout-101"]');
        return {
          cardsCount: cards.length,
          cards,
          settleBtnExists: !!settleBtn101,
          settleBtnText: settleBtn101 ? settleBtn101.innerText.trim() : null
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
    console.log('IN-HOUSE CARDS:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
});
