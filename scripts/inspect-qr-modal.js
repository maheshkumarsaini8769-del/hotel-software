const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const text = document.body.innerText;
        const imgs = Array.from(document.querySelectorAll('img, canvas, svg')).map(el => ({ tag: el.tagName, src: el.src?.slice(0, 80) }));
        return {
          textSample: text.slice(0, 300),
          imgsCount: imgs.length,
          hasT01: text.includes('T-01') || text.includes('T01') || text.includes('Table 1')
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
