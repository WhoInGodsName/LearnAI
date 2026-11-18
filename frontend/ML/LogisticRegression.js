(() => {
  const canvas = document.querySelector('#regression-chart');
  const context = canvas?.getContext('2d');
  const slopeInput = document.querySelector('#slope');
  const interceptInput = document.querySelector('#intercept');
  const slopeValue = document.querySelector('#slope-value');
  const interceptValue = document.querySelector('#intercept-value');
  const equation = document.querySelector('#equation');
  const reset = document.querySelector('#reset');
  const errorOutput = document.getElementById('Error');
  const lossOutput = document.getElementById('Loss');

  if (
    !canvas ||
    !context ||
    !slopeInput ||
    !interceptInput ||
    !slopeValue ||
    !interceptValue ||
    !equation ||
    !reset ||
    !errorOutput ||
    !lossOutput
  ) {
    return;
  }

  // Each item is [input value, actual class].
  // The actual class must be either 0 or 1.
  const points = [
    [0.6, 0],
    [1.1, 0],
    [1.5, 0],
    [1.9, 0],
    [2.3, 0],
    [2.9, 0],
    [3.4, 0],
    [3.8, 0],
    [4.3, 0],
    [4.9, 0],
    [3.9, 1],
    [4.5, 1],
    [5.2, 1],
    [5.8, 1],
    [6.4, 1],
    [6.9, 1],
    [7.4, 1],
    [7.9, 1],
    [8.4, 1],
    [9.1, 1],
    [9.6, 1]
  ];

  const bounds = {
    xMin: 0,
    xMax: 10,
    yMin: 0,
    yMax: 1
  };

  function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  function getMetrics(slope, intercept) {
    let totalLoss = 0;
    let misclassified = 0;
    const epsilon = 1e-12;

    for (const [x, actualClass] of points) {
      const probability = sigmoid(slope * x + intercept);

      // Keep the values away from exactly 0 and 1 before taking logarithms.
      const safeProbability = Math.max(
        epsilon,
        Math.min(1 - epsilon, probability)
      );

      // Binary cross-entropy: measures how well the probabilities fit the labels.
      totalLoss += -(
        actualClass * Math.log(safeProbability) +
        (1 - actualClass) * Math.log(1 - safeProbability)
      );

      // A probability of 0.5 or higher predicts class 1.
      const predictedClass = probability >= 0.5 ? 1 : 0;

      if (predictedClass !== actualClass) {
        misclassified += 1;
      }
    }

    const averageLoss = totalLoss / points.length;
    const classificationError = misclassified / points.length;

    errorOutput.textContent =
      `${(classificationError * 100).toFixed(1)}%`;

    lossOutput.textContent = averageLoss.toFixed(4);
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;

    const pad = {
      left: 42,
      right: 14,
      top: 14,
      bottom: 34
    };

    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;

    // Convert data coordinates into canvas pixel coordinates.
    const px = (x) =>
      pad.left +
      ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plotWidth;

    const py = (y) =>
      pad.top +
      ((bounds.yMax - y) / (bounds.yMax - bounds.yMin)) * plotHeight;

    context.clearRect(0, 0, width, height);
    context.font = '11px system-ui, sans-serif';
    context.lineWidth = 1;

    // Horizontal probability grid lines and labels, from 0 to 1.
    for (let i = 0; i <= 5; i++) {
      const probability = i / 5;
      const yPosition = py(probability);

      context.beginPath();
      context.strokeStyle = '#D8D0C2';
      context.moveTo(pad.left, yPosition);
      context.lineTo(width - pad.right, yPosition);
      context.stroke();

      context.fillStyle = '#777168';
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      context.fillText(probability.toFixed(1), pad.left - 8, yPosition);
    }

    // Vertical input grid lines and labels.
    for (let x = bounds.xMin; x <= bounds.xMax; x += 2) {
      const xPosition = px(x);

      context.beginPath();
      context.strokeStyle = '#D8D0C2';
      context.moveTo(xPosition, pad.top);
      context.lineTo(xPosition, height - pad.bottom);
      context.stroke();

      context.fillStyle = '#777168';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillText(String(x), xPosition, height - pad.bottom + 8);
    }

    const slope = Number(slopeInput.value);
    const intercept = Number(interceptInput.value);

    // Draw the 0.5 decision threshold.
    context.beginPath();
    context.strokeStyle = '#C0BDBC';
    context.lineWidth = 1.5;
    context.setLineDash([6, 5]);
    context.moveTo(px(bounds.xMin), py(0.5));
    context.lineTo(px(bounds.xMax), py(0.5));
    context.stroke();
    context.setLineDash([]);

    // Sample many x values and connect their predicted probabilities.
    context.beginPath();

    for (let i = 0; i <= 200; i++) {
      const x =
        bounds.xMin +
        (i / 200) * (bounds.xMax - bounds.xMin);

      const probability = sigmoid(slope * x + intercept);

      if (i === 0) {
        context.moveTo(px(x), py(probability));
      } else {
        context.lineTo(px(x), py(probability));
      }
    }

    context.strokeStyle = '#6C6E36';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.stroke();

    // Plot observed data at their actual class labels, 0 or 1.
    for (const [x, actualClass] of points) {
      context.beginPath();
      context.fillStyle = actualClass === 1 ? '#E3BD90' : '#675647';
      context.strokeStyle = '#675647';
      context.lineWidth = 1.5;
      context.arc(px(x), py(actualClass), 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    slopeValue.value = slope.toFixed(1);
    interceptValue.value = intercept.toFixed(1);

    const interceptSign = intercept < 0 ? '−' : '+';

    equation.textContent =
      `p = σ(${slope.toFixed(1)}x ${interceptSign} ` +
      `${Math.abs(intercept).toFixed(1)})`;

    getMetrics(slope, intercept);
  }

  slopeInput.addEventListener('input', draw);
  interceptInput.addEventListener('input', draw);

  reset.addEventListener('click', () => {
    slopeInput.value = '0.8';
    interceptInput.value = '-4';
    draw();
  });

  new ResizeObserver(draw).observe(canvas);
  draw();
})();

