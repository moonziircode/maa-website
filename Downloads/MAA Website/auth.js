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
      const response = await fetch('/api-cas/cas/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'APP_ID': 'JV_APP',
          'APP_SECRET_MIC': '937bad65-6f4a-4db6-adff-c946b3f6dd73'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (response.ok && responseData.status === 'success') {
        const token = responseData.data.token;
        const user = responseData.data.user;

        // Save session credentials
        localStorage.setItem('authToken', token);
        localStorage.setItem('userInfo', JSON.stringify(user));

        // Redirect to dashboard page
        window.location.href = 'dashboard.html';
      } else {
        // Display API returned error messages
        errorMessage.textContent = responseData.message || 'NIA atau Password salah.';
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
