const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

function send(msg) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ ...msg, id }));
  });
}

ws.onopen = async () => {
  await send({ method: 'Runtime.enable' });

  // Look at contextId 2 (or find all contexts)
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        return {
          title: document.title,
          url: window.location.href,
          text: document.body.innerText.slice(0, 800),
          buttons: Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText.trim(), testId: b.getAttribute('data-testid') }))
        };
      })()`,
      contextId: 2,
      returnByValue: true
    }
  });

  console.log('Reception context 2:', JSON.stringify(res?.result?.value, null, 2));
  process.exit(0);
};
