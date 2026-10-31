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

  // Get outer and inner frame info
  const outer = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        return {
          title: document.title,
          url: window.location.href,
          textSnippet: document.body.innerText.slice(0, 300),
          iframes
        };
      })()`,
      returnByValue: true
    }
  });

  console.log('Outer:', JSON.stringify(outer.result.value, null, 2));

  // Also query context 2 (the waiter terminal iframe)
  const inner = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        return {
          title: document.title,
          url: window.location.href,
          textSnippet: document.body.innerText.slice(0, 400),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
        };
      })()`,
      contextId: 2,
      returnByValue: true
    }
  });

  console.log('Inner context 2:', JSON.stringify(inner?.result?.value, null, 2));
  process.exit(0);
};
