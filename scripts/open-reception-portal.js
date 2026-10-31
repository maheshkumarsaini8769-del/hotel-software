const ws = new WebSocket('ws://localhost:9223/devtools/page/97CF1F46DB092E0D09817AD1012AFA66');

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

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

ws.onopen = async () => {
  console.log('Selecting Reception Front Desk...');
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button, div, [role=\"button\"]')).find(b => b.innerText && b.innerText.includes('Reception Front Desk'));
        btn?.click();
      })()`
    }
  });

  await delay(1200);

  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        url: window.location.href,
        text: document.body.innerText.slice(0, 500),
        inputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, placeholder: i.placeholder, value: i.value })),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
      }))()`,
      returnByValue: true
    }
  });

  console.log('Reception Screen state:', JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
