// Page script for pages/rules.html (moved out of the HTML so inline scripts can be blocked).
document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('rulesCheck');
  const proceedBtn = document.getElementById('proceedBtn');
  const proceedHint = document.getElementById('proceedHint');
  if (checkbox && proceedBtn) {
    checkbox.addEventListener('change', () => {
      const checked = checkbox.checked;
      proceedBtn.classList.toggle('enabled', checked);
      if (proceedHint) proceedHint.classList.toggle('hidden', checked);
    });
  }

  // Char count for experience form
  const textarea = document.getElementById('expMessage');
  const charCount = document.getElementById('charCount');
  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.trim().length;
      charCount.textContent = `${len} / 20 minimum`;
      charCount.classList.toggle('enough', len >= 20);
    });
  }
});
