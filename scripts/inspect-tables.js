const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const text = document.body.innerText;
        const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
        return {
          title: document.title,
          url: window.location.href,
          textSample: text.slice(0, 300),
          hasT01: text.includes('T-01') || text.includes('T01') || text.includes('Table 1'),
          buttons: btns.slice(0, 20)
        };
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (event) => {
  const res = JSON.parse(event.data);
  console.log(JSON.stringify(res.result.result.value, null, 2));
  process.exit(0);
};
