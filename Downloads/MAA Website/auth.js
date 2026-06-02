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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nia, password })
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
        errorMessage.textContent = responseData.message || 'NIA atau Password salah.';
      }
    } catch (error) {
      console.error('Network or Login Error:', error);
      errorMessage.textContent = 'Detail Error: ' + error.message;
    } finally {
      // Re-enable button and hide loading state
      loadingSpinner.style.display = 'none';
      btnLogin.disabled = false;
    }
  });
});
