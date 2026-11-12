(() => {
  const canvas = document.querySelector('#regression-chart');
  const context = canvas?.getContext('2d');
  const slopeInput = document.querySelector('#slope');
  const interceptInput = document.querySelector('#intercept');
  const slopeValue = document.querySelector('#slope-value');
  const interceptValue = document.querySelector('#intercept-value');
  const equation = document.querySelector('#equation');
  const reset = document.querySelector('#reset');

  if (!canvas || !context || !slopeInput || !interceptInput) return;

  // A small fixed dataset lets learners focus on how the model line changes.
  const points = [
    [0.8, 2.1], [1.4, 2.3], [2.0, 3.6], [2.7, 3.0], [3.2, 4.1],
    [3.8, 3.5], [4.4, 5.1], [5.0, 4.8], [5.7, 5.2], [6.3, 6.7],
    [7.1, 6.1], [7.8, 7.4], [8.5, 7.0], [9.2, 8.4]
  ];

  const bounds = {
    xMin: 0,
    xMax: 10,
    yMin: -5,
    yMax: 10
  };

  function draw() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = {
      left: 42,
      right: 14,
      top: 14,
      bottom: 34
    };

    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const px = (x) =>
      pad.left + (x - bounds.xMin) /
      (bounds.xMax - bounds.xMin) * plotW;

    const py = (y) =>
      pad.top + (bounds.yMax - y) /
      (bounds.yMax - bounds.yMin) * plotH;

    const tickColor = '#D8D0C2';
    const labelColor = '#777168';

    context.clearRect(0, 0, w, h);
    context.font = '11px system-ui, sans-serif';
    context.lineWidth = 1;

    // Draw horizontal grid lines and y-axis labels.
    for (let y = bounds.yMin; y <= bounds.yMax; y += 5) {
      const yPos = py(y);

      context.beginPath();
      context.strokeStyle = tickColor;
      context.moveTo(pad.left, yPos);
      context.lineTo(w - pad.right, yPos);
      context.stroke();

      context.fillStyle = labelColor;
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      context.fillText(String(y), pad.left - 8, yPos);
    }

    // Draw vertical grid lines and x-axis labels.
    for (let x = bounds.xMin; x <= bounds.xMax; x += 2) {
      const xPos = px(x);

      context.beginPath();
      context.strokeStyle = tickColor;
      context.moveTo(xPos, pad.top);
      context.lineTo(xPos, h - pad.bottom);
      context.stroke();

      context.fillStyle = labelColor;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillText(String(x), xPos, h - pad.bottom + 8);
    }

    const slope = Number(slopeInput.value);
    const intercept = Number(interceptInput.value);

    // Keep the line within the visible graph area.
    let x1 = bounds.xMin;
    let x2 = bounds.xMax;
    let y1 = slope * x1 + intercept;
    let y2 = slope * x2 + intercept;

    if (y1 < bounds.yMin && slope !== 0) {
      x1 = (bounds.yMin - intercept) / slope;
    }
    if (y1 > bounds.yMax && slope !== 0) {
      x1 = (bounds.yMax - intercept) / slope;
    }
    if (y2 < bounds.yMin && slope !== 0) {
      x2 = (bounds.yMin - intercept) / slope;
    }
    if (y2 > bounds.yMax && slope !== 0) {
      x2 = (bounds.yMax - intercept) / slope;
    }

    x1 = Math.max(bounds.xMin, Math.min(bounds.xMax, x1));
    x2 = Math.max(bounds.xMin, Math.min(bounds.xMax, x2));
    y1 = slope * x1 + intercept;
    y2 = slope * x2 + intercept;

    context.beginPath();
    context.strokeStyle = '#6C6E36';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.moveTo(px(x1), py(y1));
    context.lineTo(px(x2), py(y2));
    context.stroke();

    // Draw the observed data points.
    for (const [x, y] of points) {
      context.beginPath();
      context.fillStyle = '#E3BD90';
      context.strokeStyle = '#675647';
      context.lineWidth = 1.5;
      context.arc(px(x), py(y), 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    slopeValue.value = slope.toFixed(1);
    interceptValue.value = intercept.toFixed(1);

    equation.textContent =
      `y = ${slope.toFixed(1)}x ` +
      `${intercept < 0 ? '−' : '+'} ` +
      `${Math.abs(intercept).toFixed(1)}`;
  }

  slopeInput.addEventListener('input', draw);
  interceptInput.addEventListener('input', draw);

  reset.addEventListener('click', () => {
    slopeInput.value = '0.8';
    interceptInput.value = '1';
    draw();
  });

  new ResizeObserver(draw).observe(canvas);
  draw();
})();