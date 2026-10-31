const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const text = document.body.innerText;
        const matches = text.match(/Room\\s*\\d+|\\b101\\b|\\b102\\b|\\b103\\b/g) || [];
        return {
          roomMatches: matches.slice(0, 20),
          has101: text.includes('101'),
          has102: text.includes('102')
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
