(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 深色／淺色切換 ---------- */
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var toggle = document.getElementById('theme-toggle');

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  // <head> 裡的程式已經先設定過一次；這裡保險再確認一次
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (typeof drawNet === 'function') drawNet();
  });

  /* ---------- 捲動淡入 ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 導覽列標示目前區塊 ---------- */
  var navLinks = document.querySelectorAll('.nav nav a');
  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- 研究縮圖：用程式畫的佔位圖 ----------
     放真正的圖片時，把 <div class="thumb" data-art="..."></div>
     換成 <div class="thumb"><img src="圖片.png" alt="說明"></div> 即可。 */
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  var art = {
    // 注意力矩陣風格的熱圖
    heatmap: function (r) {
      var out = '';
      for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 9; x++) {
          var d = Math.abs(x / 8 - y / 5);
          var v = Math.max(0.06, Math.exp(-d * d * 14) * 0.9 + (r() - 0.5) * 0.25);
          var cls = r() > 0.9 ? 'f2' : 'f1';
          out += '<rect class="' + cls + '" x="' + (x * 20 + 1.5) + '" y="' + (y * 20 + 1.5) +
            '" width="17" height="17" rx="3" opacity="' + Math.min(1, v).toFixed(2) + '"/>';
        }
      }
      return out;
    },
    // 訓練曲線
    curves: function (r) {
      function curve(k, floor) {
        var d = '';
        for (var i = 0; i <= 40; i++) {
          var t = i / 40;
          var y = floor + (100 - floor) * Math.exp(-t * k) + (r() - 0.5) * 5;
          d += (i ? 'L' : 'M') + (16 + t * 152).toFixed(1) + ' ' + (108 - y * 0.92).toFixed(1);
        }
        return d;
      }
      var grid = '';
      for (var g = 1; g <= 3; g++) grid += '<path class="s3" d="M16 ' + (g * 27) + 'H168"/>';
      return grid +
        '<path class="s3" stroke-width="1.5" d="M16 10V108H168"/>' +
        '<path class="s2" stroke-width="2" stroke-linejoin="round" d="' + curve(3, 28) + '"/>' +
        '<path class="s1" stroke-width="2" stroke-linejoin="round" d="' + curve(5.5, 12) + '"/>';
    },
    // 嵌入空間的分群散佈圖
    scatter: function (r) {
      var centers = [[50, 42, 'f1'], [122, 48, 'f2'], [88, 86, 'f3']];
      var out = '';
      centers.forEach(function (c) {
        for (var i = 0; i < 22; i++) {
          var a = r() * Math.PI * 2;
          var d = Math.sqrt(r()) * 26;
          out += '<circle class="' + c[2] + '" cx="' + (c[0] + Math.cos(a) * d * 1.2).toFixed(1) +
            '" cy="' + (c[1] + Math.sin(a) * d * 0.85).toFixed(1) + '" r="2.6" opacity="0.75"/>';
        }
      });
      return out;
    },
    // 神經網路的層與連線
    graph: function (r) {
      var layers = [3, 5, 5, 2];
      var pos = layers.map(function (n, li) {
        var arr = [];
        for (var i = 0; i < n; i++) arr.push([30 + li * 40, 60 + (i - (n - 1) / 2) * 21]);
        return arr;
      });
      var lines = '', nodes = '';
      for (var l = 0; l < pos.length - 1; l++) {
        pos[l].forEach(function (a) {
          pos[l + 1].forEach(function (b) {
            var strong = r() > 0.78;
            lines += '<path class="' + (strong ? 's2' : 's1') + '" stroke-width="' + (strong ? 1.6 : 0.8) +
              '" opacity="' + (strong ? 0.9 : 0.3) + '" d="M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1] + '"/>';
          });
        });
      }
      pos.forEach(function (layer) {
        layer.forEach(function (p) { nodes += '<circle class="f1" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; });
      });
      return '<g transform="translate(0 0)">' + lines + nodes + '</g>';
    }
  };

  document.querySelectorAll('.thumb[data-art]').forEach(function (el, i) {
    var draw = art[el.dataset.art];
    if (!draw) return;
    el.innerHTML = '<svg viewBox="0 0 180 120" role="img" aria-label="Illustration">' + draw(rng(7 + i * 131)) + '</svg>';
  });

  /* ---------- 複製按鈕（專案頁的 BibTeX） ---------- */
  document.querySelectorAll('.copy-btn[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.getAttribute('data-copy'));
      if (!target) return;
      var text = target.textContent;
      function done(ok) {
        btn.textContent = ok ? 'Copied' : 'Press Ctrl+C';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
      }
      function selectFallback() {
        var range = document.createRange();
        range.selectNodeContents(target);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        done(ok);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, selectFallback);
      } else {
        selectFallback();
      }
    });
  });

  /* ---------- 開場背景：緩慢漂移的節點網路 ---------- */
  var canvas = document.getElementById('net');
  var ctx = canvas ? canvas.getContext('2d') : null; // 專案頁沒有這個動畫
  var nodes = [];
  var width = 0, height = 0;
  var running = false;
  var LINK = 130;

  function setupNet() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var r = rng(42);
    var count = Math.max(18, Math.min(80, Math.floor(width * height / 12000)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: r() * width,
        y: r() * height,
        vx: (r() - 0.5) * 0.3,
        vy: (r() - 0.5) * 0.3,
        size: 1.5 + r() * 2,
        warm: r() > 0.85
      });
    }
  }

  function drawNet() {
    if (!canvas) return;
    var style = getComputedStyle(root);
    var accent = style.getPropertyValue('--accent').trim();
    var accent2 = style.getPropertyValue('--accent2').trim();
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK) {
          ctx.globalAlpha = (1 - dist / LINK) * 0.4;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 0.9;
    nodes.forEach(function (n) {
      ctx.fillStyle = n.warm ? accent2 : accent;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function tick() {
    if (!running) return;
    nodes.forEach(function (n) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -10) n.x = width + 10; else if (n.x > width + 10) n.x = -10;
      if (n.y < -10) n.y = height + 10; else if (n.y > height + 10) n.y = -10;
    });
    drawNet();
    requestAnimationFrame(tick);
  }

  function start() {
    if (!canvas || running || reduceMotion) return;
    running = true;
    requestAnimationFrame(tick);
  }
  function stop() { running = false; }

  setupNet();
  drawNet();

  // 只有在開場區塊看得到、且分頁在前景時才跑動畫
  if (canvas && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !document.hidden) start(); else stop();
    }).observe(canvas);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (canvas && canvas.getBoundingClientRect().bottom > 0) start();
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { setupNet(); drawNet(); }, 150);
  });

  // 系統主題改變時：如果使用者沒有手動選過，就跟著系統走
  function onSystemThemeChange(e) {
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (err) {}
    if (stored !== 'dark' && stored !== 'light') setTheme(e.matches ? 'dark' : 'light');
    drawNet();
  }
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSystemThemeChange);
  else if (darkQuery.addListener) darkQuery.addListener(onSystemThemeChange);
})();
