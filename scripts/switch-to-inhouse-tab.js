const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    // Switch to IN_HOUSE tab
    const expr = `
      (() => {
        const inHouseTab = document.querySelector('[data-testid="tab-in-house"]');
        if (inHouseTab) {
          inHouseTab.click();
          return { clicked: true, text: inHouseTab.innerText.trim() };
        }
        return { clicked: false, allTabs: Array.from(document.querySelectorAll('[data-testid^="tab-"]')).map(t => t.getAttribute('data-testid')) };
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
    console.log('TAB CLICK RESULT:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
});
