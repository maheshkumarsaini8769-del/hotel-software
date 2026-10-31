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
  console.log('Selecting portal-card-reception via testid...');
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = document.querySelector('[data-testid="portal-card-reception"]');
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
          return { clicked: true };
        }
        return { notFound: true, allTestIds: Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid')) };
      })()`,
      returnByValue: true
    }
  });

  console.log('Click result:', JSON.stringify(res.result.value, null, 2));
  await delay(1000);

  const after = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 400),
        testIds: Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'))
      }))()`,
      returnByValue: true
    }
  });

  console.log('After state:', JSON.stringify(after.result.value, null, 2));
  process.exit(0);
};
