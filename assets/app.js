// 콜로세움 화면 스크립트 (CSP: 인라인 스크립트 없음)
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const csrf = document.body.dataset.csrf || '';

  // 모바일 메뉴
  $$('[data-toggle-side]').forEach(b => b.addEventListener('click', () => $('#side').classList.toggle('open')));
  document.addEventListener('click', e => { const s = $('#side'); if (s && s.classList.contains('open') && !s.contains(e.target) && !e.target.closest('[data-toggle-side]')) s.classList.remove('open'); });

  // 확인 창
  document.addEventListener('submit', e => {
    const f = e.target;
    const btn = e.submitter;
    const msg = (btn && btn.dataset.confirm) || f.dataset.confirm;
    if (msg && !confirm(msg)) { e.preventDefault(); return; }
    if (f.dataset.needChecked) {
      const n = $$(f.dataset.needChecked).filter(c => c.checked).length;
      if (!n) { e.preventDefault(); alert('먼저 건을 선택하세요.'); return; }
    }
  });

  // 전체 선택
  $$('[data-check-all]').forEach(all => all.addEventListener('change', () => {
    $$(all.dataset.checkAll).forEach(c => { c.checked = all.checked; });
    syncCount();
  }));
  function syncCount() { $$('[data-count-of]').forEach(el => { el.textContent = $$(el.dataset.countOf).filter(c => c.checked).length; }); }
  document.addEventListener('change', e => { if (e.target.matches('input[type=checkbox]')) syncCount(); });
  // 표 밖 폼(배정·내보내기)이 표 안 체크박스를 함께 보내도록
  $$('form[data-collect]').forEach(f => f.addEventListener('submit', () => {
    $$('input[data-collected]', f).forEach(i => i.remove());
    $$(f.dataset.collect).filter(c => c.checked).forEach(c => {
      const h = document.createElement('input'); h.type = 'hidden'; h.name = 'ids[]'; h.value = c.value; h.dataset.collected = '1'; f.appendChild(h);
    });
  }));

  // 미사용 자동 로그아웃 (서버가 최종 판단, 화면은 안내)
  const idle = parseInt(document.body.dataset.idle || '0', 10);
  if (idle > 0) {
    let last = Date.now();
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { last = Date.now(); }, { passive: true }));
    setInterval(() => {
      if (Date.now() - last > idle * 60000) location.href = '/login';
    }, 30000);
    // 알림 개수 (활동 중일 때만, 2분마다)
    setInterval(() => {
      if (Date.now() - last > 5 * 60000) return;
      fetch('/ping', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : null).then(j => {
        if (!j) return;
        const b = $('[data-unread]');
        if (b) { b.textContent = j.unread; b.hidden = !j.unread; }
      }).catch(() => {});
    }, 120000);
  }

  // 조건부 표시: data-show-if="name=value"
  function applyShowIf() {
    $$('[data-show-if]').forEach(el => {
      const [name, val] = el.dataset.showIf.split('=');
      const inputs = $$(`[name="${name}"]`);
      let cur = '';
      inputs.forEach(i => { if ((i.type === 'radio' || i.type === 'checkbox') ? i.checked : true) cur = i.value; });
      const vals = val.split('|');
      const on = vals.includes(cur);
      el.hidden = !on;
      $$('input,select,textarea', el).forEach(i => { i.disabled = !on; });
    });
  }
  document.addEventListener('change', e => { if (e.target.name) applyShowIf(); });
  applyShowIf();

  // 정책 선택 → 사은품 한도 표시·초과 경고
  const pol = $('#product_key');
  const gift = $('[name=gift_amount]');
  function giftCheck() {
    if (!pol) return;
    const opt = pol.selectedOptions[0];
    const limit = opt ? parseInt(opt.dataset.limit || '0', 10) : 0;
    const info = $('#policy-info');
    if (info) info.textContent = opt && opt.value ? `월 ${Number(opt.dataset.fee || 0).toLocaleString()}원 · 약정 ${opt.dataset.months}개월 · 사은품 한도 ${limit.toLocaleString()}원` : '';
    const warn = $('#gift-warn');
    if (warn && gift) {
      const g = parseInt((gift.value || '0').replace(/\D/g, ''), 10) || 0;
      warn.hidden = !(opt && opt.value && g > limit);
      warn.textContent = `상부 정책 한도(${limit.toLocaleString()}원)를 ${(g - limit).toLocaleString()}원 넘습니다. 접수는 되지만 해피콜에서 확인합니다.`;
    }
  }
  if (pol) { pol.addEventListener('change', giftCheck); }
  if (gift) {
    gift.addEventListener('input', () => {
      const d = gift.value.replace(/\D/g, '');
      gift.value = d ? Number(d).toLocaleString() : '';
      giftCheck();
    });
  }
  giftCheck();

  // 숫자만 칸
  $$('[data-digits]').forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/[^\d-]/g, ''); }));

  // 도로명 주소 검색 (카카오 우편번호 서비스, 키 불필요)
  $$('[data-addr-search]').forEach(btn => btn.addEventListener('click', () => {
    const go = () => new window.daum.Postcode({
      oncomplete: d => {
        $('[name=install_zip]').value = d.zonecode;
        $('[name=install_addr1]').value = d.roadAddress || d.jibunAddress;
        const b = $('[name=install_addr2]'); b.focus();
      }
    }).open();
    if (window.daum && window.daum.Postcode) return go();
    const s = document.createElement('script');
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    s.onload = go;
    s.onerror = () => { alert('주소 검색을 불러오지 못했습니다. 직접 입력하세요.'); const a = $('[name=install_addr1]'); a.readOnly = false; a.focus(); };
    document.head.appendChild(s);
  }));

  // 원본 보기 (권한자, 서버에 기록됨)
  $$('[data-reveal]').forEach(btn => btn.addEventListener('click', async () => {
    const reason = prompt('원본을 보는 사유를 적어 주세요. (열람 기록에 남습니다)');
    if (!reason) return;
    const body = new URLSearchParams({ _csrf: csrf, reason });
    const r = await fetch(btn.dataset.reveal, { method: 'POST', body, headers: { Accept: 'application/json' } });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) { alert((j && j.error) || '열람할 수 없습니다.'); return; }
    Object.entries(j.data).forEach(([k, v]) => { $$(`[data-field="${k}"]`).forEach(el => { el.textContent = v || '-'; }); });
    btn.disabled = true; btn.textContent = '원본 표시 중';
    setTimeout(() => location.reload(), 60000);
  }));

  // 첨부 뷰어: 우클릭·드래그 저장 막기 (완전한 차단은 아님 — 워터마크가 본 방어)
  $$('.viewer').forEach(v => { v.addEventListener('contextmenu', e => e.preventDefault()); v.addEventListener('dragstart', e => e.preventDefault()); });

  // 해피콜 체크리스트: 진행 막대 · 단계 색 · 일괄 일치
  const hcForm = $('#hcform');
  function hcSync() {
    if (!hcForm) return;
    const names = [...new Set($$('input[name^="check["]', hcForm).map(i => i.name))];
    const val = n => { const c = $$(`input[name="${CSS.escape(n)}"]`, hcForm).find(i => i.checked); return c ? c.value : ''; };
    const yes = names.filter(n => val(n) === 'Y').length, no = names.filter(n => val(n) === 'N').length;
    const p = $('[data-progress]');
    if (p) {
      $('[data-progress-text]', p).textContent = `${yes + no} / ${names.length} 확인` + (no ? ` · 불일치 ${no}` : '');
      $('.bar i', p).style.width = (names.length ? (yes + no) / names.length * 100 : 0) + '%';
      p.classList.toggle('bad', no > 0);
    }
    $$('.hc-step', hcForm).forEach(st => {
      const ns = [...new Set($$('input[name^="check["]', st).map(i => i.name))];
      const vs = ns.map(val);
      st.classList.toggle('ok', ns.length > 0 && vs.every(v => v === 'Y'));
      st.classList.toggle('ng', vs.includes('N'));
    });
    // 불일치가 있으면 결과를 반려 쪽으로 안내
    const pass = $('input[name=result][value=pass]');
    if (pass && no > 0 && pass.checked) { const rj = $('input[name=result][value=reject]'); rj.checked = true; rj.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  if (hcForm) {
    hcForm.addEventListener('change', hcSync);
    $$('[data-all-yes]').forEach(b => b.addEventListener('click', () => {
      const scope = b.dataset.allYes === 'all' ? hcForm : b.closest('.hc-step');
      $$('input[name^="check["][value=Y]', scope).forEach(i => { i.checked = true; });
      hcSync();
    }));
    hcSync();
  }

  // 승인 필요 없는 엑셀은 그 자리에서 내려받고 목록을 새로 고침
  if (document.body.dataset.autodl) {
    setTimeout(() => { location.href = document.body.dataset.autodl; }, 300);
    // 큰 파일은 오래 걸리므로 자동 새로고침을 하지 않는다(다운로드가 끊길 수 있음)
  }

  // 휴대폰: 표를 카드로 보여 줄 때 칸 이름을 붙인다
  $$('table.t').forEach(t => {
    const heads = $$('thead th', t).map(th => th.textContent.trim());
    $$('tbody tr, tfoot tr', t).forEach(tr => {
      let i = 0;
      Array.from(tr.children).forEach(td => {
        const span = parseInt(td.getAttribute('colspan') || '1', 10);
        if (heads[i] && !td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i]);
        // 이름+전화처럼 값이 여러 조각이면 한 묶음으로 (카드에서 오른쪽 정렬이 깨지지 않게)
        const nodes = Array.from(td.childNodes).filter(n => n.nodeType === 1 || n.textContent.trim() !== '');
        if (heads[i] && nodes.length > 1 && !td.querySelector('form')) {
          const w = document.createElement('span'); w.className = 'cv';
          while (td.firstChild) w.appendChild(td.firstChild);
          td.appendChild(w);
        }
        i += span;
      });
    });
  });

  // 휴대폰: 검색·필터는 접어 두고 버튼으로 연다 (조건이 걸려 있으면 펼친 채로)
  if (window.matchMedia('(max-width: 760px)').matches) {
    $$('form.filters').forEach(f => {
      const active = $$('input, select', f).some(i => i.type !== 'hidden' && (i.type === 'checkbox' ? i.checked : (i.value || '').trim() !== ''));
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn filter-toggle'; b.textContent = '검색·필터';
      b.addEventListener('click', () => { f.classList.toggle('collapsed'); b.classList.toggle('on', !f.classList.contains('collapsed')); });
      f.prepend(b);
      if (!active) f.classList.add('collapsed'); else b.classList.add('on');
    });
  }

  // 파일 선택 시 바로 올리기
  $$('form[data-autosubmit] input[type=file]').forEach(i => i.addEventListener('change', () => { if (i.files.length) i.form.submit(); }));
})();
