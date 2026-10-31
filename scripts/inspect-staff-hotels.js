const ws = new WebSocket('ws://localhost:9223/devtools/page/97CF1F46DB092E0D09817AD1012AFA66');

function send(msg) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ ...msg, id }));
  });
}

ws.onopen = async () => {
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const hotelCards = Array.from(document.querySelectorAll('.cursor-pointer, [role=\"button\"], button')).map(el => ({
          text: el.innerText.trim(),
          tag: el.tagName
        })).filter(x => x.text);
        return {
          bodyText: document.body.innerText,
          hotelCards
        };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
