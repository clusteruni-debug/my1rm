(function initMy1RM(globalScope) {
  'use strict';

  const KG_PER_LB = 0.45359237;
  const LANG_KEY = 'my1rm_lang_v1';
  const INTERNAL_KEY = 'my1rm_internal_device_v1';
  const ANALYTICS_SESSION_KEY = 'my1rm_analytics_session_v1';
  const ANALYTICS_SENT_KEY = 'my1rm_analytics_sent_v1';

  const SBD_LIFTS = [
    { id: 'squat', label: 'Squat' },
    { id: 'bench', label: 'Bench Press' },
    { id: 'deadlift', label: 'Deadlift' },
  ];
  const LIFTS = SBD_LIFTS;

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
    return {
      ratio: round(ratio, 2),
      adjustedRatio: round(adjustedRatio, 2),
      percentile: table ? interpolatePercentile(adjustedRatio, table) : null,
      ageBucket: ageBucket.label,
    };
  }

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
      if (oneRmKg > 0 && score.percentile != null) {
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

  const api = {
    KG_PER_LB,
    estimateOneRepMax,
    calculateProfile,
    scoreLift,
    interpolatePercentile,
    toKg,
    fromKg,
    getAgeBucket,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.My1RM = api;

  if (typeof document === 'undefined') return;

  const I18N = {
    ko: {
      title: '3대 추정', reset: '초기화', lift: '종목', weight: '무게', reps: '횟수', oneRm: '예상 1RM',
      squat: '스쿼트', bench: '벤치프레스', deadlift: '데드리프트', total: '예상 3대',
      formula: '계산식', formulaNote: 'Epley · Brzycki · Lombardi 평균', percentile: '예상 백분위',
      demoNote: '데모 데이터 기준', sex: '성별', age: '나이', bodyweight: '체중', select: '선택',
      male: '남', female: '여', rank: '참여자 순위', rankNote: '기록 제출 후 표시',
      rankButton: '순위 보기', rankLoading: '제출 중', rankError: '제출 실패', rankFirst: '첫 기록',
      rankTop: '상위', rankCohort: '동일 성별·나이대', footer: '추정 도구 · 코칭·의료·판정 조언 아님',
      privacy: '개인정보', terms: '약관', methodology: '계산 방식',
    },
    en: {
      title: 'SBD estimate', reset: 'Reset', lift: 'Lift', weight: 'Weight', reps: 'Reps', oneRm: 'Est. 1RM',
      squat: 'Squat', bench: 'Bench press', deadlift: 'Deadlift', total: 'Estimated total',
      formula: 'Formula', formulaNote: 'Average of Epley · Brzycki · Lombardi', percentile: 'Est. percentile',
      demoNote: 'Demo data', sex: 'Sex', age: 'Age', bodyweight: 'Bodyweight', select: 'Select',
      male: 'M', female: 'F', rank: 'Participant rank', rankNote: 'Shown after submitting',
      rankButton: 'See rank', rankLoading: 'Submitting', rankError: 'Submit failed', rankFirst: 'First record',
      rankTop: 'Top', rankCohort: 'Same sex and age band', footer: 'Estimate only · not coaching, medical, or judging advice',
      privacy: 'Privacy', terms: 'Terms', methodology: 'Methodology',
    },
  };

  const state = { unit: 'kg' };
  const dom = {};
  const inFlightEvents = new Set();
  let lang = 'ko';
  let internalFallback = false;
  let sessionIdFallback = null;
  let sentFallback = new Set();
  let rankSubmitting = false;
  let rankSubmitted = false;
  let lastRankResult = null;

  function detectLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'ko' || saved === 'en') return saved;
    } catch (_error) {
      // Browser storage is optional.
    }
    const browserLanguage = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
    return String(browserLanguage).toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'ko';
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_error) {
      // Browser storage is optional.
    }
  }

  function applyInternalQueryFlag() {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('internal');
    if (flag !== '1' && flag !== '0') return;

    internalFallback = flag === '1';
    try {
      if (flag === '1') localStorage.setItem(INTERNAL_KEY, '1');
      else localStorage.removeItem(INTERNAL_KEY);
    } catch (_error) {
      // The current page still follows the requested flag.
    }

    url.searchParams.delete('internal');
    const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
    try {
      window.history.replaceState(null, '', cleanUrl);
    } catch (_error) {
      // URL cleanup is cosmetic.
    }
  }

  function isInternalDevice() {
    try {
      return localStorage.getItem(INTERNAL_KEY) === '1';
    } catch (_error) {
      return internalFallback;
    }
  }

  function newSessionId() {
    if (globalScope.crypto && typeof globalScope.crypto.randomUUID === 'function') {
      return globalScope.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  }

  function analyticsSessionId() {
    try {
      let value = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
      if (!value) {
        value = newSessionId();
        sessionStorage.setItem(ANALYTICS_SESSION_KEY, value);
      }
      return value;
    } catch (_error) {
      if (!sessionIdFallback) sessionIdFallback = newSessionId();
      return sessionIdFallback;
    }
  }

  function sentEvents() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ANALYTICS_SENT_KEY) || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch (_error) {
      return new Set(sentFallback);
    }
  }

  function rememberEvent(name) {
    const sent = sentEvents();
    sent.add(name);
    sentFallback = sent;
    try {
      sessionStorage.setItem(ANALYTICS_SENT_KEY, JSON.stringify(Array.from(sent)));
    } catch (_error) {
      // In-memory deduplication remains active.
    }
  }

  async function trackMilestone(eventName) {
    if (isInternalDevice()) return false;
    const sent = sentEvents();
    if (sent.has(eventName) || inFlightEvents.has(eventName)) return false;

    inFlightEvents.add(eventName);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session_id: analyticsSessionId(),
          event_name: eventName,
        }),
        keepalive: true,
      });
      if (!response.ok) return false;
      rememberEvent(eventName);
      return true;
    } catch (_error) {
      return false;
    } finally {
      inFlightEvents.delete(eventName);
    }
  }

  function fmt(value, places = 1) {
    const rounded = round(value, places);
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  function readNumber(id) {
    const value = Number(document.getElementById(id).value);
    return Number.isFinite(value) ? value : 0;
  }

  function buildInput() {
    return {
      unit: state.unit,
      sex: dom.sex.value,
      age: dom.age.value,
      bodyweight: dom.bodyweight.value,
      squatWeight: dom.squatWeight.value,
      squatReps: dom.squatReps.value,
      benchWeight: dom.benchWeight.value,
      benchReps: dom.benchReps.value,
      deadliftWeight: dom.deadliftWeight.value,
      deadliftReps: dom.deadliftReps.value,
    };
  }

  function validProfileFields() {
    const age = readNumber('age');
    return (dom.sex.value === 'male' || dom.sex.value === 'female')
      && age >= 13 && age <= 90
      && readNumber('bodyweight') > 0;
  }

  function render() {
    const profile = calculateProfile(buildInput());
    const liftComplete = {};

    LIFTS.forEach((lift) => {
      const complete = readNumber(`${lift.id}Weight`) > 0;
      liftComplete[lift.id] = complete;
      const result = profile.lifts[lift.id];
      document.querySelector(`[data-estimate="${lift.id}"]`).textContent = complete
        ? `${fmt(result.displayOneRm, state.unit === 'lb' ? 0 : 1)} ${state.unit}`
        : '—';
    });

    const allLiftsComplete = LIFTS.every((lift) => liftComplete[lift.id]);
    dom.totalValue.textContent = allLiftsComplete ? fmt(profile.displayTotal, state.unit === 'lb' ? 0 : 1) : '—';
    dom.totalUnit.textContent = state.unit;

    const profileComplete = allLiftsComplete && validProfileFields();
    dom.percentileValue.textContent = profileComplete ? String(profile.totalPercentile) : '—';
    dom.rankButton.disabled = rankSubmitting || rankSubmitted || !profileComplete;
    dom.rankButton.textContent = rankSubmitting ? t('rankLoading') : t('rankButton');

    if (allLiftsComplete) trackMilestone('estimate_completed');
    if (profileComplete) trackMilestone('percentile_viewed');
  }

  function applyCopy() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    dom.langToggle.textContent = lang === 'ko' ? 'EN' : '한';
    dom.unitToggle.textContent = state.unit;
    render();
    if (!dom.rankResult.hidden && lastRankResult) renderRank(lastRankResult);
  }

  function populateReps() {
    LIFTS.forEach((lift) => {
      const select = document.getElementById(`${lift.id}Reps`);
      for (let reps = 1; reps <= 15; reps += 1) {
        const option = document.createElement('option');
        option.value = String(reps);
        option.textContent = String(reps);
        option.selected = reps === 5;
        select.appendChild(option);
      }
    });
  }

  function convertUnits() {
    const nextUnit = state.unit === 'kg' ? 'lb' : 'kg';
    ['squatWeight', 'benchWeight', 'deadliftWeight', 'bodyweight'].forEach((id) => {
      const input = document.getElementById(id);
      if (!input.value) return;
      const valueKg = toKg(input.value, state.unit);
      const converted = fromKg(valueKg, nextUnit);
      input.value = nextUnit === 'lb' ? String(Math.round(converted)) : fmt(converted, 1);
    });
    state.unit = nextUnit;
    document.querySelectorAll('[data-unit]').forEach((node) => { node.textContent = state.unit; });
    applyCopy();
  }

  function resetCalculator() {
    ['squatWeight', 'benchWeight', 'deadliftWeight', 'bodyweight', 'age'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    LIFTS.forEach((lift) => { document.getElementById(`${lift.id}Reps`).value = '5'; });
    dom.sex.value = '';
    invalidateRankResult();
    render();
  }

  function invalidateRankResult() {
    rankSubmitted = false;
    lastRankResult = null;
    dom.rankResult.hidden = true;
  }

  function renderRank(data) {
    lastRankResult = data;
    dom.rankResult.hidden = false;
    dom.rankResult.classList.remove('is-error');
    if (!data || data.error) {
      dom.rankValue.textContent = t('rankError');
      dom.rankMeta.textContent = '';
      dom.rankResult.classList.add('is-error');
      return;
    }
    if (data.percentile == null || data.cohortTotal <= 1) {
      dom.rankValue.textContent = t('rankFirst');
      dom.rankMeta.textContent = '';
      return;
    }
    const top = Math.max(1, 100 - data.percentile);
    dom.rankValue.textContent = `${t('rankTop')} ${top}%`;
    dom.rankMeta.textContent = lang === 'ko'
      ? `${t('rankCohort')} ${data.cohortTotal}명`
      : `${t('rankCohort')} · ${data.cohortTotal}`;
  }

  async function fetchRank() {
    if (dom.rankButton.disabled || rankSubmitting) return;
    const profile = calculateProfile(buildInput());
    rankSubmitting = true;
    render();
    trackMilestone('rank_submit_attempt');

    try {
      const response = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          total_kg: profile.totalKg,
          squat_kg: profile.lifts.squat.oneRmKg,
          bench_kg: profile.lifts.bench.oneRmKg,
          deadlift_kg: profile.lifts.deadlift.oneRmKg,
          sex: dom.sex.value,
          age_bucket: getAgeBucket(dom.age.value).label,
        }),
      });
      if (!response.ok) throw new Error('rank request failed');
      const rankData = await response.json();
      renderRank(rankData);
      rankSubmitted = true;
      trackMilestone('rank_submit_success');
    } catch (_error) {
      renderRank({ error: true });
      trackMilestone('rank_submit_failure');
    } finally {
      rankSubmitting = false;
      render();
    }
  }

  function setupBrowser() {
    applyInternalQueryFlag();
    lang = detectLang();

    LIFTS.forEach((lift) => {
      dom[`${lift.id}Weight`] = document.getElementById(`${lift.id}Weight`);
      dom[`${lift.id}Reps`] = document.getElementById(`${lift.id}Reps`);
    });
    dom.sex = document.getElementById('sex');
    dom.age = document.getElementById('age');
    dom.bodyweight = document.getElementById('bodyweight');
    dom.totalValue = document.getElementById('totalValue');
    dom.totalUnit = document.getElementById('totalUnit');
    dom.percentileValue = document.getElementById('percentileValue');
    dom.rankButton = document.getElementById('rankButton');
    dom.rankResult = document.getElementById('rankResult');
    dom.rankValue = document.getElementById('rankValue');
    dom.rankMeta = document.getElementById('rankMeta');
    dom.langToggle = document.getElementById('langToggle');
    dom.unitToggle = document.getElementById('unitToggle');

    populateReps();

    document.querySelectorAll('[data-calculator-input]').forEach((control) => {
      const eventName = control.tagName === 'SELECT' ? 'change' : 'input';
      control.addEventListener(eventName, () => {
        invalidateRankResult();
        trackMilestone('calculator_started');
        render();
      });
    });

    document.getElementById('resetButton').addEventListener('click', resetCalculator);
    dom.langToggle.addEventListener('click', () => {
      setLang(lang === 'ko' ? 'en' : 'ko');
      applyCopy();
    });
    dom.unitToggle.addEventListener('click', convertUnits);
    dom.rankButton.addEventListener('click', fetchRank);

    setLang(lang);
    applyCopy();
    trackMilestone('page_view');
  }

  document.addEventListener('DOMContentLoaded', setupBrowser);
})(typeof window !== 'undefined' ? window : globalThis);