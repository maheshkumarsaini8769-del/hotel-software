const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const instantReady101 = document.querySelector('[data-testid="btn-instant-ready-101"]');
        if (!instantReady101) return { success: false, error: 'Instant Ready button not found' };
        instantReady101.click();
        return { success: true, text: instantReady101.innerText.trim() };
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
    console.log('INSTANT READY CLICKED:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
});
