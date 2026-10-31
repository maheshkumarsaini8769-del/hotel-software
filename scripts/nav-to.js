const targetText = process.argv[2];

const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('${targetText.toLowerCase()}'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.innerText.trim() };
        }
        return { clicked: false, available: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean) };
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (event) => {
  const res = JSON.parse(event.data);
  console.log(JSON.stringify(res.result.result.value, null, 2));
  setTimeout(() => ws.close(), 1000);
};
