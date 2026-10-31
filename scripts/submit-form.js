const ws = new WebSocket('ws://localhost:9222/devtools/page/10466');

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
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
          return { submitted: true };
        }
        return { noForm: true };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  await delay(1200);

  const check = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        toast: document.querySelector('.bg-emerald-600, .bg-rose-600, [role=\"alert\"]')?.innerText,
        text: document.body.innerText.slice(0, 300)
      }))()`,
      returnByValue: true
    }
  });

  console.log('After submit:', JSON.stringify(check.result.value, null, 2));
  process.exit(0);
};
