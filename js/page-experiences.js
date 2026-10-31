// Page script for pages/experiences.html (moved out of the HTML so inline scripts can be blocked).
document.addEventListener('DOMContentLoaded', () => {
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
