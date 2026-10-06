/* Juliana Leanza | Nutricionista — comportamento do site */
(function () {
  'use strict';

  var CONFIG = {
    whatsapp: '5521997998736',
    // PENDENTE: preencher com o ID do GA4 (ex.: G-XXXXXXXXXX). Vazio = nada é carregado.
    gaId: ''
  };

  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} },
    lget: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    lset: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Eventos de conversão */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    var payload = params || {};
    payload.event = name;
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); }
  }
  window.jlTrack = track;

  /* Origem da visita (UTM) preservada durante a sessão */
  function captureSource() {
    try {
      var p = new URLSearchParams(window.location.search);
      var src = p.get('utm_source');
      if (src) {
        var label = [src, p.get('utm_medium'), p.get('utm_campaign')].filter(Boolean).join(' / ');
        store.set('jl_source', label.slice(0, 120));
      }
    } catch (e) {}
    return store.get('jl_source') || '';
  }
  var source = captureSource();

  function waUrl(message) {
    var text = message;
    if (source) { text += '\n(Origem: ' + source + ')'; }
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
  }

  /* Links de WhatsApp */
  var defaultMsg = 'Olá, Juliana! Vim pelo site e quero agendar uma consulta.';
  Array.prototype.forEach.call(document.querySelectorAll('[data-wa]'), function (a) {
    a.href = waUrl(a.getAttribute('data-wa-msg') || defaultMsg);
    a.target = '_blank';
    a.rel = 'noopener';
    a.addEventListener('click', function () {
      track('whatsapp_click', { location: a.getAttribute('data-wa') || 'link' });
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-track]'), function (a) {
    a.addEventListener('click', function () { track(a.getAttribute('data-track'), {}); });
  });

  /* Header e menu */
  var header = document.querySelector('.site-header');
  var sticky = document.querySelector('.sticky-cta');
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) { header.classList.toggle('is-solid', y > 40); }
    if (sticky) { sticky.classList.toggle('is-on', y > window.innerHeight * 0.6); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  /* o CTA fixo sai de cena quando o formulário de contato está na tela */
  var contato = document.getElementById('contato');
  if (sticky && contato && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sticky.style.display = entries[0].isIntersecting ? 'none' : '';
    }, { threshold: 0.15 }).observe(contato);
  }

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('menu');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (header) { header.classList.toggle('is-solid', open || window.scrollY > 40); }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
      }
    });
  }

  /* Vídeo da primeira dobra: só aparece quando realmente carrega */
  var media = document.querySelector('.hero-media');
  if (media) {
    var video = media.querySelector('video');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (video && !reduce) {
      video.addEventListener('playing', function () { media.classList.add('has-video'); });
      var src = video.getAttribute('data-src');
      if (src) {
        video.src = src;
        var p = video.play();
        if (p && p.catch) { p.catch(function () {}); }
      }
    }
  }

  /* Formulário: valida e abre o WhatsApp com a mensagem pronta */
  var form = document.getElementById('form-contato');
  if (form) {
    var status = form.querySelector('.form-status');
    var rules = {
      nome: function (v) { return v.trim().length >= 2 ? '' : 'Digite seu nome.'; },
      objetivo: function (v) { return v ? '' : 'Escolha um objetivo.'; },
      formato: function (v) { return v ? '' : 'Escolha presencial ou online.'; }
    };
    function check(name) {
      var el = form.elements[name];
      var msg = rules[name](el.value);
      var field = el.closest('.field');
      field.classList.toggle('invalid', !!msg);
      field.querySelector('.err').textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    Object.keys(rules).forEach(function (name) {
      form.elements[name].addEventListener('blur', function () { check(name); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.site.value) { return; } /* campo-isca anti-spam */
      var ok = Object.keys(rules).map(check).every(Boolean);
      if (!ok) {
        status.textContent = 'Revise os campos marcados antes de enviar.';
        var first = form.querySelector('.invalid input, .invalid select');
        if (first) { first.focus(); }
        return;
      }
      var lines = [
        'Olá, Juliana! Vim pelo site e quero agendar uma consulta.',
        'Nome: ' + form.elements.nome.value.trim(),
        'Objetivo: ' + form.elements.objetivo.value,
        'Atendimento: ' + form.elements.formato.value
      ];
      var extra = form.elements.mensagem.value.trim();
      if (extra) { lines.push('Mensagem: ' + extra.slice(0, 500)); }
      track('form_submit', { form: 'contato', formato: form.elements.formato.value });
      status.textContent = 'Abrindo o WhatsApp com a sua mensagem…';
      window.open(waUrl(lines.join('\n')), '_blank', 'noopener');
      var thanks = form.getAttribute('data-thanks');
      if (thanks) { window.setTimeout(function () { window.location.href = thanks; }, 600); }
      else { status.textContent = 'Mensagem aberta no WhatsApp. Envie por lá para concluir.'; }
    });
  }

  /* Consentimento e Analytics (só carrega com ID configurado e aceite) */
  function loadGA() {
    if (!CONFIG.gaId || window.gtag) { return; }
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + CONFIG.gaId;
    document.head.appendChild(s);
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.gaId, { anonymize_ip: true });
  }
  var consent = document.getElementById('consent');
  if (CONFIG.gaId) {
    var choice = store.lget('jl_consent');
    if (choice === 'yes') { loadGA(); }
    else if (!choice && consent) {
      consent.hidden = false;
      consent.querySelector('[data-consent="yes"]').addEventListener('click', function () {
        store.lset('jl_consent', 'yes'); consent.hidden = true; loadGA();
      });
      consent.querySelector('[data-consent="no"]').addEventListener('click', function () {
        store.lset('jl_consent', 'no'); consent.hidden = true;
      });
    }
  }

  if (document.body.getAttribute('data-page') === 'obrigado') { track('lead_thank_you', {}); }

  var year = document.getElementById('ano');
  if (year) { year.textContent = String(new Date().getFullYear()); }
})();
