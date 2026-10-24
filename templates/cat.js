// Котик: гуляет и прыгает по низу экрана, иногда уходит и выглядывает из-за
// заголовков, карточек и папок. Его можно гладить мышкой, хватать
// и подкидывать (сильно — ударится и обидится), а кнопкой «Покормить» —
// дать рыбку: котик открывает рот, рыбка падает сверху, он чавкает.
(function () {
  var KEY = 'qa-notes:cat';
  // что котик говорит, когда его обижают: трясут, швыряют в стену, роняют на пол
  var LINES = {
    shake: ['Хорош трясти, я не шейкер!', 'Ты чё, меня взбалтываешь, пёс?!',
            'Нагрузочное тестирование, да?!', 'Ща стошню тебе в клавиатуру!'],
    wall: ['Ты чё, берега попутал?!', 'Ты на кого руку поднял, пёс?!',
           'Баг-репорт на тебя. Blocker.', 'Я запомнил твой IP, кожаный.'],
    floor: ['Слышь, ты чё, бессмертный?!', 'Девять жизней — не безлимит, пёс!',
            'Краш-тест пройден. А ты — нет.', 'Ты чё творишь, чепушила?!']
  };
  var root = document.documentElement;

  var PAL = {
    k: '#4a2a1c', w: '#fdf8f1', o: '#f0a04b', d: '#b8612a', p: '#f6a5b4', e: '#2a1810', m: '#4a2a1c', n: '#c0566b',
    r: '#7d1426', t: '#e0534a', b: '#6f9cc4', l: '#cfe3f2', y: '#ffd75e', h: '#ff6b8a'
  };

  var ART = {
    // сидит анфас; e — глаза, m — рот
    sit: [
      '..k..........k.......',
      '.kgk........kgk......',
      '.kggkkkkkkkkggk......',
      'kgggggddddgggggk.....',
      'kggggggddggggggk.....',
      'kggggggggggggggk.....',
      'kggeeggggggeeggk.....',
      'kgppggmggmggppgk.....',
      'kggggggmmggggggk.....',
      'kggggggggggggggk.....',
      'kdggggggggggggdk.....',
      'kddggggggggggddk.....',
      'kdggggggggggggdk...k.',
      'kddggggggggggddk..kgk',
      'kggggggggggggggk..kdk',
      'kgggkggggggkggggkkkgk',
      'kgggkggggggkgggggdggk',
      'kkkkkkkkkkkkkkkkkkkk.'
    ],
    // сбоку: стоит / шаг
    walkA: [
      '............k.........k..',
      '...........kpk.......kpk.',
      '...........kook.....kook.',
      '..........kooookkkkkooook',
      '..........kooooodddoooook',
      '.kk.......koooooodooooook',
      'kwwk......kooeoooooooeook',
      'kodk......kooeowwwwwoeook',
      '.kookkkkkkkdopwwwnwwwpodk',
      '..koodoodokowwwwwwwwwwwok',
      '..kooooooo.kkkkkkkkkkkkk.',
      '..kooodooowwwwwwwwwk.....',
      '..kooooowwwwwwwwwwwk.....',
      '..koowwwwwwwwwwwwwwk.....',
      '...kookookkkkwwkwwk......',
      '...kookook..kwwkwwk......',
      '...kwwkwwk..kwwkwwk......',
      '...kkkkkkk..kkkkkkk......'
    ],
    walkB: [
      '............k.........k..',
      '...........kpk.......kpk.',
      '...........kook.....kook.',
      '..........kooookkkkkooook',
      '..........kooooodddoooook',
      '.kk.......koooooodooooook',
      'kwwk......kooeoooooooeook',
      'kodk......kooeowwwwwoeook',
      '.kookkkkkkkdopwwwnwwwpodk',
      '..koodoodokowwwwwwwwwwwok',
      '..kooooooo.kkkkkkkkkkkkk.',
      '..kooodooowwwwwwwwwk.....',
      '..kooooowwwwwwwwwwwk.....',
      '..koowwwwwwwwwwwwwwk.....',
      '...kookookkkkwwkwwk......',
      '...kookook..kwwkwwk......',
      '...kwwkkkk..kkkkwwk......',
      '...kkkk........kkkk......'
    ],
    walkC: [
      '............k.........k..',
      '...........kpk.......kpk.',
      '...........kook.....kook.',
      '..........kooookkkkkooook',
      '..........kooooodddoooook',
      '.kk.......koooooodooooook',
      'kwwk......kooeoooooooeook',
      'kodk......kooeowwwwwoeook',
      '.kookkkkkkkdopwwwnwwwpodk',
      '..koodoodokowwwwwwwwwwwok',
      '..kooooooo.kkkkkkkkkkkkk.',
      '..kooodooowwwwwwwwwk.....',
      '..kooooowwwwwwwwwwwk.....',
      '..koowwwwwwwwwwwwwwk.....',
      '...kookookkkkwwkwwk......',
      '...kookook..kwwkwwk......',
      '...kkkkwwk..kwwkkkk......',
      '......kkkk..kkkk.........'
    ],
    // присел перед прыжком и после
    crouch: [
      '............k.........k..',
      '...........kpk.......kpk.',
      '...........kook.....kook.',
      '..........kooookkkkkooook',
      '..........kooooodddoooook',
      '.kk.......koooooodooooook',
      'kwwk......kooeoooooooeook',
      'kodk......kooeowwwwwoeook',
      '.kookkkkkkkdopwwwnwwwpodk',
      '..koodoodokowwwwwwwwwwwok',
      '..kooooooo.kkkkkkkkkkkkk.',
      '..kooodooowwwwwwwwwk.....',
      '..kooooowwwwwwwwwwwk.....',
      '..koowwwwwwwwwwwwwwk.....',
      '...kwwkwwkkkkwwkwwk......',
      '...kkkkkkk..kkkkkkk......'
    ],
    // спит
    lie: [
      '.........................',
      '.........................',
      '.........................',
      '............k.........k..',
      '...........kpk.......kpk.',
      '...........kook.....kook.',
      '..........kooookkkkkooook',
      '....kkkkkkkooooodddoooook',
      '...kodoodokoooooodooooook',
      '..koooooookoooooooooooook',
      'kkkoodooookoddowwwwwoddok',
      'kwkoooowwwkdopwwwnwwwpodk',
      'kokwwwwwwwkowwwwwwwwwwwok',
      'kkkkkkkkkkkkkkkkkkkkkkkk.'
    ],
    // прыжок: взлёт
    leap: [
      '.............k.........k..',
      '............kpk.......kpk.',
      '............kook.....kook.',
      '...........kooookkkkkooook',
      '...........kooooodddoooook',
      '...........koooooodooooook',
      '...........kooeoooooooeook',
      '...........kooeowwwwwoeook',
      '.........kkkdopwwwnwwwpodk',
      '.......koookowwwwwwwwwwwok',
      '......kodoookkkkkkkkkkkkk.',
      '.....kooodowwwk...........',
      '.kkkkodoowwwwwwk..........',
      'kwooooodwwwwkwwk..........',
      '.kkkkoowwwwkkwwk..........',
      '....kowwwwk.kkkk..........',
      '.....kwwwk................',
      '....kwwk..................',
      '...kwwk...................',
      '..kwwk....................',
      '..kkk.....................'
    ],
    // прыжок: полёт вниз
    soar: [
      '............k.........k...',
      '...........kpk.......kpk..',
      '...........kook.....kook..',
      '..........kooookkkkkooook.',
      '..........kooooodddoooook.',
      '.kk.......koooooodooooook.',
      'kwwk......kooeoooooooeook.',
      'kodk......kooeowwwwwoeook.',
      '.kookkkkkkkdopwwwnwwwpodk.',
      '..koodoodokowwwwwwwwwwwok.',
      '..kooooooo.kkkkkkkkkkkkk..',
      '..kooodooowwwwwwwwwk......',
      '..kooooowwwwwwwwwwwk......',
      '..koowwwwwwwwwwwwwwk......',
      '..kwwkkkkkkkkkkkwwk.......',
      '.kwwk...........kwwk......',
      '.kkk.............kkk......'
    ],
    swirl: [
      '.kkkkk.',
      'k.....k',
      'k.kkk.k',
      'k.k.k.k',
      'k.k.kk.',
      'k.k....',
      '.kk....'
    ],
    paw: [
      '.kkk.',
      'kwwwk',
      'kpwpk'
    ],
    fish: [
      '....kkkk.....',
      '..kkbbbbkk.kk',
      '.kbkbbbbbbkbk',
      'kbbbbbbbbbbbk',
      '.kllllllllkbk',
      '..kkllllkk.kk',
      '....kkkk.....'
    ],
    heart: [
      '.hh.hh.',
      'hhhhhhh',
      'hhhhhhh',
      '.hhhhh.',
      '..hhh..',
      '...h...'
    ],
    star: [
      '..y..',
      '..y..',
      'yyyyy',
      '..y..',
      '..y..'
    ]
  };
  // открытый рот (как у «поющего» котика)
  ART.gape = ART.sit.slice(0, 6).concat([
    'kggddggggggddggk.....',
    'kgppgkkkkkkgppgk.....',
    'kgggkrrrrrrkgggk.....',
    'kgggkrttttrkgggk.....',
    'kdgggkkkkkkgggdk.....'
  ], ART.sit.slice(11));
  // рыже-белый окрас для фигуры анфас: рыжая голова и пятна по бокам, белая морда и пузо
  function calico(rows) {
    return rows.map(function (r, y) {
      return r.replace(/[gd]/g, function (c, x) {
        if (x >= 16) return c === 'g' ? 'o' : 'd';            // хвост
        if (y <= 5) return c === 'g' ? 'o' : 'd';             // макушка
        if (y <= 9) return c === 'g' ? (x <= 1 || x >= 14 ? 'o' : 'w') : c;
        return c === 'g' ? 'w' : 'o';                         // пятна на боках
      });
    });
  }
  ART.sit = calico(ART.sit);
  ART.gape = calico(ART.gape);
  // голова для выглядывания
  ART.head = ART.sit.slice(0, 10).map(function (r) { return r.slice(0, 16); });

  // закрытые глаза: глаз-чёрточка становится точкой снизу, глаз-чёрточка лёжа — линией
  function closeEyes(rows) {
    return rows.map(function (r, y) {
      return r.replace(/e/g, function (c, x) { return (rows[y + 1] || '')[x] === 'e' ? 'o' : 'd'; });
    });
  }

  function paint(rows) {
    var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var c = document.createElement('canvas');
    c.width = w; c.height = rows.length;
    var g = c.getContext('2d');
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) {
        if (PAL[r[x]]) { g.fillStyle = PAL[r[x]]; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  }
  function mirror(src) {
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    var g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }
  function both(rows) { var c = paint(rows); return { 1: c, '-1': mirror(c) }; }

  // SPR.walkA.open[1] — смотрит вправо, [-1] — влево
  var SPR = {};
  ['sit', 'walkA', 'walkB', 'walkC', 'crouch', 'lie', 'leap', 'soar', 'head'].forEach(function (n) {
    SPR[n] = { open: both(ART[n]), closed: both(closeEyes(ART[n])) };
  });
  SPR.gape = { open: both(ART.gape), closed: both(ART.gape) };
  var FISH = paint(ART.fish), PAW = paint(ART.paw);
  var HEART = paint(ART.heart), STAR = paint(ART.star), SWIRL = both(ART.swirl);
  var WALK = ['walkA', 'walkB', 'walkA', 'walkC'];

  // ── холст и зона для мыши ─────────────────────────────

  var layer = document.createElement('canvas');
  layer.className = 'cat-layer';
  var ctx = layer.getContext('2d');
  var hit = document.createElement('div');
  hit.className = 'cat-hit';
  hit.title = 'Погладь или подкинь';
  document.body.appendChild(layer);
  document.body.appendChild(hit);

  var W, H, SC, G = 1800, JG = 2200;
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    SC = W < 760 ? 2 : 3;
    layer.width = W * dpr; layer.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  window.addEventListener('resize', resize);

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function halfW() { return ART.walkA[0].length * SC / 2; }

  var cat = {
    mode: 'enter', x: 0, dir: 1, timer: 0, frame: 0, ft: 0,
    cx: 0, cy: 0, vx: 0, vy: 0, ang: 0, spin: 0, bonked: false,
    pet: 0, petAcc: 0, blink: 3, purr: 0, peek: null, hungry: false,
    bubble: null, jump: null
  };
  var fish = null, parts = [];
  var pointer = { x: 0, y: 0, samples: [], vx: 0, vy: 0 };

  function puff(type, x, y, extra) {
    var p = { type: type, x: x, y: y, vx: rnd(-20, 20), vy: rnd(-60, -35), life: 0, max: 1.4 };
    for (var k in extra) p[k] = extra[k];
    parts.push(p);
  }
  function say(text) {
    var p = pose();
    if (p) puff('text', p.x, p.top - 10, { text: text, vx: 0, vy: -25, max: 1.6 });
  }
  // облачко над котиком, едет вместе с ним
  // пока ругается — не перебивает сам себя, а фразы не повторяются подряд
  var lastLine = '';
  function grumble(kind) {
    if (cat.bubble) { cat.bubble.life = Math.max(cat.bubble.life, 1.6); return; }
    var list = LINES[kind], text;
    do text = list[Math.floor(Math.random() * list.length)]; while (text === lastLine);
    lastLine = text;
    cat.bubble = { text: text, life: 2.6, max: 2.6 };
  }
  function setMode(mode, timer) { cat.mode = mode; cat.timer = timer || 0; }

  function enter() {
    cat.dir = Math.random() < .5 ? 1 : -1;
    cat.x = cat.dir > 0 ? -halfW() : W + halfW();
    setMode('enter', rnd(1.5, 4));
  }
  // прыжок: то рядом, то далеко
  function startJump() {
    var hw = halfW(), d = Math.random() < .5 ? rnd(50, 140) : rnd(180, 400);
    if (cat.x + cat.dir * d < hw || cat.x + cat.dir * d > W - hw) cat.dir = -cat.dir;
    d = Math.max(20, Math.min(d, cat.dir > 0 ? W - hw - cat.x : cat.x - hw));
    var T = .3 + d / 900;
    cat.jump = { phase: 'crouch', t: .22, vx: cat.dir * d / T, vy: -JG * T / 2, y: 0 };
    setMode('jump');
  }
  function nextOnFloor() {
    var r = Math.random();
    if (r < .15) { cat.dir = Math.random() < .5 ? 1 : -1; startJump(); }
    else if (r < .45) { cat.dir = Math.random() < .5 ? 1 : -1; setMode('walk', rnd(2, 6)); }
    else if (r < .65) setMode('sit', rnd(3, 6));
    else if (r < .78) setMode('sleep', rnd(8, 14));
    else if (r < .85) { setMode('beg', 2.4); say('мяу?'); }
    else { cat.dir = cat.x < W / 2 ? -1 : 1; setMode('leave'); }
  }

  // ── выглядывание из-за строк, карточек, папок ─────────

  var PEEK = '.sec-h, .card, .hr, .ws > .grp-h, .meta, .crumbs, .row, .sb-head, .legend';
  var LINE_BOTTOM = '.sec-h, .meta, .crumbs, .sb-head';
  function peekLine(el) {
    var r = el.getBoundingClientRect();
    return { r: r, y: el.matches(LINE_BOTTOM) ? r.bottom : r.top };
  }
  function startPeek() {
    var hw = ART.head[0].length * SC / 2 + 8;
    var spots = Array.prototype.filter.call(document.querySelectorAll(PEEK), function (el) {
      var l = peekLine(el);
      return l.r.width > hw * 2 + 16 && l.r.left >= 0 && l.r.right <= W && l.y > 11 * SC && l.y < H - 8;
    });
    if (!spots.length) return enter();
    var el = spots[Math.floor(Math.random() * spots.length)], l = peekLine(el);
    cat.peek = { el: el, dx: rnd(hw, l.r.width - hw), vis: 0, phase: 'up' };
    cat.dir = Math.random() < .5 ? 1 : -1;
    setMode('peek', rnd(2.5, 5));
  }

  // ── броски ───────────────────────────────────────────

  function startFall(vx, vy, spin) {
    cat.vx = vx; cat.vy = vy; cat.spin = spin || 0; cat.bonked = false;
    setMode('fly');
  }
  function land(impact) {
    cat.x = clamp(cat.cx, halfW(), W - halfW());
    cat.ang = 0;
    if (cat.bonked || impact > 1500) { cat.bonked = false; setMode('dizzy', 3); grumble('floor'); }
    else setMode('sit', impact > 900 ? 1.5 : .6);
  }
  function bonk(x, y) {
    cat.bonked = true;
    grumble('wall');
    puff('text', x, y, { text: 'БАМ!', vx: 0, vy: -40, max: 1 });
    for (var i = 0; i < 6; i++) puff('star', x, y, { vx: rnd(-160, 160), vy: rnd(-160, 160), max: .7 });
  }

  // ── кормление ────────────────────────────────────────

  function feed() {
    if (fish) return;
    if (cat.mode === 'held' || cat.mode === 'fly') { cat.hungry = true; return; }
    if (['hidden', 'peek', 'leave', 'enter'].indexOf(cat.mode) >= 0) {
      cat.peek = null;
      cat.x = cat.x > 0 && cat.x < W ? clamp(cat.x, W * .3, W * .8) : W * .6;
    }
    cat.hungry = false;
    setMode('gape', .5);
    say('мяу!');
  }
  function mouth() {
    var img = SPR.gape.open[cat.dir];
    var cy = H - img.height * SC / 2;
    var col = cat.dir > 0 ? 8 : img.width - 8;
    return { x: cat.x + (col - img.width / 2) * SC, y: cy + (8.5 - img.height / 2) * SC };
  }

  // ── поза: какой спрайт и где ─────────────────────────

  function pose() {
    var closed = cat.blink < .15, set = 'sit', bob = 0;
    switch (cat.mode) {
      case 'hidden': return null;
      case 'peek': {
        var l = peekLine(cat.peek.el), img = SPR.head[cat.pet > 0 || closed ? 'closed' : 'open'][cat.dir];
        var top = l.y - cat.peek.vis * 9 * SC;
        return { img: img, peek: true, line: l.y, x: l.r.left + cat.peek.dx, y: top + img.height * SC / 2, ang: 0, top: top };
      }
      case 'held': case 'fly': {
        var him = SPR.sit[cat.bonked || shaking(performance.now()) >= 2 ? 'closed' : 'open'][cat.dir];
        return { img: him, x: cat.cx, y: cat.cy, ang: cat.ang, top: cat.cy - him.height * SC / 2 };
      }
      case 'jump': {
        var j = cat.jump;
        var jim = SPR[j.phase !== 'air' ? 'crouch' : j.vy < 0 ? 'leap' : 'soar'].open[cat.dir];
        var jy = H - jim.height * SC / 2 + j.y;
        return { img: jim, x: cat.x, y: jy, ang: 0, top: jy - jim.height * SC / 2 };
      }
      case 'walk': case 'leave': case 'enter': case 'chase': set = WALK[cat.frame]; break;
      case 'sleep': set = 'lie'; closed = true; break;
      case 'dizzy': closed = true; break;
      case 'pet': closed = true; break;
      case 'gape': set = 'gape'; break;
      case 'beg': set = cat.frame % 2 ? 'gape' : 'sit'; break;
      case 'chew': set = cat.frame % 2 ? 'gape' : 'sit'; closed = true; bob = cat.frame % 2 ? 0 : SC; break;
    }
    var im = SPR[set][closed ? 'closed' : 'open'][cat.dir];
    return { img: im, x: cat.x, y: H - im.height * SC / 2 + bob, ang: 0, top: H - im.height * SC };
  }

  // ── обновление ────────────────────────────────────────

  function updateCat(dt) {
    cat.ft += dt;
    var tick = cat.mode === 'chew' ? .14 : cat.mode === 'beg' ? .3 : cat.mode === 'chase' ? .09 : .15;
    if (cat.ft > tick) { cat.ft = 0; cat.frame = (cat.frame + 1) % 4; }
    cat.blink -= dt;
    if (cat.blink < 0) cat.blink = rnd(2, 5);
    cat.petAcc = Math.max(0, cat.petAcc - 120 * dt);
    cat.pet -= dt;
    cat.timer -= dt;
    if (cat.bubble && (cat.bubble.life -= dt) <= 0) cat.bubble = null;
    var hw = halfW();

    switch (cat.mode) {
      case 'walk':
        cat.x += cat.dir * 60 * dt;
        if (cat.x < hw || cat.x > W - hw) { cat.x = clamp(cat.x, hw, W - hw); cat.dir = -cat.dir; }
        if (cat.timer <= 0) nextOnFloor();
        else if (Math.random() < dt / 2.5) startJump();
        if (Math.random() < dt / 40) say('мяу');
        break;
      case 'jump': {
        var j = cat.jump;
        j.t -= dt;
        if (j.phase === 'crouch') { if (j.t <= 0) j.phase = 'air'; }
        else if (j.phase === 'air') {
          cat.x += j.vx * dt; j.vy += JG * dt; j.y += j.vy * dt;
          if (j.y >= 0 && j.vy > 0) { j.y = 0; j.phase = 'land'; j.t = .15; }
        } else if (j.t <= 0) {
          if (Math.random() < .35) startJump(); else setMode('walk', rnd(1, 4));
        }
        break;
      }
      case 'leave':
        cat.x += cat.dir * 75 * dt;
        if (cat.x < -hw || cat.x > W + hw) setMode('hidden', rnd(2, 6));
        break;
      case 'enter':
        cat.x += cat.dir * 75 * dt;
        if (cat.timer <= 0 && cat.x > hw && cat.x < W - hw) nextOnFloor();
        break;
      case 'hidden':
        if (cat.timer <= 0) { if (Math.random() < .75) startPeek(); else enter(); }
        break;
      case 'peek': {
        var pk = cat.peek, l = peekLine(pk.el);
        if (l.y < 11 * SC || l.y > H || !l.r.width) pk.phase = 'down';
        if (pk.phase === 'up') { pk.vis = Math.min(1, pk.vis + dt / .45); if (pk.vis === 1) pk.phase = 'stay'; }
        else if (pk.phase === 'stay') {
          if (cat.pet > 0) cat.timer = Math.max(cat.timer, 1.5);
          if (Math.random() < dt / 3) cat.dir = -cat.dir;  // огляделся
          if (Math.random() < dt / 8) say('мяу');
          if (cat.timer <= 0) pk.phase = 'down';
        } else {
          pk.vis = Math.max(0, pk.vis - dt / .35);
          if (pk.vis === 0) { cat.peek = null; setMode('hidden', rnd(2, 6)); }
        }
        break;
      }
      case 'sit': case 'sleep': case 'beg':
        if (cat.mode === 'sleep' && Math.random() < dt * 1.2) {
          var zp = pose();
          puff('text', zp.x + cat.dir * 16, zp.top + 6, { text: 'z', vx: 12, vy: -22, max: 1.8 });
        }
        if (cat.timer <= 0) nextOnFloor();
        break;
      case 'pet':
        cat.purr -= dt;
        if (cat.purr <= 0) {
          cat.purr = .45;
          var pc = pose();
          puff('heart', pc.x + rnd(-14, 14), pc.top + 8);
          if (Math.random() < .3) puff('text', pc.x, pc.top - 6, { text: 'мрр', vx: 0, vy: -20, max: 1.5 });
        }
        if (cat.pet <= 0) setMode('sit', 2.5);
        break;
      case 'gape':
        if (cat.timer <= 0 && !fish) {
          fish = { x: mouth().x, y: -30, vy: 0, ang: -Math.PI / 2, ground: false, age: 0 };
        }
        break;
      case 'chew':
        if (Math.random() < dt * 3) { var ec = pose(); puff('heart', ec.x + rnd(-12, 12), ec.top + 6); }
        if (cat.timer <= 0) { setMode('sit', 3); say('мрр'); }
        break;
      case 'dizzy':
        if (cat.timer <= 0) setMode('sit', 1);
        break;
      case 'chase':
        if (!fish || !fish.ground) { setMode('sit', 1); break; }
        cat.dir = fish.x > cat.x ? 1 : -1;
        cat.x += cat.dir * 130 * dt;
        if (Math.abs(fish.x - cat.x) < 20) { fish = null; setMode('chew', 2.4); say('ням'); }
        break;
      case 'held':
        cat.ang += (clamp(-pointer.vx * .0012, -.9, .9) - cat.ang) * Math.min(1, dt * 10);
        cat.cx = pointer.x; cat.cy = pointer.y + 22;
        break;
      case 'fly': {
        var r = 26;
        cat.vy += G * dt;
        cat.cx += cat.vx * dt; cat.cy += cat.vy * dt;
        cat.ang += cat.spin * dt;
        cat.spin *= Math.pow(.6, dt);
        if (Math.abs(cat.spin) < 2) {  // кошки переворачиваются лапами вниз
          cat.ang = Math.atan2(Math.sin(cat.ang), Math.cos(cat.ang));
          cat.ang -= cat.ang * Math.min(1, dt * 4);
        }
        if (cat.cx < r) { cat.cx = r; if (Math.abs(cat.vx) > 700) bonk(0, cat.cy); cat.vx = Math.abs(cat.vx) * .45; }
        if (cat.cx > W - r) { cat.cx = W - r; if (Math.abs(cat.vx) > 700) bonk(W, cat.cy); cat.vx = -Math.abs(cat.vx) * .45; }
        if (cat.cy < r) { cat.cy = r; if (Math.abs(cat.vy) > 700) bonk(cat.cx, 0); cat.vy = Math.abs(cat.vy) * .3; }
        if (cat.cy > H - r) { cat.cy = H - r; land(cat.vy); }
        break;
      }
    }
    if (cat.hungry && ['walk', 'sit', 'sleep', 'beg', 'dizzy', 'pet'].indexOf(cat.mode) >= 0) feed();
  }

  function updateFish(dt) {
    if (!fish) return;
    fish.age += dt;
    if (!fish.ground) {
      fish.vy += G * .5 * dt;
      fish.y += fish.vy * dt;
      if (cat.mode === 'gape') {
        var mo = mouth();
        fish.x += (mo.x - fish.x) * Math.min(1, dt * 8);
        if (fish.y > mo.y - 10) { fish = null; setMode('chew', 2.4); say('ням'); return; }
      }
      if (fish.y > H - FISH.height * SC / 2) { fish.y = H - FISH.height * SC / 2; fish.ang = 0; fish.ground = true; }
    } else {
      if (['walk', 'sit', 'sleep', 'beg'].indexOf(cat.mode) >= 0) setMode('chase');
      if (fish.age > 20) fish = null;
    }
  }

  function updateParts(dt) {
    parts = parts.filter(function (p) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      return p.life < p.max;
    });
  }

  // ── рисование ─────────────────────────────────────────

  function blit(img, x, y, ang, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (ang) ctx.rotate(ang);
    ctx.drawImage(img, -img.width * SC / 2, -img.height * SC / 2, img.width * SC, img.height * SC);
    ctx.restore();
  }
  function box(el, x, y, w, h) {
    el.style.width = w + 'px'; el.style.height = h + 'px';
    el.style.transform = 'translate(' + Math.round(x - w / 2) + 'px,' + Math.round(y - h / 2) + 'px)';
  }

  function drawBubble(p) {
    var b = cat.bubble;
    ctx.font = '600 13px "JetBrains Mono", monospace';
    var tw = ctx.measureText(b.text).width, w = tw + 20, h = 26;
    var lift = cat.mode === 'dizzy' || cat.bonked ? 7 * SC : 0;
    var x = clamp(p.x - w / 2, 6, W - w - 6), y = Math.max(6, p.top - h - 14 - lift);
    var tail = clamp(p.x, x + 12, x + w - 12);
    var pop = Math.min(1, (b.max - b.life) * 8);
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life * 3);
    ctx.translate(tail, y + h); ctx.scale(pop, pop); ctx.translate(-tail, -(y + h));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = PAL.k; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.moveTo(tail - 6, y + h); ctx.lineTo(tail, y + h + 8); ctx.lineTo(tail + 6, y + h);
    ctx.fill(); ctx.stroke();
    ctx.fillRect(tail - 5, y + h - 2, 10, 3);
    ctx.fillStyle = '#c0392b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }

  var ink = '#888', inkCheck = 0;
  function draw() {
    if (--inkCheck < 0) { inkCheck = 60; ink = getComputedStyle(root).getPropertyValue('--head').trim() || ink; }
    ctx.clearRect(0, 0, W, H);

    if (fish) blit(FISH, fish.x, fish.y, fish.ang);

    var p = pose();
    if (!p) box(hit, -100, -100, 0, 0);
    else if (p.peek) {
      // голова видна только над линией, лапки лежат на ней
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, p.line); ctx.clip();
      blit(p.img, p.x, p.y, 0);
      ctx.restore();
      if (cat.peek.vis > .7) {
        blit(PAW, p.x - 4.5 * SC, p.line, 0);
        blit(PAW, p.x + 4.5 * SC, p.line, 0);
      }
      var vh = p.line - p.top;
      box(hit, p.x, p.line - vh / 2 + SC, p.img.width * SC, Math.max(vh, 1) + 2 * SC);
    } else {
      var shake = cat.mode === 'held' && shaking(performance.now()) >= 2 ? rnd(-2, 2) : 0;
      blit(p.img, p.x + shake, p.y, p.ang);
      var big = cat.mode === 'held' || cat.mode === 'fly';
      box(hit, p.x, p.y, big ? 60 : p.img.width * SC, big ? 60 : p.img.height * SC);
    }

    if (cat.mode === 'dizzy' || (cat.mode === 'fly' && cat.bonked)) {
      var t = Date.now() / 300, hx = p.x + (8 - p.img.width / 2) * SC * cat.dir;
      blit(SWIRL[Math.floor(t * 1.5) % 2 ? 1 : -1], hx, p.top - 5 * SC, 0);
      for (var i = 0; i < 3; i++) {
        var a = t + i * Math.PI * 2 / 3;
        blit(STAR, hx + Math.cos(a) * 26, p.top - 4 * SC + Math.sin(a) * 6, 0, .9);
      }
    }

    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    parts.forEach(function (q) {
      var al = 1 - q.life / q.max;
      if (q.type === 'heart') blit(HEART, q.x, q.y, 0, al);
      else if (q.type === 'star') blit(STAR, q.x, q.y, 0, al);
      else { ctx.globalAlpha = al; ctx.fillStyle = ink; ctx.fillText(q.text, q.x, q.y); ctx.globalAlpha = 1; }
    });

    if (cat.bubble && p) drawBubble(p);
  }

  // ── мышь и пальцы ────────────────────────────────────

  // тряска: развороты курсора с размахом от SWING px, отдельно по каждой оси;
  // 3 разворота по одной оси за 0.9 с — котика трясут
  var SWING = 20, axes = {};
  function resetShake(x, y) {
    axes.x = { dir: 0, ext: x, turns: [] };
    axes.y = { dir: 0, ext: y, turns: [] };
  }
  function track(a, v, t) {
    if (a.dir && (v - a.ext) * a.dir >= 0) { a.ext = v; return; }  // тянет в ту же сторону
    if (Math.abs(v - a.ext) < SWING) return;
    if (a.dir) a.turns.push(t);                                      // развернулся
    a.dir = v > a.ext ? 1 : -1; a.ext = v;
  }
  function shaking(now) {
    if (!axes.x) return 0;
    return Math.max.apply(null, [axes.x, axes.y].map(function (a) {
      while (a.turns.length && now - a.turns[0] > 900) a.turns.shift();
      return a.turns.length;
    }));
  }

  hit.addEventListener('pointerdown', function (e) {
    if (e.button || !pose()) return;
    e.preventDefault();
    hit.setPointerCapture(e.pointerId);
    hit.classList.add('held');
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.vx = pointer.vy = 0;
    pointer.samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    if (cat.mode === 'peek' || cat.mode === 'hidden') cat.x = e.clientX;
    cat.peek = null; cat.ang = 0;
    resetShake(e.clientX, e.clientY);
    setMode('held');
    say('мяу!');
  });
  hit.addEventListener('pointermove', function (e) {
    if (hit.hasPointerCapture(e.pointerId)) {
      var sm = pointer.samples, prev = sm[sm.length - 1];
      pointer.x = e.clientX; pointer.y = e.clientY;
      sm.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (sm.length > 2 && e.timeStamp - sm[0].t > 90) sm.shift();
      var dt = Math.max(.008, (e.timeStamp - prev.t) / 1000);
      pointer.vx = (e.clientX - prev.x) / dt; pointer.vy = (e.clientY - prev.y) / dt;
      track(axes.x, e.clientX, e.timeStamp); track(axes.y, e.clientY, e.timeStamp);
      if (shaking(e.timeStamp) >= 3) grumble('shake');
      return;
    }
    // гладить — просто водить мышкой по котику
    if (e.pointerType !== 'mouse' || e.buttons) return;
    if (['walk', 'sit', 'sleep', 'beg', 'pet', 'peek'].indexOf(cat.mode) < 0) return;
    cat.petAcc += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (cat.petAcc > 80) {
      if (cat.mode !== 'pet' && cat.mode !== 'peek') { setMode('pet'); cat.purr = 0; }
      if (cat.mode === 'peek' && cat.pet <= 0) { var pp = pose(); puff('heart', pp.x, pp.top); }
      cat.pet = .9;
    }
  });
  function release(e) {
    if (!hit.hasPointerCapture(e.pointerId)) return;
    hit.classList.remove('held');
    var sm = pointer.samples, a = sm[0], b = sm[sm.length - 1];
    var dt = (b.t - a.t) / 1000, vx = 0, vy = 0;
    if (dt > .01 && e.timeStamp - b.t < 80) { vx = (b.x - a.x) / dt; vy = (b.y - a.y) / dt; }
    var v = Math.hypot(vx, vy), cap = 3000;
    if (v > cap) { vx *= cap / v; vy *= cap / v; }
    startFall(vx, vy, vx * .01);
  }
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', release);

  // ── цикл, кнопки в меню ──────────────────────────────

  var on = true, last = 0, raf = 0;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

  function frame(t) {
    var dt = Math.min(.05, (t - last) / 1000 || 0);
    last = t;
    updateCat(dt); updateFish(dt); updateParts(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function apply() {
    root.classList.toggle('cat-off', !on);
    cancelAnimationFrame(raf);
    if (on) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  document.querySelectorAll('[data-action=cat]').forEach(function (b) {
    b.addEventListener('click', function () {
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
      apply();
    });
  });
  document.querySelectorAll('[data-action=feed]').forEach(function (b) {
    b.addEventListener('click', function () { if (on) feed(); });
  });
  enter();
  apply();
})();
