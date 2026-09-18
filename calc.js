// Arbetarjul – beräkningsmotor (delas mellan sidan och testskript)
(function (root) {
  const DAY = 86400000;
  const d = (y, m, day) => new Date(Date.UTC(y, m - 1, day));
  const add = (date, n) => new Date(date.getTime() + n * DAY);
  const iso = (date) => date.toISOString().slice(0, 10);
  const dow = (date) => (date.getUTCDay() + 6) % 7; // 0 = måndag … 6 = söndag
  const WD = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];
  const WDS = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'];
  const MON = ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451), month = Math.floor((h + l - 7 * m + 114) / 31),
      day = ((h + l - 7 * m + 114) % 31) + 1;
    return d(y, month, day);
  }
  function satBetween(y, m, from) { // första lördag fr.o.m. datum
    let x = d(y, m, from); while (dow(x) !== 5) x = add(x, 1); return x;
  }

  // Helgdagar och de facto-lediga aftnar för ett år
  function holidays(y) {
    const e = easter(y);
    const mid = satBetween(y, 6, 20);
    const allh = satBetween(y, 10, 31);
    return [
      { name: 'Nyårsdagen', date: d(y, 1, 1), kind: 'helgdag', group: 'nyår' },
      { name: 'Trettondedag jul', date: d(y, 1, 6), kind: 'helgdag', group: 'jul' },
      { name: 'Långfredagen', date: add(e, -2), kind: 'helgdag', group: 'påsk' },
      { name: 'Påskdagen', date: e, kind: 'helgdag', group: 'påsk' },
      { name: 'Annandag påsk', date: add(e, 1), kind: 'helgdag', group: 'påsk' },
      { name: 'Första maj', date: d(y, 5, 1), kind: 'helgdag', group: 'vår' },
      { name: 'Kristi himmelsfärdsdag', date: add(e, 39), kind: 'helgdag', group: 'vår' },
      { name: 'Pingstdagen', date: add(e, 49), kind: 'helgdag', group: 'vår' },
      { name: 'Nationaldagen', date: d(y, 6, 6), kind: 'helgdag', group: 'vår', national: true },
      { name: 'Midsommarafton', date: add(mid, -1), kind: 'afton', group: 'sommar' },
      { name: 'Midsommardagen', date: mid, kind: 'helgdag', group: 'sommar' },
      { name: 'Alla helgons dag', date: allh, kind: 'helgdag', group: 'höst' },
      { name: 'Julafton', date: d(y, 12, 24), kind: 'afton', group: 'jul' },
      { name: 'Juldagen', date: d(y, 12, 25), kind: 'helgdag', group: 'jul' },
      { name: 'Annandag jul', date: d(y, 12, 26), kind: 'helgdag', group: 'jul' },
      { name: 'Nyårsafton', date: d(y, 12, 31), kind: 'afton', group: 'nyår' },
    ];
  }

  const cache = new Map();
  // Karta iso -> helgdag för år y-1..y+1
  function holidayMap(y) {
    if (cache.has(y)) return cache.get(y);
    const m = new Map();
    for (const yy of [y - 1, y, y + 1]) for (const h of holidays(yy)) m.set(iso(h.date), h);
    cache.set(y, m); return m;
  }

  // Klassificera en enskild dag
  function dayInfo(date, y) {
    const hm = holidayMap(y);
    const h = hm.get(iso(date));
    const weekend = dow(date) >= 5;
    const free = !!h || weekend;
    let klam = false;
    if (!free) {
      const p = add(date, -1), n = add(date, 1);
      const pf = !!hm.get(iso(p)) || dow(p) >= 5;
      const nf = !!hm.get(iso(n)) || dow(n) >= 5;
      klam = pf && nf;
    }
    return { date, iso: iso(date), dow: dow(date), weekend, holiday: h || null, klam };
  }

  function range(from, to, y) {
    const out = []; for (let x = from; x <= to; x = add(x, 1)) out.push(dayInfo(x, y)); return out;
  }

  // Räkna lediga vardagar i ett intervall
  function count(days, klam) {
    let red = 0, k = 0;
    for (const x of days) {
      if (x.weekend) continue;
      if (x.holiday) red++;
      else if (x.klam) k++;
    }
    return { red, klam: k, total: red + (klam ? k : 0) };
  }

  // Julperioden: 23 dec – 7 jan
  function julDays(y) { return range(d(y, 12, 23), d(y + 1, 1, 7), y); }
  function julCount(y, klam) { return count(julDays(y), klam); }
  function yearDays(y) { return range(d(y, 1, 1), d(y, 12, 31), y); }
  function yearCount(y, klam) { return count(yearDays(y), klam); }

  // Referens: utfall för de sju möjliga veckodagarna för julafton
  function tiers(klam) {
    const vals = [];
    for (let y = 2001; y <= 2028; y++) { // 28-årscykel täcker alla veckodagar
      const w = dow(d(y, 12, 24));
      if (!vals[w]) vals[w] = { w, total: julCount(y, klam).total, year: y };
    }
    const sorted = vals.slice().sort((a, b) => b.total - a.total);
    return { byWeekday: vals, sorted, high: sorted[1].total, low: sorted[4].total };
  }
  const CATS = {
    arbetar: { key: 'arbetar', name: 'arbetarjul', def: 'en arbetarjul', plural: 'arbetarjular' },
    grasosse: { key: 'grasosse', name: 'gråsossejul', def: 'en gråsossejul', plural: 'gråsossejular' },
    arbetsgivar: { key: 'arbetsgivar', name: 'arbetsgivarjul', def: 'en arbetsgivarjul', plural: 'arbetsgivarjular' },
  };
  function category(y, klam) {
    const t = tiers(klam), c = julCount(y, klam).total;
    if (c >= t.high) return CATS.arbetar;
    if (c <= t.low) return CATS.arbetsgivar;
    return CATS.grasosse;
  }
  function julafton(y) { return dow(d(y, 12, 24)); }

  // Semesterdagar som krävs för att vara ledig 24 dec – 6 jan, och hur lång sammanhängande ledighet det ger
  function stretch(y, klam) {
    const days = julDays(y);
    const core = days.filter(x => x.iso >= `${y}-12-24` && x.iso <= `${y + 1}-01-06`);
    const need = core.filter(x => !x.weekend && !x.holiday && !(klam && x.klam)).length;
    // förläng med lediga dagar (helg/helgdag/klämdag) runt kärnan
    let start = d(y, 12, 24), end = d(y + 1, 1, 6);
    const isFree = (x) => { const i = dayInfo(x, y); return i.weekend || i.holiday || (klam && i.klam); };
    while (isFree(add(start, -1))) start = add(start, -1);
    while (isFree(add(end, 1))) end = add(end, 1);
    const len = Math.round((end - start) / DAY) + 1;
    return { need, start, end, len };
  }

  function fmt(date, withYear) {
    return `${date.getUTCDate()} ${MON[date.getUTCMonth()]}${withYear ? ' ' + date.getUTCFullYear() : ''}`;
  }

  root.AJ = { d, add, iso, dow, WD, WDS, MON, fmt, easter, holidays, dayInfo, range, count,
    julDays, julCount, yearDays, yearCount, tiers, category, CATS, julafton, stretch };
})(typeof module !== 'undefined' ? module.exports : window);
