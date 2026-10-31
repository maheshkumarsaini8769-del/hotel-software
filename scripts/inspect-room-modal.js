const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const modal = document.querySelector('[role=dialog], .modal, .fixed');
        const inputs = Array.from((modal || document).querySelectorAll('input, select, button'));
        return {
          modalFound: !!modal,
          inputs: inputs.map(i => ({
            tag: i.tagName,
            type: i.type,
            placeholder: i.placeholder,
            text: i.innerText?.trim()?.slice(0, 30),
            value: i.value
          })).filter(i => i.placeholder || i.text)
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
ws.onerror = (e) => {
  console.error('WS Error:', e);
  process.exit(1);
};
