(function initMy1RM(globalScope) {
  'use strict';

  const KG_PER_LB = 0.45359237;
  const PRIVACY_KEY = 'my1rm_privacy_preferences_v1';
  const LANG_KEY = 'my1rm_lang_v1';

  const SBD_LIFTS = [
    { id: 'squat', label: 'Squat' },
    { id: 'bench', label: 'Bench' },
    { id: 'deadlift', label: 'Deadlift' },
  ];
  const EXTRA_LIFTS = [
    { id: 'overheadPress', label: 'Overhead Press' },
    { id: 'barbellRow', label: 'Barbell Row' },
    { id: 'pullup', label: 'Pull-up' },
  ];
  const LIFTS = SBD_LIFTS;
  const CALCULATOR_LIFTS = SBD_LIFTS.concat(EXTRA_LIFTS);

  const AGE_MULTIPLIERS = [
    { min: 0, max: 17, label: 'under 18', value: 0.82 },
    { min: 18, max: 23, label: '18-23', value: 0.94 },
    { min: 24, max: 34, label: '24-34', value: 1 },
    { min: 35, max: 44, label: '35-44', value: 0.96 },
    { min: 45, max: 54, label: '45-54', value: 0.88 },
    { min: 55, max: 64, label: '55-64', value: 0.76 },
    { min: 65, max: 130, label: '65+', value: 0.62 },
  ];

  const STANDARDS = {
    male: {
      squat: [
        { percentile: 10, ratio: 0.75 },
        { percentile: 30, ratio: 1.2 },
        { percentile: 55, ratio: 1.65 },
        { percentile: 75, ratio: 2.15 },
        { percentile: 90, ratio: 2.75 },
      ],
      bench: [
        { percentile: 10, ratio: 0.5 },
        { percentile: 30, ratio: 0.85 },
        { percentile: 55, ratio: 1.2 },
        { percentile: 75, ratio: 1.55 },
        { percentile: 90, ratio: 1.95 },
      ],
      deadlift: [
        { percentile: 10, ratio: 0.9 },
        { percentile: 30, ratio: 1.45 },
        { percentile: 55, ratio: 2.05 },
        { percentile: 75, ratio: 2.65 },
        { percentile: 90, ratio: 3.25 },
      ],
    },
    female: {
      squat: [
        { percentile: 10, ratio: 0.42 },
        { percentile: 30, ratio: 0.72 },
        { percentile: 55, ratio: 1.05 },
        { percentile: 75, ratio: 1.42 },
        { percentile: 90, ratio: 2.0 },
      ],
      bench: [
        { percentile: 10, ratio: 0.25 },
        { percentile: 30, ratio: 0.45 },
        { percentile: 55, ratio: 0.68 },
        { percentile: 75, ratio: 0.95 },
        { percentile: 90, ratio: 1.32 },
      ],
      deadlift: [
        { percentile: 10, ratio: 0.58 },
        { percentile: 30, ratio: 0.98 },
        { percentile: 55, ratio: 1.45 },
        { percentile: 75, ratio: 1.95 },
        { percentile: 90, ratio: 2.6 },
      ],
    },
  };

  // ---- calculation core (test-backed, unchanged behaviour) ----
  function round(value, places = 1) {
    const factor = 10 ** places;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function toKg(value, unit) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return unit === 'lb' ? numeric * KG_PER_LB : numeric;
  }

  function fromKg(value, unit) {
    return unit === 'lb' ? value / KG_PER_LB : value;
  }

  function epley(weightKg, reps) {
    return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
  }

  function brzycki(weightKg, reps) {
    return reps <= 1 ? weightKg : weightKg * (36 / (37 - reps));
  }

  function lombardi(weightKg, reps) {
    return reps <= 1 ? weightKg : weightKg * reps ** 0.1;
  }

  function estimateOneRepMax(weightKg, reps, formula = 'average') {
    const safeWeight = Math.max(0, Number(weightKg) || 0);
    const safeReps = clamp(Math.round(Number(reps) || 1), 1, 15);
    if (safeWeight === 0) return 0;
    if (formula === 'epley') return round(epley(safeWeight, safeReps), 1);
    if (formula === 'brzycki') return round(brzycki(safeWeight, safeReps), 1);
    if (formula === 'lombardi') return round(lombardi(safeWeight, safeReps), 1);

    const values = [epley(safeWeight, safeReps), brzycki(safeWeight, safeReps), lombardi(safeWeight, safeReps)];
    return round(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
  }

  function getAgeBucket(age) {
    const numericAge = Number(age) || 30;
    return AGE_MULTIPLIERS.find((bucket) => numericAge >= bucket.min && numericAge <= bucket.max) || AGE_MULTIPLIERS[2];
  }

  function interpolatePercentile(ratio, points) {
    const safeRatio = Math.max(0, Number(ratio) || 0);
    if (safeRatio <= 0) return 1;
    const first = points[0];
    const last = points[points.length - 1];

    if (safeRatio <= first.ratio) {
      return round(clamp(1 + (safeRatio / first.ratio) * 9, 1, first.percentile), 0);
    }

    for (let index = 1; index < points.length; index += 1) {
      const low = points[index - 1];
      const high = points[index];
      if (safeRatio <= high.ratio) {
        const progress = (safeRatio - low.ratio) / (high.ratio - low.ratio);
        return round(low.percentile + progress * (high.percentile - low.percentile), 0);
      }
    }

    const extra = ((safeRatio - last.ratio) / (last.ratio * 0.45)) * 9;
    return round(clamp(last.percentile + extra, last.percentile, 99), 0);
  }

  function scoreLift({ lift, oneRmKg, bodyweightKg, sex, age }) {
    const safeSex = sex === 'female' ? 'female' : 'male';
    const ageBucket = getAgeBucket(age);
    const ratio = bodyweightKg > 0 ? oneRmKg / bodyweightKg : 0;
    const adjustedRatio = ratio / ageBucket.value;
    const table = STANDARDS[safeSex] && STANDARDS[safeSex][lift];
    const percentile = table ? interpolatePercentile(adjustedRatio, table) : null;
    return {
      ratio: round(ratio, 2),
      adjustedRatio: round(adjustedRatio, 2),
      percentile,
      ageBucket: ageBucket.label,
    };
  }

  // Returns a translation KEY (resolved by t('level_' + key) at render time).
  function levelLabel(percentile) {
    if (percentile >= 90) return 'elite';
    if (percentile >= 75) return 'veryStrong';
    if (percentile >= 55) return 'solid';
    if (percentile >= 30) return 'developing';
    return 'novice';
  }

  function calculateProfile(input) {
    const unit = input.unit === 'lb' ? 'lb' : 'kg';
    const bodyweightKg = toKg(input.bodyweight, unit);
    const lifts = {};
    let totalKg = 0;
    let percentileSum = 0;
    let scoredCount = 0;

    LIFTS.forEach((liftConfig) => {
      const weightKg = toKg(input[`${liftConfig.id}Weight`], unit);
      const reps = input[`${liftConfig.id}Reps`];
      const oneRmKg = estimateOneRepMax(weightKg, reps);
      const score = scoreLift({
        lift: liftConfig.id,
        oneRmKg,
        bodyweightKg,
        sex: input.sex,
        age: input.age,
      });

      lifts[liftConfig.id] = {
        label: liftConfig.label,
        oneRmKg,
        displayOneRm: round(fromKg(oneRmKg, unit), unit === 'lb' ? 0 : 1),
        ratio: score.ratio,
        percentile: score.percentile,
      };

      totalKg += oneRmKg;
      if (oneRmKg > 0) {
        percentileSum += score.percentile;
        scoredCount += 1;
      }
    });

    const totalPercentile = scoredCount ? round(percentileSum / scoredCount, 0) : 1;
    return {
      unit,
      bodyweightKg,
      ageBucket: getAgeBucket(input.age).label,
      lifts,
      totalKg: round(totalKg, 1),
      displayTotal: round(fromKg(totalKg, unit), unit === 'lb' ? 0 : 1),
      totalRatio: bodyweightKg > 0 ? round(totalKg / bodyweightKg, 2) : 0,
      totalPercentile,
      level: levelLabel(totalPercentile),
    };
  }

  // ---- privacy + location (unchanged behaviour) ----
  function readPrivacyPreferences() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PRIVACY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function savePrivacyPreferences(preferences) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(PRIVACY_KEY, JSON.stringify({
        essential: true,
        location: Boolean(preferences.location),
        adsCookies: false,
        updatedAt: new Date().toISOString(),
      }));
    } catch (_error) {
      // The site still works if localStorage is unavailable.
    }
  }

  async function fetchLocation() {
    if (typeof fetch !== 'function') return null;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 2200) : null;
    try {
      const response = await fetch('/api/location', {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (_error) {
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function formatLocation(location) {
    if (!location || (!location.city && !location.country)) return null;
    return [location.city, location.region, location.country].filter(Boolean).join(', ');
  }

  const api = {
    KG_PER_LB,
    estimateOneRepMax,
    calculateProfile,
    scoreLift,
    interpolatePercentile,
    toKg,
    fromKg,
    getAgeBucket,
    readPrivacyPreferences,
    savePrivacyPreferences,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.My1RM = api;

  // ===== UI layer (browser only) =====
  if (typeof document === 'undefined') return;

  const I18N = {
    ko: {
      tagline: '종목별 1RM 추정',
      liftSelect: '종목',
      squat: '스쿼트', bench: '벤치', deadlift: '데드리프트',
      overheadPress: '오버헤드프레스', barbellRow: '바벨로우', pullup: '풀업',
      reps: '횟수', clear: '비우기',
      resultTitle: '예상 1RM',
      formulaToggle: '공식 보기', formulaAverage: '평균',
      total: '총합',
      more: '상세', less: '접기',
      sex: '성별', male: '남', female: '여', age: '나이', bodyweight: '체중',
      percentile: '백분위', ratioLabel: '체중 대비',
      level_elite: '엘리트', level_veryStrong: '상급', level_solid: '중급',
      level_developing: '초중급', level_novice: '입문',
      locTitle: '추정 위치', locManual: '수동/없음', locChecking: '확인 중...',
      locHint: '대략적 국가/도시 · 저장 안 함', useLoc: '위치 사용',
      copy: '결과 복사', copied: '복사됨',
      tabCalc: '계산기', tabRank: '내 순위',
      rankIntro: '전체 방문자 중 내 총합 위치',
      seeRank: '순위 보기', rankLoading: '계산 중...',
      rankTop: '상위', rankPctLabel: '전체에서',
      rankFirst: '첫 기록 · 표본이 쌓이면 정확해짐',
      rankError: '순위 불러오기 실패 · 다시 시도',
      rankNote: '익명 · 지역은 접속 기준 대략, IP 미저장',
      demoNote: '샘플 기준 추정치',
      footer: 'My1RM은 추정 도구 · 코칭·의료·판정 조언 아님',
      privacy: '개인정보', terms: '약관', methodology: '계산 방식',
    },
    en: {
      tagline: 'Single-lift 1RM estimator',
      liftSelect: 'Lift',
      squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift',
      overheadPress: 'Overhead Press', barbellRow: 'Barbell Row', pullup: 'Pull-up',
      reps: 'Reps', clear: 'Clear',
      resultTitle: 'Estimated 1RM',
      formulaToggle: 'Show formulas', formulaAverage: 'Average',
      total: 'Total',
      more: 'Details', less: 'Hide',
      sex: 'Sex', male: 'M', female: 'F', age: 'Age', bodyweight: 'Bodyweight',
      percentile: 'Percentile', ratioLabel: 'of bodyweight',
      level_elite: 'Elite', level_veryStrong: 'Advanced', level_solid: 'Intermediate',
      level_developing: 'Beginner', level_novice: 'Novice',
      locTitle: 'Estimated location', locManual: 'Manual / none', locChecking: 'Checking...',
      locHint: 'Coarse country/city · not stored', useLoc: 'Use location',
      copy: 'Copy result', copied: 'Copied',
      tabCalc: 'Calculator', tabRank: 'My Rank',
      rankIntro: 'Your total vs. every visitor',
      seeRank: 'See rank', rankLoading: 'Calculating...',
      rankTop: 'Top', rankPctLabel: 'overall',
      rankFirst: 'First entry — rankings sharpen as more lifters join.',
      rankError: 'Couldn’t load rank · try again',
      rankNote: 'Anonymous · coarse region from your connection, IP never stored',
      demoNote: 'Sample-based estimate',
      footer: 'My1RM is an estimate, not coaching, medical, or judging advice.',
      privacy: 'Privacy', terms: 'Terms', methodology: 'Methodology',
    },
  };

  const PLATES = { kg: [1.25, 2.5, 5, 10, 20], lb: [2.5, 5, 10, 25, 45] };
  const REP_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const MAX_WEIGHT = 1000;

  const state = {
    unit: 'kg',
    selectedLift: 'squat',
    lift: {
      squat: { weight: 100, reps: 5 },
      bench: { weight: 60, reps: 5 },
      deadlift: { weight: 120, reps: 5 },
      overheadPress: { weight: 40, reps: 5 },
      barbellRow: { weight: 60, reps: 8 },
      pullup: { weight: 80, reps: 5 },
    },
    sex: 'male',
    age: 30,
    bodyweight: 80,
    advanced: false,
    location: null,
  };

  let lang = 'en';
  let locReqId = 0;

  function detectLang() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved === 'ko' || saved === 'en') return saved;
      }
    } catch (_error) {
      // ignore storage failures
    }
    const nav = (navigator.language || (navigator.languages && navigator.languages[0]) || 'en');
    return String(nav).toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  function setLang(next) {
    lang = next === 'ko' ? 'ko' : 'en';
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
    } catch (_error) {
      // ignore storage failures
    }
    document.documentElement.lang = lang;
  }

  function fmt(value) {
    return String(Math.round(value * 100) / 100);
  }

  function liftConfig(id) {
    return CALCULATOR_LIFTS.find((cfg) => cfg.id === id) || CALCULATOR_LIFTS[0];
  }

  function hasStandard(lift, sex) {
    return Boolean(STANDARDS[sex] && STANDARDS[sex][lift]);
  }

  function displayWeight(weightKg) {
    return round(fromKg(weightKg, state.unit), state.unit === 'lb' ? 0 : 1);
  }

  function calculateSelectedLift() {
    const id = liftConfig(state.selectedLift).id;
    const liftState = state.lift[id];
    const weightKg = toKg(liftState.weight, state.unit);
    const reps = liftState.reps;
    const oneRmKg = estimateOneRepMax(weightKg, reps);
    const bodyweightKg = toKg(state.bodyweight, state.unit);
    const score = hasStandard(id, state.sex)
      ? scoreLift({
        lift: id,
        oneRmKg,
        bodyweightKg,
        sex: state.sex,
        age: state.age,
      })
      : null;

    return {
      id,
      reps,
      oneRmKg,
      displayOneRm: displayWeight(oneRmKg),
      ratio: bodyweightKg > 0 ? round(oneRmKg / bodyweightKg, 2) : 0,
      score,
      level: score ? levelLabel(score.percentile) : null,
      formulas: {
        epley: displayWeight(estimateOneRepMax(weightKg, reps, 'epley')),
        brzycki: displayWeight(estimateOneRepMax(weightKg, reps, 'brzycki')),
        lombardi: displayWeight(estimateOneRepMax(weightKg, reps, 'lombardi')),
        average: displayWeight(oneRmKg),
      },
    };
  }

  function buildInput() {
    return {
      sex: state.sex,
      age: state.age,
      bodyweight: state.bodyweight,
      unit: state.unit,
      squatWeight: state.lift.squat.weight,
      squatReps: state.lift.squat.reps,
      benchWeight: state.lift.bench.weight,
      benchReps: state.lift.bench.reps,
      deadliftWeight: state.lift.deadlift.weight,
      deadliftReps: state.lift.deadlift.reps,
    };
  }

  function el(tag, opts, children) {
    const node = document.createElement(tag);
    if (opts) {
      Object.keys(opts).forEach((key) => {
        if (key === 'class') node.className = opts[key];
        else if (key === 'text') node.textContent = opts[key];
        else if (key === 'i18n') node.setAttribute('data-i18n', opts[key]);
        else if (key.slice(0, 5) === 'data-' || key === 'type' || key === 'aria-label') node.setAttribute(key, opts[key]);
        else node[key] = opts[key];
      });
    }
    (children || []).forEach((child) => node.appendChild(child));
    return node;
  }

  // dom refs filled in setup
  const dom = {};

  function buildLiftPicker() {
    dom.liftPicker.replaceChildren();
    CALCULATOR_LIFTS.forEach((cfg) => {
      dom.liftPicker.appendChild(el('button', {
        class: 'lift-option',
        type: 'button',
        'data-select-lift': cfg.id,
        i18n: cfg.id,
        'aria-label': t(cfg.id),
      }));
    });
  }

  function buildCards() {
    dom.cards.replaceChildren();

    const cfg = liftConfig(state.selectedLift);
    const id = cfg.id;
    const weightValue = el('strong', { class: 'w-value', 'data-w': id, text: fmt(state.lift[id].weight) });
    const unitTag = el('span', { class: 'w-unit', 'data-unit': '', text: state.unit });
    const head = el('header', { class: 'card-top' }, [
      el('h2', { i18n: id }),
      el('span', { class: 'w-display', 'data-edit': id }, [weightValue, unitTag]),
    ]);

    const plateRow = el('div', { class: 'plates' });
    PLATES[state.unit].forEach((plate) => {
      plateRow.appendChild(el('button', {
        class: 'plate', type: 'button', 'data-plate': String(plate), text: `+${plate}`,
        'aria-label': `${t(id)} +${plate} ${state.unit}`,
      }));
    });
    plateRow.appendChild(el('button', {
      class: 'plate plate-clear', type: 'button', 'data-clear': id, i18n: 'clear',
      'aria-label': `${t(id)} ${t('clear')}`,
    }));

    const repRow = el('div', { class: 'reps' });
    repRow.appendChild(el('span', { class: 'reps-label', i18n: 'reps' }));
    const repBtns = el('div', { class: 'rep-btns', 'data-reps': id });
    REP_CHOICES.forEach((n) => {
      repBtns.appendChild(el('button', {
        class: 'rep', type: 'button', 'data-rep': String(n), text: String(n),
        'aria-label': `${t(id)} ${n} ${t('reps')}`,
      }));
    });
    repRow.appendChild(repBtns);

    dom.cards.appendChild(el('article', { class: 'card', 'data-lift': id }, [head, plateRow, repRow]));
  }

  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
  }

  function renderValues() {
    const selected = calculateSelectedLift();
    const id = selected.id;

    dom.liftPicker.querySelectorAll('[data-select-lift]').forEach((btn) => {
      const on = btn.getAttribute('data-select-lift') === id;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    const wNode = dom.cards.querySelector(`[data-w="${id}"]`);
    if (wNode) wNode.textContent = fmt(state.lift[id].weight);
    const repWrap = dom.cards.querySelector(`[data-reps="${id}"]`);
    if (repWrap) {
      repWrap.querySelectorAll('.rep').forEach((btn) => {
        const on = Number(btn.getAttribute('data-rep')) === state.lift[id].reps;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    dom.cards.querySelectorAll('[data-unit]').forEach((node) => { node.textContent = state.unit; });
    dom.selectedLiftLabel.textContent = t(id);
    dom.oneRmValue.textContent = `${selected.displayOneRm} ${state.unit}`;
    dom.ratioLine.textContent = `${selected.ratio}x ${t('ratioLabel')}`;
    dom.formulaEpley.textContent = `${selected.formulas.epley} ${state.unit}`;
    dom.formulaBrzycki.textContent = `${selected.formulas.brzycki} ${state.unit}`;
    dom.formulaLombardi.textContent = `${selected.formulas.lombardi} ${state.unit}`;
    dom.formulaAverageValue.textContent = `${selected.formulas.average} ${state.unit}`;

    if (selected.score) {
      dom.levelLine.hidden = false;
      dom.levelLine.textContent = `p${selected.score.percentile} · ${t('level_' + selected.level)}`;
      dom.benchmarkBox.hidden = false;
      dom.pctLabel.textContent = `p${selected.score.percentile} · ${t('level_' + selected.level)}`;
      dom.pctFill.style.width = `${clamp(selected.score.percentile, 0, 100)}%`;
    } else {
      dom.levelLine.hidden = true;
      dom.benchmarkBox.hidden = true;
      dom.pctLabel.textContent = '—';
      dom.pctFill.style.width = '0%';
    }

    // advanced
    dom.ageValue.textContent = String(state.age);
    dom.bwValue.textContent = `${fmt(state.bodyweight)} ${state.unit}`;
    dom.sexSeg.querySelectorAll('[data-sex]').forEach((btn) => {
      const on = btn.getAttribute('data-sex') === state.sex;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    dom.locLabel.textContent = state.location || t('locManual');

    // chrome
    dom.langToggle.textContent = lang === 'ko' ? 'EN' : '한';
    dom.unitToggle.textContent = state.unit;
    dom.moreToggle.querySelector('span').textContent = state.advanced ? t('less') : t('more');
    dom.moreToggle.setAttribute('aria-expanded', state.advanced ? 'true' : 'false');
    dom.advanced.hidden = !state.advanced;
  }

  function convertWeight(value, from, to) {
    if (from === to) return value;
    const kg = from === 'lb' ? value * KG_PER_LB : value;
    const out = to === 'lb' ? kg / KG_PER_LB : kg;
    return Math.min(MAX_WEIGHT, Math.round(out * 2) / 2);
  }

  function toggleUnit() {
    const next = state.unit === 'kg' ? 'lb' : 'kg';
    CALCULATOR_LIFTS.forEach((cfg) => {
      state.lift[cfg.id].weight = convertWeight(state.lift[cfg.id].weight, state.unit, next);
    });
    state.bodyweight = convertWeight(state.bodyweight, state.unit, next);
    state.unit = next;
    buildCards();
    applyStaticI18n();
    renderValues();
  }

  function toggleLang() {
    setLang(lang === 'ko' ? 'en' : 'ko');
    buildLiftPicker();
    buildCards();
    applyStaticI18n();
    renderValues();
  }

  function selectLift(id) {
    if (!state.lift[id]) return;
    state.selectedLift = id;
    buildCards();
    applyStaticI18n();
    renderValues();
  }

  function startWeightEdit(id, displayNode) {
    const input = el('input', { class: 'w-input', type: 'text', inputmode: 'decimal' });
    input.value = fmt(state.lift[id].weight);
    input.setAttribute('aria-label', `${t(id)} ${state.unit}`);
    displayNode.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const commit = () => {
      if (done) return;
      done = true;
      const raw = Number(input.value);
      const next = Number.isFinite(raw)
        ? Math.min(MAX_WEIGHT, Math.max(0, Math.round(raw * 100) / 100))
        : state.lift[id].weight;
      state.lift[id].weight = next;
      buildCards();
      applyStaticI18n();
      renderValues();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (keyEvent) => {
      if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        input.blur();
      } else if (keyEvent.key === 'Escape') {
        done = true;
        buildCards();
        applyStaticI18n();
        renderValues();
      }
    });
  }

  function onCardClick(event) {
    const editTarget = event.target.closest('[data-edit]');
    if (editTarget) {
      startWeightEdit(editTarget.getAttribute('data-edit'), editTarget);
      return;
    }
    const target = event.target.closest('button');
    if (!target) return;
    const card = target.closest('[data-lift]');
    if (!card) return;
    const id = card.getAttribute('data-lift');
    if (!id || !state.lift[id]) return;

    if (target.hasAttribute('data-plate')) {
      const plate = Number(target.getAttribute('data-plate'));
      state.lift[id].weight = Math.min(MAX_WEIGHT, Math.round((state.lift[id].weight + plate) * 100) / 100);
      renderValues();
    } else if (target.hasAttribute('data-clear')) {
      state.lift[id].weight = 0;
      renderValues();
    } else if (target.hasAttribute('data-rep')) {
      state.lift[id].reps = clamp(Number(target.getAttribute('data-rep')), 1, 15);
      renderValues();
    }
  }

  async function useLocation() {
    savePrivacyPreferences({ location: true });
    const reqId = ++locReqId;
    dom.locLabel.textContent = t('locChecking');
    const location = await fetchLocation();
    if (reqId !== locReqId) return;
    state.location = formatLocation(location);
    renderValues();
  }

  async function copyResult() {
    const selected = calculateSelectedLift();
    const text = `${t(selected.id)} My1RM: ${selected.displayOneRm} ${state.unit} (${selected.ratio}x ${t('ratioLabel')})`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        dom.copyBtn.textContent = t('copied');
        setTimeout(() => { dom.copyBtn.textContent = t('copy'); }, 1800);
      }
    } catch (_error) {
      // clipboard unavailable — no-op
    }
  }

  function switchTab(tab) {
    const target = tab === 'rank' ? 'rank' : 'calc';
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-panel') !== target;
    });
    document.querySelectorAll('.tab').forEach((btn) => {
      const on = btn.getAttribute('data-tab') === target;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function renderRank(data) {
    dom.rankResult.hidden = false;
    if (!data || data.error) {
      dom.rankPct.textContent = '—';
      dom.rankCity.textContent = '';
      dom.rankMeta.textContent = t('rankError');
      return;
    }
    if (data.percentile == null || data.cohortTotal <= 1) {
      dom.rankPct.textContent = '★';
      dom.rankCity.textContent = t('rankFirst');
      dom.rankMeta.textContent = '';
      return;
    }
    const top = Math.max(1, 100 - data.percentile);
    dom.rankPct.textContent = `${t('rankTop')} ${top}%`;
    if (data.city && data.cityTotal) {
      dom.rankCity.textContent = `${data.city} · ${data.cityRank}/${data.cityTotal}`;
    } else {
      dom.rankCity.textContent = '';
    }
    dom.rankMeta.textContent = lang === 'ko'
      ? `같은 성별·나이대 ${data.cohortTotal}명 중`
      : `among ${data.cohortTotal} in your sex & age band`;
  }

  async function fetchRank() {
    const profile = calculateProfile(buildInput());
    dom.rankBtn.disabled = true;
    dom.rankBtn.textContent = t('rankLoading');
    try {
      const response = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          total_kg: profile.totalKg,
          squat_kg: profile.lifts.squat.oneRmKg,
          bench_kg: profile.lifts.bench.oneRmKg,
          deadlift_kg: profile.lifts.deadlift.oneRmKg,
          sex: state.sex,
          age_bucket: getAgeBucket(state.age).label,
        }),
      });
      renderRank(await response.json());
    } catch (_error) {
      renderRank({ error: true });
    } finally {
      dom.rankBtn.disabled = false;
      dom.rankBtn.textContent = t('seeRank');
    }
  }

  function setupBrowser() {
    dom.liftPicker = document.getElementById('liftPicker');
    dom.cards = document.getElementById('liftCards');
    dom.selectedLiftLabel = document.getElementById('selectedLiftLabel');
    dom.oneRmValue = document.getElementById('oneRmValue');
    dom.levelLine = document.getElementById('levelLine');
    dom.formulaEpley = document.getElementById('formulaEpley');
    dom.formulaBrzycki = document.getElementById('formulaBrzycki');
    dom.formulaLombardi = document.getElementById('formulaLombardi');
    dom.formulaAverageValue = document.getElementById('formulaAverageValue');
    dom.langToggle = document.getElementById('langToggle');
    dom.unitToggle = document.getElementById('unitToggle');
    dom.moreToggle = document.getElementById('moreToggle');
    dom.advanced = document.getElementById('advanced');
    dom.ageValue = document.getElementById('ageValue');
    dom.bwValue = document.getElementById('bwValue');
    dom.sexSeg = document.getElementById('sexSeg');
    dom.pctLabel = document.getElementById('pctLabel');
    dom.pctFill = document.getElementById('pctFill');
    dom.ratioLine = document.getElementById('ratioLine');
    dom.benchmarkBox = document.getElementById('benchmarkBox');
    dom.locLabel = document.getElementById('locLabel');
    dom.copyBtn = document.getElementById('copyBtn');
    dom.rankBtn = document.getElementById('rankBtn');
    dom.rankResult = document.getElementById('rankResult');
    dom.rankPct = document.getElementById('rankPct');
    dom.rankCity = document.getElementById('rankCity');
    dom.rankMeta = document.getElementById('rankMeta');

    setLang(detectLang());

    buildLiftPicker();
    buildCards();
    applyStaticI18n();
    renderValues();

    dom.liftPicker.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-select-lift]');
      if (!btn) return;
      selectLift(btn.getAttribute('data-select-lift'));
    });
    dom.cards.addEventListener('click', onCardClick);
    dom.langToggle.addEventListener('click', toggleLang);
    dom.unitToggle.addEventListener('click', toggleUnit);
    dom.moreToggle.addEventListener('click', () => { state.advanced = !state.advanced; renderValues(); });
    dom.sexSeg.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-sex]');
      if (!btn) return;
      state.sex = btn.getAttribute('data-sex') === 'female' ? 'female' : 'male';
      renderValues();
    });
    document.getElementById('ageMinus').addEventListener('click', () => { state.age = clamp(state.age - 1, 13, 90); renderValues(); });
    document.getElementById('agePlus').addEventListener('click', () => { state.age = clamp(state.age + 1, 13, 90); renderValues(); });
    const bwStep = () => (state.unit === 'lb' ? 2 : 1);
    document.getElementById('bwMinus').addEventListener('click', () => { state.bodyweight = clamp(Math.round((state.bodyweight - bwStep()) * 10) / 10, 30, 400); renderValues(); });
    document.getElementById('bwPlus').addEventListener('click', () => { state.bodyweight = clamp(Math.round((state.bodyweight + bwStep()) * 10) / 10, 30, 400); renderValues(); });
    dom.copyBtn.addEventListener('click', copyResult);
    document.getElementById('useLoc').addEventListener('click', useLocation);
    document.querySelectorAll('.tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => switchTab(tabBtn.getAttribute('data-tab')));
    });
    dom.rankBtn.addEventListener('click', fetchRank);

    const prefs = readPrivacyPreferences();
    if (prefs && prefs.location) {
      useLocation();
    }
  }

  document.addEventListener('DOMContentLoaded', setupBrowser);
})(typeof window !== 'undefined' ? window : globalThis);
