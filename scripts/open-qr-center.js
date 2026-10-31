const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const qrBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Printable QR Center') || b.innerText.includes('QR'));
        qrBtn?.click();
        return { clicked: !!qrBtn, text: qrBtn?.innerText };
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
