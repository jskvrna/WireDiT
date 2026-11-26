// An explicit URL or a saved choice takes precedence over browser language.
(() => {
  const language = document.documentElement.lang;
  const choice = new URLSearchParams(location.search).get('lang');
  const valid = value => ['en', 'cs'].includes(value);
  let saved;
  try {
    if (valid(choice)) localStorage.setItem('wiredit-language', choice);
    saved = localStorage.getItem('wiredit-language');
  } catch {}
  const wantsCzech = /^cs(?:-|$)/i.test(navigator.languages?.[0] || navigator.language);
  const desired = valid(choice) ? choice : language === 'cs' ? 'cs' : valid(saved) ? saved : wantsCzech ? 'cs' : 'en';
  if (desired !== language) {
    const target = new URL(desired === 'cs' ? './cs/' : '../', location.href);
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
  }
})();
