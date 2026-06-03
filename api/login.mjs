export default async function handler(req, res) {
  // Allow CORS if needed (Vercel best practice)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Vercel automatically parses JSON bodies
    const { nia, password } = req.body || {};

    if (!nia || !password) {
      return res.status(400).json({ message: 'NIA dan Password wajib diisi.' });
    }

    // Step 1: Get metadata and JSESSIONID from CAS
    console.log('Vercel CAS Step 1: Getting metadata');
    const step1Url = 'https://cas.anteraja.id/cas/login?isapp=true&acctype=emp';
    const step1Response = await fetch(step1Url, {
      method: 'POST',
      headers: {
        'APP_ID': 'JV_APP',
        'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
      }
    });

    const lt = step1Response.headers.get('lt');
    const execution = step1Response.headers.get('execution');
    const setCookies = step1Response.headers.get('set-cookie');

    if (!lt || !execution) {
      throw new Error('Gagal mendapatkan metadata login CAS (Step 1)');
    }

    let jsessionid = '';
    if (setCookies) {
      const match = setCookies.match(/JSESSIONID=([^;]+)/);
      if (match) jsessionid = match[1];
    }

    // Step 2: Authenticate credentials
    console.log('Vercel CAS Step 2: Authenticating credentials');
    const step2Url = 'https://cas.anteraja.id/cas/login?isapp=true&acctype=emp';
    const formParams = new URLSearchParams();
    formParams.append('isapp', 'true');
    formParams.append('acctype', 'emp');
    formParams.append('username', nia);
    formParams.append('password', password);
    formParams.append('_eventId', 'submit');
    formParams.append('submit', 'login');
    formParams.append('lt', lt);
    formParams.append('execution', execution);

    const step2Response = await fetch(step2Url, {
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
    if (tgcMatch) {
      castgc = tgcMatch[1];
    }

    if (!castgc) {
      return res.status(401).json({ message: 'NIA atau Password salah.' });
    }

    // Step 3: Get Service Ticket
    console.log('Vercel CAS Step 3: Getting Service Ticket');
    const step3Url = 'https://cas.anteraja.id/cas/login?service=https://api.anteraja.id';
    const step3Response = await fetch(step3Url, {
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
    if (ticketMatch) {
      ticket = ticketMatch[1];
    }

    if (!ticket) {
      throw new Error('Gagal mendapatkan tiket masuk CAS (Step 3)');
    }

    // Step 4: Token Exchange
    console.log('Vercel CAS Step 4: Exchanging ticket for token');
    const step4Url = 'https://api.anteraja.id/user/cas/login';
    const step4Response = await fetch(step4Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': '',
        'APP_ID': 'JV_APP',
        'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
      },
      body: JSON.stringify({
        ticket: ticket,
        deviceId: 'web-client-vercel',
        appKey: 'MAA',
        appSecret: 'santuy',
        service: 'https://api.anteraja.id'
      })
    });

    const step4Data = await step4Response.json();

    if (step4Response.ok && step4Data.status === 0) {
      console.log('Vercel CAS Success: Token generated');
      return res.status(200).json({
        status: 'success',
        data: {
          token: step4Data.content.token,
          user: step4Data.content.agent
        }
      });
    } else {
      return res.status(400).json({ message: step4Data.info || 'Autentikasi gagal.' });
    }
  } catch (error) {
    console.error('Vercel error:', error);
    return res.status(500).json({ message: error.message });
  }
}
