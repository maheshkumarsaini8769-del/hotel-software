const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return {
          title: document.title,
          url: window.location.href,
          textSample: document.body.innerText.slice(0, 300),
          buttons: btns.map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 50)
        };
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (event) => {
  const res = JSON.parse(event.data);
  console.log(JSON.stringify(res.result.result.value, null, 2));
  ws.close();
};
