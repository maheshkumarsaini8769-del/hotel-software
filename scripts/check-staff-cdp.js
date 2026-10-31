const http = require('http');

http.get('http://localhost:9223/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error('Error fetching /json:', err.message);
});
