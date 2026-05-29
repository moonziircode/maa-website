// Wajib: Auth Guard di bagian paling atas
if (!localStorage.getItem('authToken')) {
  window.location.href = 'login.html';
}

import { db } from './firebase-config.js';
import { doc, getDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', () => {
  const authShield = document.getElementById('auth-shield');
  const userInfoElement = document.getElementById('userInfo');
  const logoutBtn = document.getElementById('btnLogout');
  const searchForm = document.getElementById('searchForm');
  const etAwb = document.getElementById('etAwb');
  const btnSearch = document.getElementById('btnSearch');
  const searchLoading = document.getElementById('searchLoading');
  const searchResult = document.getElementById('searchResult');

  // Hide the auth shield since token check passed
  if (authShield) {
    authShield.style.opacity = '0';
    setTimeout(() => {
      authShield.style.display = 'none';
    }, 400);
  }

  // Display User Information
  const userInfoStr = localStorage.getItem('userInfo');
  if (userInfoStr) {
    try {
      const user = JSON.parse(userInfoStr);
      userInfoElement.textContent = `Halo, ${user.name || 'Mitra'}!`;
    } catch (e) {
      console.error('Error parsing userInfo:', e);
      userInfoElement.textContent = 'Halo, Mitra!';
    }
  }

  // Logout Function
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    window.location.href = 'login.html';
  });

  // Search Function
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Reset result and show loading
    searchResult.innerHTML = '';
    const awbNumber = etAwb.value.trim();

    if (!awbNumber) {
      searchResult.innerHTML = `
        <div style="color: var(--error-red); text-align: center; padding: 15px; font-weight: 500;">
          Harap masukkan nomor AWB terlebih dahulu.
        </div>
      `;
      return;
    }

    searchLoading.style.display = 'block';
    btnSearch.disabled = true;

    // Connect to Firestore shipments collection
    const docRef = doc(db, 'shipments', awbNumber);

    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Process statusHistory timeline
          let history = data.statusHistory || [];
          
          // Sort statusHistory by timestamp to display latest at the top
          // Firestore Timestamp objects have seconds and nanoseconds.
          history.sort((a, b) => {
            const timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA; // Descending order (latest first)
          });

          // Build timeline HTML
          let timelineHTML = '';
          if (history.length > 0) {
            history.forEach((item) => {
              let timeStr = '';
              if (item.timestamp && typeof item.timestamp.toDate === 'function') {
                timeStr = item.timestamp.toDate().toLocaleString('id-ID');
              } else if (item.timestamp) {
                timeStr = new Date(item.timestamp).toLocaleString('id-ID');
              } else {
                timeStr = 'Waktu tidak tersedia';
              }

              const locationStr = item.location ? ` - ${item.location}` : '';

              timelineHTML += `
                <div class="timeline-item">
                  <div class="timeline-status">${item.status || 'Pembaruan Status'}</div>
                  <div class="timeline-meta">${timeStr}${locationStr}</div>
                </div>
              `;
            });
          } else {
            timelineHTML = `
              <div class="timeline-item">
                <div class="timeline-status">Belum ada riwayat update status.</div>
              </div>
            `;
          }

          // Build full shipment details card HTML
          searchResult.innerHTML = `
            <div class="result-card">
              <h3>Detail Pengiriman</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <p>Nomor AWB</p>
                  <strong>${data.waybillNo || awbNumber}</strong>
                </div>
                <div class="detail-item">
                  <p>Booking ID</p>
                  <strong>${data.bookingId || '-'}</strong>
                </div>
                <div class="detail-item">
                  <p>Status Terkini</p>
                  <strong>${data.status || 'Dalam Proses'}</strong>
                </div>
                <div class="detail-item">
                  <p>Nama Barang</p>
                  <strong>${data.itemName || '-'}</strong>
                </div>
                <div class="detail-item">
                  <p>Berat Barang</p>
                  <strong>${data.weightKg ? data.weightKg + ' Kg' : '-'}</strong>
                </div>
                <div class="detail-item">
                  <p>Tipe Layanan</p>
                  <strong>${data.serviceType || '-'}</strong>
                </div>
                <div class="detail-item">
                  <p>Pengirim</p>
                  <strong>${data.senderName || '-'}</strong>
                </div>
                <div class="detail-item">
                  <p>Penerima</p>
                  <strong>${data.recipientName || '-'}</strong>
                </div>
              </div>

              <h4 style="margin-bottom: 20px; font-weight: 600; color: var(--dark-grey); font-size: 1.1rem; border-bottom: 1px solid var(--light-grey); padding-bottom: 10px;">Riwayat Status Pengiriman</h4>
              <div class="timeline">
                ${timelineHTML}
              </div>
            </div>
          `;
        } else {
          // Document does not exist
          searchResult.innerHTML = `
            <div class="state-panel" style="text-align: center; padding: 40px 20px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid var(--light-grey);">
              <div class="state-icon" style="color: var(--medium-grey); width: 64px; height: 64px; background: rgba(0,0,0,0.03); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M12,20A8,8 0 1,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 1,0 22,12A10,10 0 0,0 12,2M12,6A1,1 0 0,0 11,7V13A1,1 0 0,0 12,14H16A1,1 0 0,0 16,12H13V7A1,1 0 0,0 12,6Z" />
                </svg>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 5px; color: var(--dark-grey);">Data tidak ditemukan</h3>
              <p style="color: var(--medium-grey); font-size: 0.95rem; max-width: 400px; margin: 0 auto;">Nomor AWB tidak terdaftar atau tidak ditemukan dalam sistem database.</p>
            </div>
          `;
        }
      })
      .catch((error) => {
        console.error('Firestore connection error:', error);
        searchResult.innerHTML = `
          <div style="color: var(--error-red); text-align: center; padding: 20px; font-weight: 500; background: white; border-radius: 12px; border: 1px solid rgba(235, 87, 87, 0.2); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
            Gagal mengambil data dari database. Silakan periksa koneksi internet Anda atau coba lagi beberapa saat lagi.
          </div>
        `;
      })
      .finally(() => {
        searchLoading.style.display = 'none';
        btnSearch.disabled = false;
      });
  });
});
