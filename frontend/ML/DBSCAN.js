(() => {
  const canvas = document.querySelector('#dbscan-chart');
  const progressInput = document.querySelector('#dbscan-progress');
  const progressOutput = document.querySelector('#dbscan-progress-value');
  const stageOutput = document.querySelector('#dbscan-stage');
  const description = document.querySelector('#dbscan-description');
  const resetButton = document.querySelector('#dbscan-reset');
  const context = canvas?.getContext('2d');
  if (!canvas || !context || !progressInput) return;

  const epsilon = 0.46;
  const minPoints = 4;
  const points = [];
  let randomState = 73421;
  function random() {
    randomState = (randomState * 16807) % 2147483647;
    return (randomState - 1) / 2147483646;
  }
  function gaussian() {
    return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-9))) * Math.cos(2 * Math.PI * random());
  }

  // A compact, uneven inner cloud and a lumpy outer band make the data less artificial.
  while (points.length < 52) {
    const x = gaussian() * 0.26;
    const y = gaussian() * 0.22;
    if ((x * x) / (0.62 * 0.62) + (y * y) / (0.52 * 0.52) <= 1) {
      points.push({ x, y, group: 'inner' });
    }
  }
  const outerCount = 90;
  for (let i = 0; i < outerCount; i += 1) {
    const baseAngle = (i / outerCount) * Math.PI * 2;
    const angle = baseAngle + (random() - 0.5) * 0.055;
    const radius = 2.02 + 0.14 * Math.sin(3 * angle + 0.4) + 0.07 * Math.sin(5 * angle - 0.8) + (random() - 0.5) * 0.16;
    points.push({ x: Math.cos(angle) * radius * 1.04, y: Math.sin(angle) * radius * 0.9, group: 'outer' });
  }
  points.push(
    { x: 0, y: 1.25, group: 'noise' },
    { x: 1.25, y: 0, group: 'noise' },
    { x: 0, y: -1.25, group: 'noise' },
    { x: -1.25, y: 0, group: 'noise' }
  );
  progressInput.max = String(points.length + 1);

  function regionQuery(index) {
    const point = points[index];
    return points.reduce((nearby, candidate, candidateIndex) => {
      const dx = point.x - candidate.x;
      const dy = point.y - candidate.y;
      if (dx * dx + dy * dy <= epsilon * epsilon) nearby.push(candidateIndex);
      return nearby;
    }, []);
  }

  function clusterWithDbscan() {
    const labels = Array(points.length).fill(-2); // -2: unvisited, -1: noise
    const visited = Array(points.length).fill(false);
    const corePoints = Array(points.length).fill(false);
    const clusterOrders = new Map();
    let clusterId = 0;

    for (let index = 0; index < points.length; index += 1) {
      if (visited[index]) continue;
      visited[index] = true;
      const neighbours = regionQuery(index);
      if (neighbours.length < minPoints) {
        labels[index] = -1;
        continue;
      }

      labels[index] = clusterId;
      corePoints[index] = true;
      const order = [index];
      clusterOrders.set(clusterId, order);
      const queue = [...neighbours];
      const queued = new Set(queue);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const candidateIndex = queue[cursor];
        if (!visited[candidateIndex]) {
          visited[candidateIndex] = true;
          const candidateNeighbours = regionQuery(candidateIndex);
          if (candidateNeighbours.length >= minPoints) {
            corePoints[candidateIndex] = true;
            candidateNeighbours.forEach((neighbour) => {
              if (!queued.has(neighbour)) {
                queued.add(neighbour);
                queue.push(neighbour);
              }
            });
          }
        }
        if (labels[candidateIndex] === -2 || labels[candidateIndex] === -1) {
          labels[candidateIndex] = clusterId;
          order.push(candidateIndex);
        }
      }
      clusterId += 1;
    }
    return { labels, corePoints, clusterOrders };
  }

  const { labels, corePoints, clusterOrders } = clusterWithDbscan();
  const innerClusterId = [...clusterOrders.keys()].sort((a, b) => a - b)[0];
  const outerClusterId = [...clusterOrders.keys()].find((id) => id !== innerClusterId);
  const innerIndices = clusterOrders.get(innerClusterId) || [];
  const outerIndices = clusterOrders.get(outerClusterId) || [];
  const noiseIndices = labels.flatMap((label, index) => label === -1 ? [index] : []);
  const totalSteps = innerIndices.length + outerIndices.length + noiseIndices.length;
  progressInput.max = String(totalSteps + 1);

  function currentStage(value) {
    const assigned = Math.max(0, Math.min(totalSteps, value - 1));
    if (value === 0) return ['Raw points', 'Start with the unlabelled data. Move the slider one step to begin DBSCAN.'];
    if (value === 1) return ['Check ε neighbours', 'The dashed circles show ε around the first points DBSCAN checks. Nearby points are counted to see whether each point is core.'];
    if (assigned <= innerIndices.length) {
      return [`Grow the inner cluster · ${assigned}/${innerIndices.length}`, 'DBSCAN adds one density-connected point at each step. The outlined point is next; coloured points have already joined the cluster.'];
    }
    if (assigned <= innerIndices.length + outerIndices.length) {
      const outerAssigned = assigned - innerIndices.length;
      return [`Grow the outer cluster · ${outerAssigned}/${outerIndices.length}`, 'The search continues through neighbours in the outer band. Each point joins only when DBSCAN reaches it.'];
    }
    const noiseAssigned = assigned - innerIndices.length - outerIndices.length;
    return [`Mark noise · ${noiseAssigned}/${noiseIndices.length}`, 'Points that cannot be reached from a dense region are left outside the two clusters and marked as noise.'];
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
    const padding = { left: 30, right: 18, top: 18, bottom: 28 };
    const side = Math.min(width - padding.left - padding.right, height - padding.top - padding.bottom);
    const left = padding.left + (width - padding.left - padding.right - side) / 2;
    const top = padding.top + (height - padding.top - padding.bottom - side) / 2;
    const mapX = (x) => left + ((x + 3) / 6) * side;
    const mapY = (y) => top + ((3 - y) / 6) * side;
    const scale = side / 6;
    const value = Number(progressInput.value);
    const revealedCount = Math.max(0, Math.min(totalSteps, value - 1));
    const innerVisibleCount = Math.min(innerIndices.length, revealedCount);
    const outerVisibleCount = Math.min(outerIndices.length, Math.max(0, revealedCount - innerIndices.length));
    const noiseVisibleCount = Math.min(noiseIndices.length, Math.max(0, revealedCount - innerIndices.length - outerIndices.length));
    const visiblePoints = new Set([
      ...innerIndices.slice(0, innerVisibleCount),
      ...outerIndices.slice(0, outerVisibleCount),
      ...noiseIndices.slice(0, noiseVisibleCount)
    ]);
    const expansionOrder = [...innerIndices, ...outerIndices, ...noiseIndices];
    const activeIndex = value >= 2 && revealedCount < totalSteps ? expansionOrder[revealedCount] : null;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#FFFFFF';
    context.fillRect(left, top, side, side);

    context.lineWidth = 1;
    context.strokeStyle = '#E7C7C1';
    context.fillStyle = '#64504C';
    context.font = '11px Ubuntu, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (let tick = -2; tick <= 2; tick += 1) {
      const x = mapX(tick);
      const y = mapY(tick);
      context.beginPath(); context.moveTo(x, top); context.lineTo(x, top + side); context.stroke();
      context.beginPath(); context.moveTo(left, y); context.lineTo(left + side, y); context.stroke();
      context.fillText(String(tick), x, top + side + 7);
    }
    context.beginPath();
    context.strokeStyle = '#C9B9B4';
    context.moveTo(mapX(0), top); context.lineTo(mapX(0), top + side);
    context.moveTo(left, mapY(0)); context.lineTo(left + side, mapY(0));
    context.stroke();

    if (value === 1) {
      const seedIndices = [innerIndices[0], outerIndices[0]];
      seedIndices.forEach((index) => {
        if (index === undefined) return;
        const seed = points[index];
        context.beginPath();
        context.arc(mapX(seed.x), mapY(seed.y), epsilon * scale, 0, Math.PI * 2);
        context.fillStyle = 'rgba(66, 133, 244, 0.10)';
        context.strokeStyle = '#4285F4';
        context.lineWidth = 2;
        context.setLineDash([6, 5]);
        context.fill();
        context.stroke();
        context.setLineDash([]);
      });
    }

    if (activeIndex !== null) {
      const active = points[activeIndex];
      context.beginPath();
      context.arc(mapX(active.x), mapY(active.y), epsilon * scale, 0, Math.PI * 2);
      context.fillStyle = 'rgba(239, 185, 133, 0.14)';
      context.strokeStyle = '#D08A48';
      context.lineWidth = 1.5;
      context.setLineDash([5, 5]);
      context.fill();
      context.stroke();
      context.setLineDash([]);
    }

    points.forEach((point, index) => {
      const label = labels[index];
      let fill = '#D9D2CF';
      let stroke = '#8B817D';
      let radius = 4.2;

      if (visiblePoints.has(index)) {
        if (label === innerClusterId) {
          fill = '#4285F4';
          stroke = '#1F5FC9';
        } else if (label === outerClusterId) {
          fill = '#BC4639';
          stroke = '#8E372D';
        } else {
          fill = '#EFB985';
          stroke = '#5C2018';
        }
        radius = 5.4;
      }

      context.beginPath();
      context.arc(mapX(point.x), mapY(point.y), radius, 0, Math.PI * 2);
      context.fillStyle = fill;
      context.strokeStyle = stroke;
      context.lineWidth = visiblePoints.has(index) ? 2 : 1.4;
      context.fill();
      context.stroke();

      if (index === activeIndex) {
        context.beginPath();
        context.arc(mapX(point.x), mapY(point.y), 8, 0, Math.PI * 2);
        context.strokeStyle = '#5C2018';
        context.lineWidth = 2;
        context.stroke();
      }

      if (label === -1 && visiblePoints.has(index)) {
        const x = mapX(point.x), y = mapY(point.y);
        context.beginPath();
        context.strokeStyle = '#5C2018';
        context.lineWidth = 1.5;
        context.moveTo(x - 2.2, y - 2.2); context.lineTo(x + 2.2, y + 2.2);
        context.moveTo(x + 2.2, y - 2.2); context.lineTo(x - 2.2, y + 2.2);
        context.stroke();
      }
    });
  }

  function update() {
    const value = Number(progressInput.value);
    const revealedCount = Math.max(0, Math.min(totalSteps, value - 1));
    const [stage, text] = currentStage(value);
    stageOutput.textContent = stage;
    progressOutput.value = `${revealedCount}/${totalSteps} points`;
    progressOutput.textContent = `${revealedCount}/${totalSteps} points`;
    const expansionOrder = [...innerIndices, ...outerIndices, ...noiseIndices];
    const activeIndex = value >= 2 && revealedCount < totalSteps ? expansionOrder[revealedCount] : null;
    if (activeIndex !== null && labels[activeIndex] >= 0) {
      const pointKind = corePoints[activeIndex] ? 'core point, which can expand the search' : 'border point, which joins a nearby cluster';
      description.textContent = `${text} The outlined point is a ${pointKind}.`;
    } else {
      description.textContent = text;
    }
    draw();
  }

  progressInput.addEventListener('input', update);
  resetButton.addEventListener('click', () => {
    progressInput.value = '0';
    update();
    progressInput.focus();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(draw).observe(canvas);
  } else {
    window.addEventListener('resize', draw);
  }
  update();
})();
