const ws = new WebSocket('ws://localhost:9222/devtools/page/10466');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 400),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
      }))()`,
      returnByValue: true
    }
  }));
};

ws.onmessage = (e) => {
  console.log(JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
  process.exit(0);
};
