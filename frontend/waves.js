(() => {
  const canvas = document.querySelector('.wave-field');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -1000, y: -1000, active: false };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = Math.max(window.innerHeight, 620);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  function draw(time = 0) {
    ctx.clearRect(0, 0, width, height);
    const compact = width < 640;
    const centerY = compact ? height * 0.61 : height * 0.62;
    const amplitude = compact ? 28 : 43;
    const count = compact ? 15 : 21;
    const speed = reduceMotion.matches ? 0 : time * 0.00022;

    for (let i = 0; i < count; i++) {
      const p = i / (count - 1);
      const spread = (p - 0.5) * (compact ? 100 : 142);
      const opacity = 0.19 + Math.sin(p * Math.PI) * 0.26;
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 5) {
        const nx = x / width;
        const phase = nx * Math.PI * 3.4 - speed + p * 0.32;
        let y = centerY + spread + Math.sin(phase) * amplitude + Math.sin(phase * 0.52 + 1.4) * amplitude * 0.35;
        if (pointer.active) {
          const dx = (x - pointer.x) / (compact ? 125 : 180);
          const dy = (y - pointer.y) / (compact ? 90 : 130);
          const influence = Math.exp(-(dx * dx + dy * dy) * 1.2);
          y += Math.sin(dx * 5 - time * 0.003) * influence * (compact ? 22 : 34);
        }
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(108, 110, 54, ${opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    if (reduceMotion.matches) draw(performance.now());
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });
  reduceMotion.addEventListener?.('change', () => {
    cancelAnimationFrame(frame);
    if (!reduceMotion.matches) draw(performance.now());
    else draw(performance.now());
  });
  resize();
})();
