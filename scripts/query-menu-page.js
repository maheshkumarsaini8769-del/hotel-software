const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        return {
          title: document.title,
          url: window.location.href,
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean),
          headings: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean)
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
