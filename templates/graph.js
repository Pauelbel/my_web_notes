// Граф заметок: физика (пружины + отталкивание), перетаскивание точек,
// панорама фона, зум колесом/кнопками, клик по точке открывает заметку.
(function () {
  var data = JSON.parse(document.getElementById('graph-data').textContent);
  var svg = document.getElementById('graph');
  var tip = document.getElementById('graph-tip');
  var NS = 'http://www.w3.org/2000/svg';
  var tipDefault = tip.textContent;

  var W = svg.clientWidth, H = svg.clientHeight;
  var view = { x: 0, y: 0, k: 1 };
  var world = document.createElementNS(NS, 'g');
  svg.appendChild(world);

  var byId = {};
  var nodes = data.nodes.map(function (n, i) {
    var a = i / data.nodes.length * Math.PI * 2;
    var r = Math.min(W, H) * .28;
    var node = {
      id: n.id, title: n.title, status: n.status, ws: n.ws, deg: n.deg,
      x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, vx: 0, vy: 0
    };
    byId[n.id] = node;
    return node;
  });
  var links = data.links.map(function (l) { return { a: byId[l[0]], b: byId[l[1]] }; });

  links.forEach(function (l) {
    l.el = document.createElementNS(NS, 'line');
    l.el.setAttribute('class', 'g-link');
    world.appendChild(l.el);
  });

  nodes.forEach(function (n) {
    var r = 6 + Math.min(n.deg, 6) * 1.2;
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'g-node ' + n.status);
    g.innerHTML =
      '<circle class="halo" r="' + (r + 10) + '"></circle>' +
      '<circle class="core" r="' + r + '"></circle>' +
      '<text y="' + (r + 16) + '" text-anchor="middle"></text>';
    g.querySelector('text').textContent = n.title;
    world.appendChild(g);
    n.el = g;
    n.r = r;
  });

  // ── подсветка соседей
  function focus(n) {
    if (!n) {
      svg.classList.remove('focus');
      tip.textContent = tipDefault;
      return;
    }
    var nb = {}; nb[n.id] = true;
    links.forEach(function (l) {
      var on = l.a === n || l.b === n;
      if (on) { nb[l.a.id] = nb[l.b.id] = true; }
      l.el.classList.toggle('nb', on);
    });
    nodes.forEach(function (o) { o.el.classList.toggle('nb', !!nb[o.id]); });
    svg.classList.add('focus');
    tip.textContent = n.ws + ' / ' + n.id + ' · связей: ' + (Object.keys(nb).length - 1);
  }

  // ── координаты
  function toWorld(e) {
    var r = svg.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k };
  }
  function applyView() {
    world.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
  }
  function zoomAt(px, py, factor) {
    var k = Math.max(.4, Math.min(3, view.k * factor));
    view.x = px - (px - view.x) * (k / view.k);
    view.y = py - (py - view.y) * (k / view.k);
    view.k = k;
    applyView();
  }

  // ── перетаскивание точек и фона
  var drag = null, pan = null, heat = 1;

  nodes.forEach(function (n) {
    n.el.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      var p = toWorld(e);
      drag = { n: n, dx: n.x - p.x, dy: n.y - p.y, sx: e.clientX, sy: e.clientY, moved: false };
      svg.setPointerCapture(e.pointerId);
      heat = 1;
      focus(n);
    });
    n.el.addEventListener('pointerenter', function () { if (!drag && !pan) focus(n); });
    n.el.addEventListener('pointerleave', function () { if (!drag && !pan) focus(null); });
  });

  svg.addEventListener('pointerdown', function (e) {
    pan = { x: e.clientX - view.x, y: e.clientY - view.y };
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('panning');
  });

  svg.addEventListener('pointermove', function (e) {
    if (drag) {
      if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
      var p = toWorld(e);
      drag.n.x = p.x + drag.dx;
      drag.n.y = p.y + drag.dy;
      drag.n.vx = drag.n.vy = 0;
      heat = Math.max(heat, .7);
    } else if (pan) {
      view.x = e.clientX - pan.x;
      view.y = e.clientY - pan.y;
      applyView();
    }
  });

  function release() {
    if (drag) {
      var n = drag.n, moved = drag.moved;
      drag = null;
      if (!moved) { location.href = n.id + '.html'; return; }
      focus(null);
    }
    if (pan) { pan = null; svg.classList.remove('panning'); }
  }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = svg.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  document.querySelectorAll('[data-zoom]').forEach(function (b) {
    b.addEventListener('click', function () {
      var z = b.dataset.zoom;
      if (z === 'reset') { view = { x: 0, y: 0, k: 1 }; applyView(); heat = 1; return; }
      zoomAt(W / 2, H / 2, z === 'in' ? 1.25 : 1 / 1.25);
    });
  });

  window.addEventListener('resize', function () {
    W = svg.clientWidth; H = svg.clientHeight; heat = Math.max(heat, .5);
  });

  // ── физика
  function tick() {
    if (heat > .005) {
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d2 = dx * dx + dy * dy + .01, d = Math.sqrt(d2);
          var f = 2600 / d2;
          a.vx -= dx / d * f; a.vy -= dy / d * f;
          b.vx += dx / d * f; b.vy += dy / d * f;
        }
      }
      links.forEach(function (l) {
        var dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var f = (d - 110) * .02;
        l.a.vx += dx / d * f; l.a.vy += dy / d * f;
        l.b.vx -= dx / d * f; l.b.vy -= dy / d * f;
      });
      nodes.forEach(function (n) {
        n.vx += (W / 2 - n.x) * .003;
        n.vy += (H / 2 + 20 - n.y) * .003;
        if (!drag || drag.n !== n) { n.x += n.vx * heat; n.y += n.vy * heat; }
        n.vx *= .6; n.vy *= .6;
      });
      if (!drag) heat *= .985;
    }
    links.forEach(function (l) {
      l.el.setAttribute('x1', l.a.x); l.el.setAttribute('y1', l.a.y);
      l.el.setAttribute('x2', l.b.x); l.el.setAttribute('y2', l.b.y);
    });
    nodes.forEach(function (n) { n.el.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')'); });
    requestAnimationFrame(tick);
  }
  applyView();
  tick();
})();
