(() => {
  const button = document.querySelector('#copy-python-code');
  const label = document.querySelector('#copy-python-label');
  const code = document.querySelector('.nb-code-frame code');
  if (!button || !label || !code) return;

  function fallbackCopy(text) {
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = text;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.style.position = 'fixed';
    temporaryInput.style.left = '-9999px';
    document.body.append(temporaryInput);
    temporaryInput.select();
    const copied = document.execCommand('copy');
    temporaryInput.remove();
    return copied;
  }

  let feedbackTimer;
  button.addEventListener('click', async () => {
    const text = code.textContent;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) copied = fallbackCopy(text);

    clearTimeout(feedbackTimer);
    button.classList.toggle('is-copied', copied);
    label.textContent = copied ? 'Copied!' : 'Copy failed';
    feedbackTimer = setTimeout(() => {
      button.classList.remove('is-copied');
      label.textContent = 'Copy code';
    }, 1800);
  });
})();
