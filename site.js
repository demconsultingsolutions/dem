(function(){
  // Copy buttons
  document.querySelectorAll('.copy').forEach(function(btn){
    btn.addEventListener('click', function(){
      var el = document.getElementById(btn.dataset.target);
      var text = el.textContent.trim();
      var done = function(){ btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = 'Copy'; }, 1600); };
      var fallback = function(){
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        btn.textContent = 'Selected';
        setTimeout(function(){ btn.textContent = 'Copy'; }, 1600);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
      } catch(e){ fallback(); }
    });
  });

  // Topographic contours (value noise + marching squares)
  var cv = document.querySelector('canvas.topo'); if(!cv) return;
  var ctx = cv.getContext('2d');
  var seed = 7;
  function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var G = 64, grid = [];
  for (var i=0;i<G*G;i++) grid.push(rnd());
  function sm(t){ return t*t*(3-2*t); }
  function vn(x,y){
    var xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
    function g(a,b){ return grid[((a%G+G)%G)+((b%G+G)%G)*G]; }
    var u=sm(xf), v=sm(yf);
    var a=g(xi,yi)+(g(xi+1,yi)-g(xi,yi))*u;
    var b=g(xi,yi+1)+(g(xi+1,yi+1)-g(xi,yi+1))*u;
    return a+(b-a)*v;
  }
  function field(x,y){ return vn(x,y)*0.6 + vn(x*2.1+5,y*2.1+9)*0.28 + vn(x*4.3+11,y*4.3+3)*0.12; }

  function draw(){
    var w = cv.clientWidth, h = cv.clientHeight; if(!w||!h) return;
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    cv.width = w*dpr; cv.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    var cs = getComputedStyle(document.documentElement);
    var line = cs.getPropertyValue('--contour').trim() || 'rgba(30,77,105,.2)';
    var acc = cs.getPropertyValue('--accent').trim() || '#C94A16';
    var step = 12, cols = Math.ceil(w/step)+1, rows = Math.ceil(h/step)+1, sc = 0.0042;
    var vals = new Float32Array(cols*rows);
    for (var y=0;y<rows;y++) for (var x=0;x<cols;x++) vals[x+y*cols] = field(x*step*sc+2, y*step*sc+1);
    var levels = 16;
    for (var L=1; L<levels; L++){
      var t = 0.18 + L*(0.62/levels);
      ctx.beginPath();
      ctx.strokeStyle = (L===11) ? acc : line;
      ctx.lineWidth = (L%4===0) ? 1.4 : 0.8;
      ctx.globalAlpha = (L===11) ? 0.55 : 1;
      for (var y2=0;y2<rows-1;y2++) for (var x2=0;x2<cols-1;x2++){
        var a=vals[x2+y2*cols], b=vals[x2+1+y2*cols], c=vals[x2+1+(y2+1)*cols], d=vals[x2+(y2+1)*cols];
        var idx=(a>t?8:0)|(b>t?4:0)|(c>t?2:0)|(d>t?1:0);
        if(idx===0||idx===15) continue;
        var X=x2*step, Y=y2*step;
        function lp(p,q){ return (t-p)/((q-p)||1e-6); }
        var top=[X+step*lp(a,b),Y], right=[X+step,Y+step*lp(b,c)], bot=[X+step*lp(d,c),Y+step], left=[X,Y+step*lp(a,d)];
        var segs={1:[[left,bot]],2:[[bot,right]],3:[[left,right]],4:[[top,right]],5:[[left,top],[bot,right]],6:[[top,bot]],7:[[left,top]],8:[[left,top]],9:[[top,bot]],10:[[left,bot],[top,right]],11:[[top,right]],12:[[left,right]],13:[[bot,right]],14:[[left,bot]]}[idx];
        for (var s=0;s<segs.length;s++){ ctx.moveTo(segs[s][0][0],segs[s][0][1]); ctx.lineTo(segs[s][1][0],segs[s][1][1]); }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(draw,120); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw); } catch(e){}
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();

(function(){
  // Paste your Web3Forms access key here (from web3forms.com, sent to your email).
  var ACCESS_KEY = "d6127f9f-7fec-4ba0-91c2-d3a1abafaac2";

  var f = document.getElementById('consult-form'); if(!f) return;
  var note = document.getElementById('form-note');
  var btn = f.querySelector('button[type="submit"]');
  var v = function(id){ return document.getElementById(id).value.trim(); };
  var to = function(){ return document.getElementById('email').textContent.trim(); };

  function valid(){
    var ok = true;
    ['f-name','f-email','f-msg'].forEach(function(id){
      var el = document.getElementById(id);
      var bad = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) ok = false;
    });
    return ok;
  }
  function mailtoFallback(subject, body){
    window.location.href = 'mailto:' + to() + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  f.addEventListener('submit', function(ev){
    ev.preventDefault();
    if (document.getElementById('f-bot').checked) return;
    if (!valid()){ note.textContent = 'Please add your name, a valid email address, and a short description of what you are working on.'; return; }
    var org = v('f-org');
    var subject = 'Consultation request' + (org ? ': ' + org : '');
    var body = 'Name: ' + v('f-name') + '\nOrganization: ' + (org || '-') + '\nEmail: ' + v('f-email') + '\nPhone: ' + (v('f-phone') || '-') + '\nArea of interest: ' + v('f-area') + '\n\n' + v('f-msg');

    if (!ACCESS_KEY || ACCESS_KEY.indexOf('YOUR_') === 0){ mailtoFallback(subject, body); note.textContent = 'Your email app should open with the request filled in. If it does not, email ' + to() + ' directly.'; return; }

    btn.disabled = true; btn.textContent = 'Sending...'; note.textContent = '';
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: subject,
        from_name: 'DEM Consulting website',
        name: v('f-name'), email: v('f-email'), replyto: v('f-email'),
        organization: org || '-', phone: v('f-phone') || '-',
        area_of_interest: v('f-area'), message: v('f-msg')
      })
    }).then(function(r){ return r.json(); }).then(function(res){
      if (res && res.success){
        f.innerHTML = '<p class="eyebrow">Request received</p><h3 class="sent-title">Thank you, ' + v.call(null,'f-name').replace(/[<>&"]/g,'') + '.</h3><p class="form-note">We will reply within two business days. For anything urgent, call 647-402-9428.</p>';
      } else { throw new Error(res && res.message); }
    }).catch(function(){
      btn.disabled = false; btn.textContent = 'Send request';
      note.textContent = 'Your request could not be sent. Please try again, or email ' + to() + ' directly.';
    });
  });
})();

(function(){
  // Mobile menu
  var mb = document.getElementById('menu-btn'), nav = document.getElementById('site-nav');
  if (mb && nav) mb.addEventListener('click', function(){
    var open = nav.classList.toggle('open');
    mb.setAttribute('aria-expanded', String(open));
    mb.textContent = open ? 'Close' : 'Menu';
  });

  // Experience filters
  var fs = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  if (!fs.length) return;
  var cases = document.querySelectorAll('#case-list .case');
  var count = document.getElementById('filter-count');
  function apply(k){
    var n = 0;
    Array.prototype.forEach.call(cases, function(c){ var show = k === 'all' || c.getAttribute('data-area') === k; c.hidden = !show; if (show) n++; });
    fs.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === k)); });
    if (count) count.textContent = n + (n === 1 ? ' project' : ' projects');
  }
  fs.forEach(function(b){ b.addEventListener('click', function(){ apply(b.getAttribute('data-filter')); }); });
  var h = (location.hash || '').slice(1);
  apply(fs.some(function(b){ return b.getAttribute('data-filter') === h; }) ? h : 'all');
})();
