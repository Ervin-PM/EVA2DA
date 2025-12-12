const http = require('http');
const https = require('https');
const { URL } = require('url');

const REMOTE_API = process.env.REMOTE_API || 'https://todo-list.dobleb.cl';
const LOCAL_PORT = Number(process.env.LOCAL_PORT || 3000);
const LAN_HOST = process.env.LAN_HOST || '192.168.1.14';

console.log('🔄 PROXY HTTP → HTTPS');
console.log('==================================================');
console.log(`Local:  http://0.0.0.0:${LOCAL_PORT}`);
console.log(`Remote: ${REMOTE_API}`);
console.log('==================================================\n');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Build remote URL
  const remoteUrl = new URL(req.url, REMOTE_API);
  
  // Preparar headers
  const headers = { ...req.headers };
  headers['host'] = remoteUrl.hostname;
  
  // Opciones para la request al servidor remoto
  const options = {
    method: req.method,
    headers: headers,
    timeout: 15000,
  };

  // Realizar la request al servidor remoto
  const proxyReq = https.request(remoteUrl, options, (proxyRes) => {
    // Escribir response con headers
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    
    console.log(`   → ${proxyRes.statusCode} (${proxyRes.headers['content-length'] || 'streaming'} bytes)`);
    
    // Pasar el body
    proxyRes.pipe(res);
  });

  // Manejo de errores
  proxyReq.on('error', (error) => {
    console.error(`   ❌ Error: ${error.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: `Proxy error: ${error.message}`
    }));
  });

  proxyReq.on('timeout', () => {
    console.error('   ⏱️  Timeout');
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Gateway timeout'
    }));
  });

  // Enviar el body de la request
  req.pipe(proxyReq);
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy iniciado en http://0.0.0.0:${LOCAL_PORT}`);
  console.log('📱 Conéctate desde el emulator de Expo GO');
  console.log(`   URL: http://${LAN_HOST}:${LOCAL_PORT}`);
  console.log('\n📝 Presiona Ctrl+C para detener\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${LOCAL_PORT} ya está en uso`);
    console.error('   Ejecuta en otra terminal o cambia el puerto');
    process.exit(1);
  } else {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
});
