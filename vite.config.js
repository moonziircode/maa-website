import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/login' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { nia, password } = JSON.parse(body);
              if (!nia || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'NIA dan Password wajib diisi.' }));
                return;
              }

              // Step 1: Get metadata and JSESSIONID
              const step1Response = await fetch('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp', {
                method: 'POST',
                headers: {
                  'APP_ID': 'JV_APP',
                  'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
                }
              });
              const lt = step1Response.headers.get('lt');
              const execution = step1Response.headers.get('execution');
              const setCookies = step1Response.headers.get('set-cookie');
              
              let jsessionid = '';
              if (setCookies) {
                const match = setCookies.match(/JSESSIONID=([^;]+)/);
                if (match) jsessionid = match[1];
              }

              // Step 2: Authenticate credentials
              const formParams = new URLSearchParams();
              formParams.append('isapp', 'true');
              formParams.append('acctype', 'emp');
              formParams.append('username', nia);
              formParams.append('password', password);
              formParams.append('_eventId', 'submit');
              formParams.append('submit', 'login');
              formParams.append('lt', lt);
              formParams.append('execution', execution);

              const step2Response = await fetch('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Cookie': `JSESSIONID=${jsessionid}`,
                  'APP_ID': 'JV_APP',
                  'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
                },
                body: formParams.toString(),
                redirect: 'manual'
              });
              const step2Cookies = step2Response.headers.get('set-cookie') || '';
              let castgc = '';
              const tgcMatch = step2Cookies.match(/TGC=([^;]+)/);
              if (tgcMatch) castgc = tgcMatch[1];

              if (!castgc) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'NIA atau Password salah.' }));
                return;
              }

              // Step 3: Get Service Ticket
              const step3Response = await fetch('https://cas.anteraja.id/cas/login?service=https://api.anteraja.id', {
                method: 'POST',
                headers: {
                  'Cookie': `TGC=${castgc}; JSESSIONID=${jsessionid}`,
                  'APP_ID': 'JV_APP',
                  'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
                },
                redirect: 'manual'
              });
              const redirectUrl = step3Response.headers.get('redirecturl') || '';
              let ticket = '';
              const ticketMatch = redirectUrl.match(/ticket=([^&]+)/);
              if (ticketMatch) ticket = ticketMatch[1];

              if (!ticket) {
                throw new Error('Gagal mendapatkan tiket masuk CAS (Step 3)');
              }

              // Step 4: Token Exchange
              const step4Response = await fetch('https://api.anteraja.id/user/cas/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'token': '',
                  'APP_ID': 'JV_APP',
                  'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
                },
                body: JSON.stringify({
                  ticket: ticket,
                  deviceId: 'web-client-dev',
                  appKey: 'MAA',
                  appSecret: 'santuy',
                  service: 'https://api.anteraja.id'
                })
              });
              const step4Data = await step4Response.json();

              if (step4Response.ok && step4Data.status === 0) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  status: 'success',
                  data: {
                    token: step4Data.content.token,
                    user: step4Data.content.agent
                  }
                }));
              } else {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: step4Data.info || 'Autentikasi gagal.' }));
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: err.message }));
            }
          });
          return;
        }
        next();
      });
    },
    proxy: {
      '/cas': {
        target: 'https://cas.anteraja.id',
        changeOrigin: true,
      },
      '/api-main': {
        target: 'https://api.anteraja.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-main/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
});
