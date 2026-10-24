/* Deterministic daily puzzles and grading. No browser or network dependencies. */
(function (root) {
  function hash(text) {
    let seed = 2166136261;
    for (const c of text) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
    return seed >>> 0;
  }
  function random(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
      n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, rng) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  const key = (r) => `${r.wiki}@${r.start ?? r.born}:${r.end ?? r.died}`;
  const mapSources = new Set([
    "Battle_of_Marathon", "Battle_of_Hastings", "Hagia_Sophia", "Baghdad",
    "Eruption_of_Mount_Vesuvius_in_79_AD", "Suez_Canal", "Wright_Flyer",
    "Pig_War_(1859)", "Treaty_of_Waitangi", "Fall_of_Constantinople",
    "Battle_of_Adwa", "Salt_March", "University_of_Bologna", "Jamestown,_Virginia",
  ]);
  const api = {
    localDay(date = new Date()) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    },
    daily(events, people, day) {
      const rng = random(hash("atlas-daily-v1:" + day));
      const puzzles = [];
      // A period overview's first year is not necessarily an event date.
      const exactEvents = events.filter((r) => !r.approx && r.start === r.end && r.start !== 0 &&
        r.start <= 2024 && Number.isInteger(r.start)).sort((a, b) => key(a).localeCompare(key(b)));
      const ordered = [];
      for (const r of shuffle(exactEvents, rng)) {
        if (ordered.every((old) => Math.abs(old.start - r.start) >= 20)) ordered.push(r);
        if (ordered.length === 3) break;
      }
      if (ordered.length === 3) {
        const correct = ordered.slice().sort((a, b) => a.start - b.start);
        let options = shuffle(ordered, rng);
        if (options.every((r, i) => r === correct[i])) options = [options[1], options[2], options[0]];
        puzzles.push({ kind: "order", id: "order:" + correct.map(key).join("|"), options, correct });
      }
      const place = shuffle(exactEvents.filter((r) => mapSources.has(r.wiki) &&
        Number.isFinite(r.lon) && Number.isFinite(r.lat)), rng)[0];
      if (place) puzzles.push({ kind: "place", id: "place:" + key(place) + `:${place.lon},${place.lat}:500`, record: place, tolerance: 500 });
      const exactPeople = people.filter((r) => !r.approx && Number.isInteger(r.born) &&
        Number.isInteger(r.died) && r.born < r.died).sort((a, b) => key(a).localeCompare(key(b)));
      const overlaps = [], apart = [];
      for (let i = 0; i < exactPeople.length; i++) for (let j = i + 1; j < exactPeople.length; j++) {
        const a = exactPeople[i], b = exactPeople[j];
        const from = Math.max(a.born, b.born), to = Math.min(a.died, b.died);
        if (to - from >= 20 && a.region !== b.region) overlaps.push({ people: [a, b], from, to });
        else if (from - to >= 20) apart.push({ people: [a, b] });
      }
      if (overlaps.length && apart.length >= 2) {
        const answer = shuffle(overlaps, rng)[0];
        const distractors = shuffle(apart, rng).slice(0, 2);
        const options = shuffle([answer, ...distractors], rng);
        let year = Math.floor((answer.from + answer.to) / 2);
        if (year === 0) year = answer.to >= 1 ? 1 : -1;
        puzzles.push({ kind: "overlap", id: "overlap:" + options.map((o) => o.people.map(key).join("+")).join("|"),
          options, correct: options.indexOf(answer), from: answer.from, to: answer.to, year });
      }
      return puzzles;
    },
    validAnswer(puzzle, answer) {
      if (!answer || typeof answer !== "object" || !Object.hasOwn(answer, "value")) return false;
      const value = answer.value;
      if (value === null) return true; // Explicit reveal without an attempt.
      if (puzzle.kind === "order") return Array.isArray(value) && value.length === 3 &&
        new Set(value).size === 3 && value.every((v) => puzzle.options.some((r) => key(r) === v));
      if (puzzle.kind === "overlap") return Number.isInteger(value) && value >= 0 && value < puzzle.options.length;
      return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) &&
        Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
    },
    grade(puzzle, answer, distance) {
      if (!api.validAnswer(puzzle, answer)) return null;
      if (answer.value === null) return false;
      if (puzzle.kind === "order") return puzzle.correct.every((r, i) => key(r) === answer.value[i]);
      if (puzzle.kind === "overlap") return answer.value === puzzle.correct;
      return distance(answer.value, [puzzle.record.lon, puzzle.record.lat]) <= puzzle.tolerance;
    },
    signature(puzzles) { return puzzles.map((p) => p.id).join("\n"); },
    readProgress(raw, day, puzzles) {
      try {
        if (!raw || raw.length > 32000) return puzzles.map(() => null);
        const data = JSON.parse(raw);
        if (data.day !== day || data.signature !== api.signature(puzzles) || !Array.isArray(data.answers))
          return puzzles.map(() => null);
        return puzzles.map((p, i) => api.validAnswer(p, data.answers[i]) ? data.answers[i] : null);
      } catch (_) { return puzzles.map(() => null); }
    },
    key,
  };
  if (typeof module === "object") module.exports = api;
  else root.HistoryChallengeCore = api;
})(typeof window === "object" ? window : globalThis);
