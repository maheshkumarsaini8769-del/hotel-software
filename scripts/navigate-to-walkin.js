const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    // Click on "Walk-in Check-in" button
    const expr = `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], div'));
        const walkInBtn = buttons.find(b => b.innerText && b.innerText.trim() === 'Walk-in Check-in');
        if (walkInBtn) {
          walkInBtn.click();
          return { clicked: true, text: walkInBtn.innerText.trim() };
        }
        return { clicked: false, available: buttons.slice(0, 20).map(b => b.innerText ? b.innerText.trim() : '') };
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
    console.log('CLICK RESULT:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
});
