// Page script for pages/register.html (moved out of the HTML so inline scripts can be blocked).
if (!SITE_CONFIG.registrationOpen) {
  document.getElementById('regOpen').hidden = true;
  document.getElementById('regClosed').hidden = false;
}

function updateCountdown() {
  var deadline = new Date('2026-03-27T23:59:59+06:00');
  var now = new Date();
  var diff = deadline - now;
  if (diff <= 0) {
    document.getElementById('cdLabel').textContent = 'Registration deadline has passed — Late fee applies';
    document.getElementById('cdDays').textContent = '00';
    document.getElementById('cdHours').textContent = '00';
    document.getElementById('cdMins').textContent = '00';
    return;
  }
  var days = Math.floor(diff / (1000*60*60*24));
  var hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  var mins = Math.floor((diff % (1000*60*60)) / (1000*60));
  document.getElementById('cdDays').textContent = String(days).padStart(2,'0');
  document.getElementById('cdHours').textContent = String(hours).padStart(2,'0');
  document.getElementById('cdMins').textContent = String(mins).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown, 1000);
