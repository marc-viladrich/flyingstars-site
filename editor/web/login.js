const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
const button = form.querySelector('button');

function nextPath() {
  const next = new URL(location.href).searchParams.get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(next)) return '/editor/';
  const target = new URL(next, location.origin);
  if (target.origin !== location.origin || target.pathname === '/editor/login') return '/editor/';
  // The preview of the saved draft stays the preview (its own plain pages behind the same login).
  if (target.pathname === '/vorschau' || target.pathname.startsWith('/vorschau/')) return target.pathname + target.search;
  // A login always leads into the editor; a site page opens there instead of on its own.
  if (target.pathname === '/editor' || target.pathname.startsWith('/editor/')) return '/editor/' + target.search;
  return target.pathname === '/' ? '/editor/' : '/editor/?page=' + encodeURIComponent(target.pathname);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true; button.textContent = 'Anmeldung läuft …'; error.hidden = true;
  try {
    const response = await fetch('/editor/api/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'same-origin',
      body: JSON.stringify({username: form.elements.username.value, password: form.elements.password.value, remember: form.elements.remember.checked}),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Anmeldung fehlgeschlagen.');
    form.elements.password.value = '';
    location.assign(nextPath());
  } catch (failure) {
    error.textContent = failure instanceof TypeError ? 'Verbindung fehlgeschlagen. Bitte erneut versuchen.' : failure.message;
    error.hidden = false; form.elements.password.value = ''; form.elements.password.focus();
  } finally { button.disabled = false; button.textContent = 'Anmelden'; }
});
