/** Leaves the app for another site, e.g. LINE's sign-in page. */
export function goToExternalPage(url: string) {
  window.location.assign(url);
}
