// Wajib: Auth Guard di bagian paling atas
if (!localStorage.getItem('authToken')) {
  window.location.href = 'login.html';
}

import { db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', () => {
  const authShield = document.getElementById('auth-shield');
  const userInfoElement = document.getElementById('userInfo');
  const logoutBtn = document.getElementById('btnLogout');
  
  const scanForm = document.getElementById('scanForm');
  const etAwb = document.getElementById('etAwb');
  const btnScan = document.getElementById('btnScan');
  const statusSelect = document.getElementById('statusSelect');
  const scanCounter = document.getElementById('scanCounter');
  const scanLoading = document.getElementById('scanLoading');
  const scanHistory = document.getElementById('scanHistory');

  let totalScanned = 0;

  // Hide the auth shield since token check passed
  if (authShield) {
    authShield.style.opacity = '0';
    setTimeout(() => {
      authShield.style.display = 'none';
      etAwb.focus(); // Autofocus ready for scanner
    }, 400);
  }

  // Display User Information
  const userInfoStr = localStorage.getItem('userInfo');
  let userName = 'Mitra';
  if (userInfoStr) {
    try {
      const user = JSON.parse(userInfoStr);
      userName = user.name || 'Mitra';
      userInfoElement.textContent = `Halo, ${userName}!`;
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

  // Play a short beep sound
  const playBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 1200 : 300, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.1 : 0.3));
    } catch (e) {
      console.log('Audio disabled', e);
    }
  };

  // Scan Function
  scanForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const awbNumber = etAwb.value.trim().toUpperCase();
    const selectedStatus = statusSelect.value;

    if (!awbNumber) {
      return;
    }

    scanLoading.style.display = 'block';
    btnScan.disabled = true;
    etAwb.disabled = true;

    const docRef = doc(db, 'shipments', awbNumber);
    
    // Use setDoc with merge:true so it creates the document if it doesn't exist
    const updateData = {
      status: selectedStatus,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({
        status: selectedStatus,
        timestamp: new Date().toISOString(), // Use ISO string to avoid complex serialization issues
        location: 'Hub Operasional',
        operator: userName
      })
    };

    setDoc(docRef, updateData, { merge: true })
      .then(() => {
        playBeep(true);
        // Update Counter
        totalScanned++;
        scanCounter.textContent = totalScanned;

        // Add to History UI
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item success';
        historyItem.innerHTML = `
          <div class="history-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
          </div>
          <div class="history-details">
            <strong>${awbNumber}</strong>
            <span>${selectedStatus}</span>
          </div>
          <div class="history-time">${new Date().toLocaleTimeString('id-ID')}</div>
        `;
        
        // Remove empty state message if it exists
        const emptyMsg = scanHistory.querySelector('.empty-history');
        if (emptyMsg) {
          emptyMsg.remove();
        }
        
        scanHistory.prepend(historyItem);
      })
      .catch((error) => {
        console.error('Firestore update error:', error);
        playBeep(false);
        
        // Add to History UI (Error)
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item error';
        historyItem.innerHTML = `
          <div class="history-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
          </div>
          <div class="history-details">
            <strong>${awbNumber}</strong>
            <span class="text-error">Gagal Simpan</span>
          </div>
          <div class="history-time">${new Date().toLocaleTimeString('id-ID')}</div>
        `;
        
        const emptyMsg = scanHistory.querySelector('.empty-history');
        if (emptyMsg) {
          emptyMsg.remove();
        }
        
        scanHistory.prepend(historyItem);
      })
      .finally(() => {
        scanLoading.style.display = 'none';
        btnScan.disabled = false;
        etAwb.disabled = false;
        etAwb.value = '';
        etAwb.focus(); // Keep focus for continuous scanning
      });
  });
});
