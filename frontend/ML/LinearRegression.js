(() => {
  // Initialize every playground independently. Each graph uses only its own controls.
  const points = [[0.8,2.1],[1.4,2.3],[2.0,3.6],[2.7,3.0],[3.2,4.1],[3.8,3.5],[4.4,5.1],[5.0,4.8],[5.7,5.2],[6.3,6.7],[7.1,6.1],[7.8,7.4],[8.5,7.0],[9.2,8.4]];
  const bounds = { xMin: 0, xMax: 10, yMin: -5, yMax: 10 };

  document.querySelectorAll('.playground').forEach((playground) => {
    const canvas = playground.querySelector('canvas');
    const context = canvas?.getContext('2d');
    const [slopeInput, interceptInput] = playground.querySelectorAll('input[type="range"]');
    const [slopeValue, interceptValue] = playground.querySelectorAll('.range-label output');
    const equation = playground.querySelector('.equation');
    const reset = playground.querySelector('.reset-button');
    const errorOutput = playground.querySelector('[id="Error"], [id="error-2"]');
    const lossOutput = playground.querySelector('[id="Loss"], [id="loss-2"]');
    const residualToggle = playground.querySelector('[data-show-residuals]');
    const squaredResidualToggle = playground.querySelector('[data-show-squared-residuals]');
    if (!canvas || !context || !slopeInput || !interceptInput) return;

    function draw() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;
      const pad = { left: 42, right: 14, top: 14, bottom: 34 };
      const plotW = w - pad.left - pad.right, plotH = h - pad.top - pad.bottom;
      const px = x => pad.left + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * plotW;
      const py = y => pad.top + (bounds.yMax - y) / (bounds.yMax - bounds.yMin) * plotH;
      const slope = Number(slopeInput.value), intercept = Number(interceptInput.value);
      context.clearRect(0, 0, w, h);
      context.font = '11px system-ui, sans-serif';
      context.lineWidth = 1;
      for (let y = bounds.yMin; y <= bounds.yMax; y += 5) {
        const yp = py(y);
        context.beginPath(); context.strokeStyle = '#E7C7C1';
        context.moveTo(pad.left, yp); context.lineTo(w - pad.right, yp); context.stroke();
        context.fillStyle = '#64504C'; context.textAlign = 'right'; context.textBaseline = 'middle';
        context.fillText(String(y), pad.left - 8, yp);
      }
      for (let x = bounds.xMin; x <= bounds.xMax; x += 2) {
        const xp = px(x);
        context.beginPath(); context.strokeStyle = '#E7C7C1';
        context.moveTo(xp, pad.top); context.lineTo(xp, h - pad.bottom); context.stroke();
        context.fillStyle = '#64504C'; context.textAlign = 'center'; context.textBaseline = 'top';
        context.fillText(String(x), xp, h - pad.bottom + 8);
      }
      let x1 = bounds.xMin, x2 = bounds.xMax;
      let y1 = slope * x1 + intercept, y2 = slope * x2 + intercept;
      if (y1 < bounds.yMin && slope !== 0) x1 = (bounds.yMin - intercept) / slope;
      if (y1 > bounds.yMax && slope !== 0) x1 = (bounds.yMax - intercept) / slope;
      if (y2 < bounds.yMin && slope !== 0) x2 = (bounds.yMin - intercept) / slope;
      if (y2 > bounds.yMax && slope !== 0) x2 = (bounds.yMax - intercept) / slope;
      x1 = Math.max(bounds.xMin, Math.min(bounds.xMax, x1));
      x2 = Math.max(bounds.xMin, Math.min(bounds.xMax, x2));
      y1 = slope * x1 + intercept; y2 = slope * x2 + intercept;
      context.beginPath(); context.strokeStyle = '#1F5FC9'; context.lineWidth = 3; context.lineCap = 'round';
      context.moveTo(px(x1), py(y1)); context.lineTo(px(x2), py(y2)); context.stroke();

      let sse = 0;
      for (const [x, y] of points) {
        const predicted = slope * x + intercept;
        sse += (x - predicted) ** 2;

        // Draw the vertical residual gap when its checkbox is enabled.
        const residual = y - predicted;
        if (residualToggle?.checked) {
          context.beginPath();
          context.setLineDash([5, 4]);
          context.strokeStyle = '#4285F4';
          context.lineWidth = 2;
          context.moveTo(px(x), py(y));
          context.lineTo(px(x), py(predicted));
          context.stroke();
          context.setLineDash([]);
        }

        // Draw a true pixel square, anchored beside the vertical residual gap.
        if (squaredResidualToggle?.checked && Math.abs(residual) > 0) {
          const pointY = py(y);
          const predictionY = py(predicted);
          const side = Math.abs(pointY - predictionY);
          const squareX = px(x) + 8;
          const squareY = Math.min(pointY, predictionY);
          context.fillStyle = 'rgba(188, 70, 57, 0.18)';
          context.strokeStyle = '#BC4639';
          context.lineWidth = 1.5;
          context.fillRect(squareX, squareY, side, side);
          context.strokeRect(squareX, squareY, side, side);
        }
        context.beginPath(); context.fillStyle = '#BC4639'; context.strokeStyle = '#5C2018'; context.lineWidth = 1.5;
        context.arc(px(x), py(y), 5, 0, Math.PI * 2); context.fill(); context.stroke();
      }
      if (slopeValue) slopeValue.value = slope.toFixed(1);
      if (interceptValue) interceptValue.value = intercept.toFixed(1);
      if (equation) equation.textContent = `y = ${slope.toFixed(1)}x ${intercept < 0 ? '−' : '+'} ${Math.abs(intercept).toFixed(1)}`;
      if (errorOutput) errorOutput.textContent = sse.toPrecision(4);
      if (lossOutput) lossOutput.textContent = (sse / points.length).toPrecision(4);
    }
    slopeInput.addEventListener('input', draw);
    interceptInput.addEventListener('input', draw);
    residualToggle?.addEventListener('change', draw);
    squaredResidualToggle?.addEventListener('change', draw);
    reset?.addEventListener('click', () => { slopeInput.value = '0.8'; interceptInput.value = '1'; draw(); });
    new ResizeObserver(draw).observe(canvas);
    draw();
  });
})();





