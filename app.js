(function initMy1RM(globalScope) {
  'use strict';

  const KG_PER_LB = 0.45359237;
  const PRIVACY_KEY = 'my1rm_privacy_preferences_v1';

  const LIFTS = [
    { id: 'squat', label: 'Squat' },
    { id: 'bench', label: 'Bench' },
    { id: 'deadlift', label: 'Deadlift' },
  ];

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
    const percentile = interpolatePercentile(adjustedRatio, STANDARDS[safeSex][lift]);
    return {
      ratio: round(ratio, 2),
      adjustedRatio: round(adjustedRatio, 2),
      percentile,
      ageBucket: ageBucket.label,
    };
  }

  function levelLabel(percentile) {
    if (percentile >= 90) return 'Elite benchmark';
    if (percentile >= 75) return 'Very strong';
    if (percentile >= 55) return 'Solid intermediate';
    if (percentile >= 30) return 'Developing';
    return 'Novice range';
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

  function readForm(form) {
    const values = {};
    new FormData(form).forEach((value, key) => {
      values[key] = value;
    });
    return values;
  }

  function renderResults(result, locationLabel) {
    const liftResults = document.getElementById('liftResults');
    const totalValue = document.getElementById('totalValue');
    const totalRatio = document.getElementById('totalRatio');
    const heroTotal = document.getElementById('heroTotal');
    const percentileLabel = document.getElementById('percentileLabel');
    const percentileFill = document.getElementById('percentileFill');
    const benchmarkCopy = document.getElementById('benchmarkCopy');

    liftResults.innerHTML = LIFTS.map((lift) => {
      const item = result.lifts[lift.id];
      return `
        <div class="result-item">
          <div>
            <span>${item.label}</span>
            <strong>${item.displayOneRm} ${result.unit}</strong>
          </div>
          <div>
            <span>${item.ratio}x BW</span>
            <span>p${item.percentile}</span>
          </div>
        </div>
      `;
    }).join('');

    totalValue.textContent = `${result.displayTotal} ${result.unit}`;
    totalRatio.textContent = `${result.totalRatio}x bodyweight`;
    heroTotal.textContent = String(Math.round(result.totalKg));
    percentileLabel.textContent = `${result.level} - p${result.totalPercentile}`;
    percentileFill.style.width = `${result.totalPercentile}%`;
    benchmarkCopy.textContent = `${locationLabel} - ${result.ageBucket} age band. This is a demo percentile model, not a verified local leaderboard.`;
  }

  function formatLocation(location) {
    if (!location || (!location.city && !location.country)) return 'Manual or unavailable';
    return [location.city, location.region, location.country].filter(Boolean).join(', ');
  }

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

  function setupBrowser() {
    const form = document.getElementById('calculatorForm');
    const locationLabel = document.getElementById('locationLabel');
    const useLocationButton = document.getElementById('useLocation');
    const copyButton = document.getElementById('copyResult');
    const consentBanner = document.getElementById('privacyConsent');
    const essentialOnlyButton = document.getElementById('essentialOnly');
    const allowLocationButton = document.getElementById('allowLocation');
    let currentResult = calculateProfile(readForm(form));
    let currentLocation = 'Manual or unavailable';

    function recalculate() {
      currentResult = calculateProfile(readForm(form));
      renderResults(currentResult, currentLocation);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      recalculate();
    });

    form.addEventListener('input', recalculate);

    copyButton.addEventListener('click', async () => {
      const text = `My1RM total: ${currentResult.displayTotal} ${currentResult.unit} (${currentResult.totalRatio}x BW), ${currentResult.level} p${currentResult.totalPercentile}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        document.getElementById('formNote').textContent = 'Result copied. Share it with the caveat that this is an estimate.';
      }
    });

    function loadLocationLabel() {
      locationLabel.textContent = 'Checking coarse location...';
      return fetchLocation().then((location) => {
      currentLocation = formatLocation(location);
      locationLabel.textContent = currentLocation;
      recalculate();
    });
    }

    function hideConsent() {
      if (consentBanner) consentBanner.hidden = true;
    }

    function acceptEssentialOnly() {
      savePrivacyPreferences({ location: false });
      currentLocation = 'Manual or unavailable';
      locationLabel.textContent = currentLocation;
      hideConsent();
      recalculate();
    }

    function allowLocation() {
      savePrivacyPreferences({ location: true });
      hideConsent();
      loadLocationLabel();
    }

    useLocationButton.addEventListener('click', allowLocation);
    essentialOnlyButton.addEventListener('click', acceptEssentialOnly);
    allowLocationButton.addEventListener('click', allowLocation);

    const preferences = readPrivacyPreferences();
    if (!preferences) {
      consentBanner.hidden = false;
    } else if (preferences.location) {
      loadLocationLabel();
    }

    recalculate();
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

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', setupBrowser);
  }
})(typeof window !== 'undefined' ? window : globalThis);
