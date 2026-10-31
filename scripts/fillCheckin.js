const WebSocket = require('ws');

async function fillAndCheckin() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      
      const expr = `(() => {
        function setVal(sel, val) {
          const el = document.querySelector(sel);
          if (!el) return null;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return el.value;
        }

        const nameVal = setVal('[data-testid="input-guest-name"]', 'Rahul');
        const phoneVal = setVal('[data-testid="input-guest-phone"]', '9999999999');
        const nightsVal = setVal('[data-testid="input-stay-nights"]', '1');
        const idVal = setVal('[data-testid="input-id-number"]', '5678-1234-9999');

        const room101 = document.querySelector('[data-testid="room-select-101"]');
        if (room101) room101.click();

        return {
          name: nameVal,
          phone: phoneVal,
          nights: nightsVal,
          idVal: idVal,
          room101Clicked: Boolean(room101)
        };
      })()`;

      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          contextId: 2,
          expression: expr,
          returnByValue: true
        }
      }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.id === 2) {
        ws.close();
        if (data.result?.exceptionDetails) {
          reject(data.result.exceptionDetails);
        } else {
          resolve(data.result?.result?.value);
        }
      }
    });

    ws.on('error', reject);
  });
}

fillAndCheckin().then(res => {
  console.log('Result:', JSON.stringify(res, null, 2));
}).catch(err => {
  console.error('Error:', err);
});
