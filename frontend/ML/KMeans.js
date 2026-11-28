(() => {
  const scatter = document.querySelector('#kmeans-scatter');
  const elbow = document.querySelector('#kmeans-elbow');
  const slider = document.querySelector('#k-slider');
  if (!scatter || !elbow || !slider) return;

  const ctx = scatter.getContext('2d');
  const elbowCtx = elbow.getContext('2d');
  const valueOutput = document.querySelector('#k-slider-value');
  const selectedOutput = document.querySelector('#selected-k');
  const summary = document.querySelector('#k-summary');
  const wcssOutput = document.querySelector('#wcss-value');
  const legend = document.querySelector('#cluster-legend');
  const reset = document.querySelector('#kmeans-reset');
  const colors = ['#4285F4', '#BC4639', '#6C6E36', '#EFB11D', '#D6536D', '#5C2018', '#63A7B4', '#8C6BB1'];
  const maxK = Number(slider.max);
  const points = makePoints();
  const models = new Map();
  let k = Number(slider.value);

  function makePoints() {
    // Four naturally separated groups make it possible to see the elbow at K = 4.
    const groups = [
      { x: -2.2, y: -1.7 }, { x: -2.0, y: 1.65 },
      { x: 2.0, y: -1.55 }, { x: 2.15, y: 1.7 }
    ];
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const gaussian = () => {
      const a = Math.max(random(), 1e-9);
      return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * random());
    };
    return groups.flatMap((center, group) => Array.from({ length: 24 }, () => ({
      x: center.x + gaussian() * 0.48,
      y: center.y + gaussian() * 0.43,
      sourceGroup: group
    })));
  }

  function distanceSquared(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function assignPoints(centers) {
    return points.map(point => {
      let closest = 0;
      let bestDistance = Infinity;
      centers.forEach((center, index) => {
        const distance = distanceSquared(point, center);
        if (distance < bestDistance) { bestDistance = distance; closest = index; }
      });
      return closest;
    });
  }

  function initializeCenters(count, random) {
    const centers = [points[Math.floor(random() * points.length)]];
    while (centers.length < count) {
      const weights = points.map(point => Math.min(...centers.map(center => distanceSquared(point, center))));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let threshold = random() * total;
      let chosen = points[points.length - 1];
      for (let index = 0; index < points.length; index += 1) {
        threshold -= weights[index];
        if (threshold <= 0) { chosen = points[index]; break; }
      }
      centers.push(chosen);
    }
    return centers.map(point => ({ x: point.x, y: point.y }));
  }

  function runKMeans(count, restartSeed) {
    let seed = restartSeed;
    const random = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    let centers = initializeCenters(count, random);
    let assignments = [];

    for (let iteration = 0; iteration < 100; iteration += 1) {
      assignments = assignPoints(centers);
      const sums = Array.from({ length: count }, () => ({ x: 0, y: 0, n: 0 }));
      points.forEach((point, index) => {
        const bucket = sums[assignments[index]];
        bucket.x += point.x;
        bucket.y += point.y;
        bucket.n += 1;
      });
      let movement = 0;
      centers = sums.map((sum, index) => {
        if (!sum.n) return centers[index];
        const next = { x: sum.x / sum.n, y: sum.y / sum.n };
        movement += distanceSquared(next, centers[index]);
        return next;
      });
      if (movement < 1e-7) break;
    }

    // Reassign once after the final centre update so the plotted WCSS is consistent.
    assignments = assignPoints(centers);
    const wcss = points.reduce((sum, point, index) => sum + distanceSquared(point, centers[assignments[index]]), 0);
    return { centers, assignments, wcss };
  }

  function bestModel(count) {
    let best = null;
    for (let restart = 1; restart <= 10; restart += 1) {
      const candidate = runKMeans(count, 1000 + count * 7919 + restart * 104729);
      if (!best || candidate.wcss < best.wcss) best = candidate;
    }
    return best;
  }

  for (let count = 1; count <= maxK; count += 1) models.set(count, bestModel(count));

  function setupCanvas(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  function drawScatter() {
    const { width, height } = setupCanvas(scatter, ctx);
    const margin = { left: 36, right: 12, top: 12, bottom: 28 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const minX = -4.2, maxX = 4.2, minY = -3.4, maxY = 3.4;
    const px = x => margin.left + ((x - minX) / (maxX - minX)) * plotW;
    const py = y => margin.top + ((maxY - y) / (maxY - minY)) * plotH;
    const model = models.get(k);
    ctx.clearRect(0, 0, width, height);
    ctx.font = '10px Ubuntu, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2d5c5';
    ctx.fillStyle = '#756b63';
    [-4, -2, 0, 2, 4].forEach(tick => {
      const x = px(tick);
      ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotH); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(String(tick), x, height - 12);
    });
    [-3, -1.5, 0, 1.5, 3].forEach(tick => {
      const y = py(tick);
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotW, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(String(tick), margin.left - 7, y);
    });
    points.forEach((point, index) => {
      const color = colors[model.assignments[index] % colors.length];
      ctx.beginPath(); ctx.arc(px(point.x), py(point.y), 4.1, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fffaf5'; ctx.lineWidth = 1.2; ctx.stroke();
    });
    model.centers.forEach((center, index) => {
      const x = px(center.x), y = py(center.y), size = 7;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#fffaf5'; ctx.strokeStyle = colors[index % colors.length]; ctx.lineWidth = 2.5;
      ctx.fillRect(-size / 2, -size / 2, size, size); ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    });
    renderLegend(k);
  }

  function drawElbow() {
    const { width, height } = setupCanvas(elbow, elbowCtx);
    const margin = { left: 44, right: 14, top: 18, bottom: 32 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const values = Array.from(models, ([count, model]) => ({ count, wcss: model.wcss }));
    const maxValue = Math.max(...values.map(item => item.wcss)) * 1.08;
    const px = count => margin.left + ((count - 1) / (maxK - 1)) * plotW;
    const py = value => margin.top + plotH - (value / maxValue) * plotH;
    elbowCtx.clearRect(0, 0, width, height);
    elbowCtx.font = '10px Ubuntu, sans-serif'; elbowCtx.textBaseline = 'middle';
    elbowCtx.strokeStyle = '#e2d5c5'; elbowCtx.fillStyle = '#756b63'; elbowCtx.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = (maxValue * tick) / 4;
      const y = py(value);
      elbowCtx.beginPath(); elbowCtx.moveTo(margin.left, y); elbowCtx.lineTo(margin.left + plotW, y); elbowCtx.stroke();
      elbowCtx.textAlign = 'right'; elbowCtx.fillText(value.toFixed(0), margin.left - 7, y);
    }
    for (let count = 1; count <= maxK; count += 1) {
      const x = px(count);
      elbowCtx.textAlign = 'center'; elbowCtx.fillText(String(count), x, height - 14);
    }
    elbowCtx.beginPath();
    values.forEach((item, index) => index === 0 ? elbowCtx.moveTo(px(item.count), py(item.wcss)) : elbowCtx.lineTo(px(item.count), py(item.wcss)));
    elbowCtx.strokeStyle = '#6C6E36'; elbowCtx.lineWidth = 2.5; elbowCtx.stroke();
    values.forEach(item => {
      const selected = item.count === k;
      elbowCtx.beginPath(); elbowCtx.arc(px(item.count), py(item.wcss), selected ? 6 : 4, 0, Math.PI * 2);
      elbowCtx.fillStyle = selected ? '#EFB11D' : '#FFFCFA';
      elbowCtx.strokeStyle = selected ? '#5C2018' : '#6C6E36'; elbowCtx.lineWidth = selected ? 2 : 1.5;
      elbowCtx.fill(); elbowCtx.stroke();
    });
    elbowCtx.save();
    elbowCtx.translate(12, margin.top + plotH / 2); elbowCtx.rotate(-Math.PI / 2);
    elbowCtx.textAlign = 'center'; elbowCtx.fillStyle = '#756b63'; elbowCtx.fillText('Within-cluster sum of squares', 0, 0);
    elbowCtx.restore();
    elbowCtx.textAlign = 'center'; elbowCtx.fillStyle = '#756b63'; elbowCtx.fillText('Number of clusters (K)', margin.left + plotW / 2, height - 2);
  }

  function renderLegend(count) {
    legend.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const item = document.createElement('span');
      const swatch = document.createElement('i');
      swatch.style.backgroundColor = colors[index % colors.length];
      item.append(swatch, document.createTextNode(`Cluster ${index + 1}`));
      legend.append(item);
    }
    const centroid = document.createElement('span');
    const marker = document.createElement('i');
    marker.style.background = '#fffaf5'; marker.style.borderRadius = '2px'; marker.style.transform = 'rotate(45deg)';
    centroid.append(marker, document.createTextNode('Centroid'));
    legend.append(centroid);
  }

  function update() {
    k = Number(slider.value);
    valueOutput.value = String(k); valueOutput.textContent = String(k);
    selectedOutput.value = `K = ${k}`; selectedOutput.textContent = `K = ${k}`;
    summary.textContent = `${k} ${k === 1 ? 'cluster' : 'clusters'}`;
    wcssOutput.textContent = models.get(k).wcss.toFixed(2);
    drawScatter(); drawElbow();
  }

  slider.addEventListener('input', update);
  reset.addEventListener('click', () => { slider.value = '4'; update(); });
  const resizeObserver = new ResizeObserver(() => { drawScatter(); drawElbow(); });
  resizeObserver.observe(scatter.parentElement);
  resizeObserver.observe(elbow.parentElement);
  update();
})();
