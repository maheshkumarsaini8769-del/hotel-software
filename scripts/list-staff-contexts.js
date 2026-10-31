const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.method === 'Runtime.executionContextCreated') {
    console.log('Context created:', msg.params.context);
  }
});
