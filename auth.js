document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const etNia = document.getElementById('etNia');
  const etPassword = document.getElementById('etPassword');
  const btnLogin = document.getElementById('btnLogin');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorMessage = document.getElementById('errorMessage');

  // Check if token already exists in localStorage on page load
  const existingToken = localStorage.getItem('authToken');
  if (existingToken) {
    window.location.href = 'dashboard.html';
    return; // Stop execution
  }

  // Handle Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous error messages
    errorMessage.textContent = '';

    // Retrieve input values
    const nia = etNia.value.trim();
    const password = etPassword.value;

    // Simple validation checks
    if (!nia || !password) {
      errorMessage.textContent = 'Harap isi semua kolom input (NIA dan Password).';
      return;
    }

    // Toggle loading states
    loadingSpinner.style.display = 'inline-block';
    btnLogin.disabled = true;

    const requestBody = { nia, password };

    try {
      // Step 1: Get lt, execution, and JSESSIONID
      const step1Response = await fetch('/api-cas/cas/login?isapp=true&acctype=emp', {
        method: 'POST',
        headers: {
          'APP_ID': 'JV_APP',
          'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
        }
      });
      if (!step1Response.ok) throw new Error('Gagal memuat metadata login');

      const lt = step1Response.headers.get('lt');
      const execution = step1Response.headers.get('execution');
      if (!lt || !execution) throw new Error('Gagal mendapatkan tiket session CAS');

      // Step 2: Authenticate with credentials
      const formParams = new URLSearchParams();
      formParams.append('isapp', 'true');
      formParams.append('acctype', 'emp');
      formParams.append('username', nia);
      formParams.append('password', password);
      formParams.append('_eventId', 'submit');
      formParams.append('submit', 'login');
      formParams.append('lt', lt);
      formParams.append('execution', execution);

      const step2Response = await fetch('/api-cas/cas/login?isapp=true&acctype=emp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'APP_ID': 'JV_APP',
          'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
        },
        body: formParams.toString()
      });

      // Step 3: Get Service Ticket
      const step3Response = await fetch('/api-cas/cas/login?service=https://api.anteraja.id', {
        method: 'POST',
        headers: {
          'APP_ID': 'JV_APP',
          'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
        }
      });

      const redirectUrl = step3Response.headers.get('redirecturl');
      if (!redirectUrl) throw new Error('NIA atau Password salah.');

      const ticketMatch = redirectUrl.match(/ticket=([^&]+)/);
      if (!ticketMatch) throw new Error('Gagal memproses tiket masuk.');
      const ticket = ticketMatch[1];

      // Step 4: Exchange ticket for session token
      const step4Response = await fetch('/api-main/user/cas/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': '',
          'APP_ID': 'JV_APP',
          'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
        },
        body: JSON.stringify({
          ticket: ticket,
          deviceId: 'web-client-' + Math.random().toString(36).substring(2),
          appKey: 'MAA',
          appSecret: 'santuy',
          service: 'https://api.anteraja.id'
        })
      });

      const step4Data = await step4Response.json();

      if (step4Response.ok && step4Data.status === 0) {
        const token = step4Data.content.token;
        const user = step4Data.content.agent;

        // Save session credentials
        localStorage.setItem('authToken', token);
        localStorage.setItem('userInfo', JSON.stringify(user));

        // Redirect to dashboard page
        window.location.href = 'dashboard.html';
      } else {
        errorMessage.textContent = step4Data.info || 'NIA atau Password salah.';
      }
    } catch (error) {
      console.error('Network or Login Error:', error);
      errorMessage.textContent = 'Tidak ada koneksi internet atau terjadi kesalahan sistem. Silakan coba lagi.';
    } finally {
      // Re-enable button and hide loading state
      loadingSpinner.style.display = 'none';
      btnLogin.disabled = false;
    }
  });
});
