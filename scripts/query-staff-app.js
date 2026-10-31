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

ws.onopen = async () => {
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        url: window.location.href,
        title: document.title,
        heading: document.querySelector('h1, h2, h3')?.innerText,
        text: document.body.innerText.slice(0, 300),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.innerText.trim(),
          rect: b.getBoundingClientRect()
        })).filter(b => b.text)
      }))()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
