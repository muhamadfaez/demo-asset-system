const formatters = new Map<string, Intl.DateTimeFormat>();

// Constructing ICU formatters for every table cell can consume a Worker's CPU
// allowance. Reuse immutable formatters, with a bound on retained variants.
export function getDateFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([locale, options]);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    if (formatters.size >= 32) formatters.clear();
    formatters.set(key, formatter);
  }
  return formatter;
}
