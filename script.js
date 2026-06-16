/* ============================================================
   ЭГИДА — interactions
   Quiz funnel · reveal · lead → WhatsApp click-to-chat
   ============================================================ */
(function () {
  'use strict';

  var WA_PHONE = '79191877350';          // куда уходит заявка (WhatsApp)
  var WA_LABEL = '+7 919 187-73-50';

  /* ---------- smooth anchor scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = [];
  document.querySelectorAll(
    '.section-head, .path-card, .svc-col, .why-card, .step, .review-card, .faq-item, .hero-hot, .employer-risks, .cta-box'
  ).forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (Math.min(i % 4, 3) * 0.06) + 's';
    revealEls.push(el);
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- phone mask (light) ---------- */
  function maskPhone(input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' ' + d.slice(1, 4);
      if (d.length >= 5) out += ' ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      input.value = out;
    });
  }
  document.querySelectorAll('input[type="tel"]').forEach(maskPhone);

  function validPhone(v) { return v.replace(/\D/g, '').length >= 11; }

  /* ---------- lead delivery → WhatsApp ---------- */
  function sendLead(data) {
    var lines = [
      'Здравствуйте! Заявка с сайта Эгида.',
      '',
      'Имя: ' + (data.name || '—'),
      'Телефон: ' + (data.phone || '—')
    ];
    if (data.topic)    lines.push('Направление: ' + data.topic);
    if (data.business) lines.push('Бизнес: ' + data.business);
    if (data.detail)   lines.push('Детали: ' + data.detail);
    lines.push('', 'Прошу перезвонить для бесплатного разбора.');
    var text = encodeURIComponent(lines.join('\n'));

    // локальный бэкап заявок (на случай если позже подключим бота/CRM)
    try {
      var saved = JSON.parse(localStorage.getItem('egida_leads') || '[]');
      saved.push(Object.assign({ ts: new Date().toISOString() }, data));
      localStorage.setItem('egida_leads', JSON.stringify(saved));
    } catch (e) {}

    window.open('https://wa.me/' + WA_PHONE + '?text=' + text, '_blank', 'noopener');
  }

  /* ============================================================
     QUIZ
     ============================================================ */
  var overlay = document.getElementById('quiz');
  var inner = document.getElementById('quizInner');
  var bar = document.getElementById('quizBar');
  var closeBtn = document.getElementById('quizClose');
  var lastFocus = null;
  var state = { topic: 'all', step: 0, steps: [], answers: {} };

  var TOPIC_LABEL = {
    buh: 'Бухгалтерия и налоги',
    kadry: 'Кадры и трудовое право',
    all: 'Консультация'
  };

  function buildSteps(topic) {
    var steps = [];

    if (topic === 'all') {
      steps.push({
        key: 'topic', tag: 'Шаг 1', q: 'Что вас интересует?',
        opts: [
          { v: 'Бухгалтерия и налоги' },
          { v: 'Кадры и трудовое право' },
          { v: 'И бухгалтерия, и кадры' },
          { v: 'Пока не знаю — нужна консультация' }
        ]
      });
    } else {
      state.answers.topic = TOPIC_LABEL[topic];
    }

    steps.push({
      key: 'business', tag: 'О бизнесе', q: 'Какая у вас форма бизнеса?',
      opts: [
        { v: 'ИП' }, { v: 'ООО' }, { v: 'Самозанятый' }, { v: 'Только планирую открыть' }
      ]
    });

    if (topic === 'buh') {
      steps.push({
        key: 'detail', tag: 'Уточнение', q: 'Какой годовой оборот примерно?',
        opts: [
          { v: 'До 20 млн ₽' }, { v: '20–60 млн ₽' },
          { v: '60–250 млн ₽' }, { v: 'Свыше 250 млн ₽' }, { v: 'Затрудняюсь ответить' }
        ]
      });
    } else if (topic === 'kadry') {
      steps.push({
        key: 'detail', tag: 'Уточнение', q: 'Сколько у вас сотрудников?',
        opts: [
          { v: '1–5' }, { v: '6–15' }, { v: '16–50' }, { v: 'Более 50' }, { v: 'Пока нет, планирую нанимать' }
        ]
      });
    } else {
      steps.push({
        key: 'detail', tag: 'Уточнение', q: 'Что для вас сейчас важнее всего?',
        opts: [
          { v: 'Снизить налоги законно' },
          { v: 'Навести порядок в учёте' },
          { v: 'Защититься от штрафов по кадрам' },
          { v: 'Разобраться комплексно' }
        ]
      });
    }

    steps.push({ key: 'contact', tag: 'Последний шаг', q: 'Куда перезвонить с бесплатным разбором?', contact: true });
    steps.push({ success: true });
    return steps;
  }

  function openQuiz(topic) {
    state.topic = topic || 'all';
    state.step = 0;
    state.answers = {};
    state.steps = buildSteps(state.topic);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    document.body.style.overflow = 'hidden';
    render();
  }

  function closeQuiz() {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(function () { overlay.hidden = true; inner.innerHTML = ''; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function setProgress() {
    var total = state.steps.length;
    bar.style.width = Math.round(((state.step + 1) / total) * 100) + '%';
  }

  function render() {
    var s = state.steps[state.step];
    setProgress();
    inner.innerHTML = '';

    if (s.success) { renderSuccess(); return; }

    var tag = document.createElement('div');
    tag.className = 'quiz-step-tag';
    tag.textContent = s.tag;
    inner.appendChild(tag);

    var q = document.createElement('div');
    q.className = 'quiz-q';
    q.id = 'quizTitle';
    q.textContent = s.q;
    inner.appendChild(q);

    if (s.contact) { renderContact(); }
    else { renderOptions(s); }

    if (state.step > 0 && !s.success) {
      var back = document.createElement('button');
      back.className = 'quiz-back';
      back.innerHTML = '← Назад';
      back.addEventListener('click', function () { state.step--; render(); });
      inner.appendChild(back);
    }
  }

  function renderOptions(s) {
    var wrap = document.createElement('div');
    wrap.className = 'quiz-opts';
    s.opts.forEach(function (o, idx) {
      var b = document.createElement('button');
      b.className = 'quiz-opt';
      b.innerHTML = '<span class="qo-mark" aria-hidden="true"></span><span>' + o.v + '</span>';
      b.addEventListener('click', function () {
        state.answers[s.key] = o.v;
        if (s.key === 'topic') {
          // переключаем ветку, если выбрали конкретную тему
          if (o.v.indexOf('Бухгалтерия и налоги') === 0) rebuildFrom('buh');
          else if (o.v.indexOf('Кадры') === 0) rebuildFrom('kadry');
          else rebuildFrom('all');
        }
        state.step++;
        render();
      });
      wrap.appendChild(b);
      if (idx === 0) setTimeout(function () { b.focus(); }, 30);
    });
    inner.appendChild(wrap);
  }

  // когда на шаге "что интересует" выбрали конкретную тему — перестраиваем уточняющий шаг
  function rebuildFrom(topic) {
    var keepTopic = state.answers.topic;
    var rebuilt = buildSteps(topic);
    // первый шаг (topic) уже пройден — заменяем хвост (без повторного шага topic), сохраняя ответ
    state.steps = [state.steps[0]].concat(rebuilt.filter(function (st) {
      return st.success || (st.key && st.key !== 'topic');
    }));
    state.answers.topic = keepTopic;
  }

  function renderContact() {
    var form = document.createElement('form');
    form.className = 'quiz-fields';
    form.noValidate = true;
    form.innerHTML =
      '<div class="field"><label for="q-name">Ваше имя</label>' +
      '<input type="text" id="q-name" autocomplete="name" placeholder="Имя" required></div>' +
      '<div class="field"><label for="q-phone">Телефон</label>' +
      '<input type="tel" id="q-phone" autocomplete="tel" inputmode="tel" placeholder="+7 ___ ___-__-__" required></div>' +
      '<button type="submit" class="btn btn-gold btn-lg btn-block">Получить бесплатный разбор</button>' +
      '<p class="form-fine">Заявка откроется в WhatsApp — нажмёте «отправить», и мы перезвоним. Никакого спама.</p>';
    inner.appendChild(form);

    var name = form.querySelector('#q-name');
    var phone = form.querySelector('#q-phone');
    maskPhone(phone);
    setTimeout(function () { name.focus(); }, 30);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      if (!name.value.trim()) { name.classList.add('invalid'); ok = false; } else name.classList.remove('invalid');
      if (!validPhone(phone.value)) { phone.classList.add('invalid'); ok = false; } else phone.classList.remove('invalid');
      if (!ok) return;
      state.answers.name = name.value.trim();
      state.answers.phone = phone.value.trim();
      sendLead(state.answers);
      state.step++;
      render();
    });
  }

  function renderSuccess() {
    bar.style.width = '100%';
    var d = document.createElement('div');
    d.className = 'quiz-success';
    d.innerHTML =
      '<div class="qs-ico" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<h3>Заявка готова!</h3>' +
      '<p>Мы открыли WhatsApp с вашей заявкой — нажмите «отправить». Если окно не открылось, напишите нам напрямую или позвоните.</p>' +
      '<a class="btn btn-primary btn-lg btn-block" href="https://wa.me/' + WA_PHONE + '" target="_blank" rel="noopener">Открыть WhatsApp</a>' +
      '<a class="quiz-back" href="tel:+' + WA_PHONE + '" style="justify-content:center;margin-top:16px">Или позвонить: ' + WA_LABEL + '</a>';
    inner.appendChild(d);
  }

  /* ---------- triggers ---------- */
  document.querySelectorAll('[data-quiz]').forEach(function (btn) {
    btn.addEventListener('click', function () { openQuiz(btn.getAttribute('data-quiz')); });
  });
  closeBtn.addEventListener('click', closeQuiz);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeQuiz(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeQuiz(); });

  /* ---------- bottom contact form ---------- */
  var leadForm = document.getElementById('leadForm');
  if (leadForm) {
    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = leadForm.querySelector('#lf-name');
      var phone = leadForm.querySelector('#lf-phone');
      var topic = leadForm.querySelector('#lf-topic');
      var ok = true;
      if (!name.value.trim()) { name.classList.add('invalid'); ok = false; } else name.classList.remove('invalid');
      if (!validPhone(phone.value)) { phone.classList.add('invalid'); ok = false; } else phone.classList.remove('invalid');
      if (!ok) return;
      sendLead({ name: name.value.trim(), phone: phone.value.trim(), topic: topic.value });
      var btn = leadForm.querySelector('button[type="submit"]');
      btn.textContent = '✓ Заявка отправлена — откройте WhatsApp';
      btn.disabled = true;
      setTimeout(function () { btn.textContent = 'Отправить заявку'; btn.disabled = false; }, 6000);
    });
  }

  /* ---------- floating messenger widget ---------- */
  var fab = document.getElementById('fab');
  var fabToggle = document.getElementById('fabToggle');
  if (fab && fabToggle) {
    fabToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = fab.classList.toggle('open');
      fabToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (fab.classList.contains('open') && !fab.contains(e.target)) {
        fab.classList.remove('open');
        fabToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
