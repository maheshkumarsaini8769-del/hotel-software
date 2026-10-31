const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('Room 101'));
        const card = cards.pop();
        return {
          cardText: card ? card.innerText.slice(0, 200) : 'not found'
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
