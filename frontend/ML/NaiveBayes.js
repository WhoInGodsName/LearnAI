(() => {
  const canvas = document.querySelector('#naive-bayes-chart');
  const context = canvas?.getContext('2d');
  const result = document.querySelector('#classification-result');
  const emailPreview = document.querySelector('#email-preview');
  const spamOutput = document.querySelector('#spam-probability');
  const normalOutput = document.querySelector('#normal-probability');
  const checkboxes = [...document.querySelectorAll('.nb-word-options input[type="checkbox"]')];
  const presetButtons = document.querySelectorAll('[data-preset]');
  const clearButton = document.querySelector('#clear-email');
  if (!canvas || !context || !result || !emailPreview || !spamOutput || !normalOutput || !checkboxes.length || !clearButton) return;

  // Word frequencies from a tiny labelled example set. Laplace smoothing adds one to each count.
  const vocabulary = checkboxes.map((checkbox) => checkbox.value);
  const spamCounts = {
    free: 4, prize: 3, urgent: 2, claim: 3, now: 2, offer: 2, click: 2, win: 1,
    meeting: 0, project: 0, report: 0, team: 0, invoice: 0, tomorrow: 0, update: 0, lunch: 0
  };
  const normalCounts = {
    free: 0, prize: 0, urgent: 0, claim: 0, now: 0, offer: 0, click: 0, win: 0,
    meeting: 4, project: 3, report: 3, team: 2, invoice: 1, tomorrow: 2, update: 2, lunch: 1
  };
  const spamTotal = Object.values(spamCounts).reduce((sum, count) => sum + count, 0);
  const normalTotal = Object.values(normalCounts).reduce((sum, count) => sum + count, 0);
  const smoothing = 1;

  function classify(words) {
    // Log scores keep multiplying many small likelihoods numerically stable.
    let spamLogScore = Math.log(0.5);
    let normalLogScore = Math.log(0.5);
    words.forEach((word) => {
      spamLogScore += Math.log((spamCounts[word] + smoothing) / (spamTotal + smoothing * vocabulary.length));
      normalLogScore += Math.log((normalCounts[word] + smoothing) / (normalTotal + smoothing * vocabulary.length));
    });
    const maxLogScore = Math.max(spamLogScore, normalLogScore);
    const spamScore = Math.exp(spamLogScore - maxLogScore);
    const normalScore = Math.exp(normalLogScore - maxLogScore);
    const totalScore = spamScore + normalScore;
    return { spam: spamScore / totalScore, normal: normalScore / totalScore };
  }

  function draw(probabilities) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const padding = { left: 48, right: 18, top: 26, bottom: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const yFor = (probability) => padding.top + (1 - probability) * plotHeight;
    context.clearRect(0, 0, width, height);

    context.font = '11px Ubuntu, sans-serif';
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let percent = 0; percent <= 100; percent += 20) {
      const y = yFor(percent / 100);
      context.beginPath();
      context.strokeStyle = '#E7C7C1';
      context.lineWidth = 1;
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillStyle = '#64504C';
      context.fillText(`${percent}%`, padding.left - 8, y);
    }

    const categories = [
      { label: 'Spam', probability: probabilities.spam, color: '#BC4639' },
      { label: 'Normal', probability: probabilities.normal, color: '#4285F4' }
    ];
    const barWidth = Math.min(112, plotWidth * 0.3);
    categories.forEach((category, index) => {
      const centerX = padding.left + plotWidth * (index === 0 ? 0.29 : 0.71);
      const barTop = yFor(category.probability);
      const barHeight = Math.max(0, padding.top + plotHeight - barTop);
      context.fillStyle = category.color;
      context.fillRect(centerX - barWidth / 2, barTop, barWidth, barHeight);
      context.fillStyle = '#37231F';
      context.font = '700 14px Ubuntu, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'bottom';
      context.fillText(`${Math.round(category.probability * 100)}%`, centerX, Math.max(padding.top + 19, barTop - 7));
      context.font = '700 13px Ubuntu, sans-serif';
      context.textBaseline = 'top';
      context.fillText(category.label, centerX, padding.top + plotHeight + 12);
    });
  }

  function update() {
    const words = checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    const probabilities = classify(words);
    const spamPercent = Math.round(probabilities.spam * 100);
    const normalPercent = 100 - spamPercent;

    spamOutput.textContent = `${spamPercent}%`;
    normalOutput.textContent = `${normalPercent}%`;
    if (spamPercent === normalPercent) result.textContent = 'Even odds';
    else result.textContent = spamPercent > normalPercent ? 'Likely spam' : 'Likely normal';

    emailPreview.textContent = words.length
      ? `Words in this message: ${words.join(' · ')}.`
      : 'No words selected yet. Try one of the example emails or choose words below.';
    canvas.setAttribute('aria-label', `Naive Bayes estimates ${spamPercent}% probability of spam and ${normalPercent}% probability of a normal email.`);
    draw(probabilities);
  }

  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', update));
  presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.preset === 'spam'
        ? ['free', 'prize', 'claim', 'now']
        : ['meeting', 'project', 'report', 'team'];
      checkboxes.forEach((checkbox) => { checkbox.checked = selected.includes(checkbox.value); });
      update();
    });
  });
  clearButton.addEventListener('click', () => {
    checkboxes.forEach((checkbox) => { checkbox.checked = false; });
    update();
  });

  if ('ResizeObserver' in window) new ResizeObserver(update).observe(canvas);
  else window.addEventListener('resize', update);
  update();
})();
