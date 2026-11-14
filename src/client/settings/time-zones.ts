/** "UTC+7" for Asia/Bangkok, right now (daylight saving time included). */
function utcOffset(timeZone: string) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts()
    .find((part) => part.type === "timeZoneName")?.value;
  return (offset ?? "GMT").replace("GMT", "UTC");
}

let timeZones: { value: string; label: string }[] | null = null;

/** Every IANA time zone the browser knows, labelled like "Asia/Bangkok (UTC+7)". Built once. */
export function timeZoneOptions(current: string) {
  timeZones ??= Intl.supportedValuesOf("timeZone").map((zone) => ({ value: zone, label: `${zone} (${utcOffset(zone)})` }));
  // The saved zone may be one the browser does not list, e.g. "UTC".
  if (timeZones.some((zone) => zone.value === current)) return timeZones;
  return [{ value: current, label: `${current} (${utcOffset(current)})` }, ...timeZones];
}
