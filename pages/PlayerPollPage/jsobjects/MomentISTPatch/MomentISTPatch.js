export default {
  applied: false,

  apply() {
    if (this.applied) return "Moment IST patch already applied";

    const IST_OFFSET_MIN = 330;

    // moment should exist globally in Appsmith
    const orig = globalThis.moment;
    if (typeof orig !== "function") {
      return "Moment is not available on globalThis (patch not applied)";
    }

    // If string ends with timezone info, do NOT override it.
    function hasExplicitTZ(s) {
      return /([zZ]|[+-]\d{2}:?\d{2})$/.test(String(s).trim());
    }

    // Your problematic stored formats (timezone-less wall clock)
    function isWallClockString(s) {
      const t = String(s).trim();
      return (
        /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(t) &&
        !hasExplicitTZ(t)
      );
    }

    function wrappedMoment(...args) {
      // moment() -> IST now
      if (args.length === 0) {
        return orig().utcOffset(IST_OFFSET_MIN);
      }

      const input = args[0];

      // If timezone-less wall clock string, interpret as IST wall time
      if (typeof input === "string" && isWallClockString(input)) {
        const m = orig(...args);
        return m && m.isValid ? (m.isValid() ? m.utcOffset(IST_OFFSET_MIN, true) : m) : m;
      }

      // Otherwise keep original behavior
      return orig(...args);
    }

    // Copy static properties (duration, ISO_8601, etc.)
    Object.assign(wrappedMoment, orig);

    // Preserve true UTC behavior
    wrappedMoment.utc = (...args) => orig.utc(...args);

    // Apply globally
    globalThis.moment = wrappedMoment;

    this.applied = true;
    return "Moment IST patch applied";
  }
};
