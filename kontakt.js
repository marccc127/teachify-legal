(() => {
  const element = id => document.getElementById(id);
  const form = element('kontakt-formular');
  if (!form) return;
  const email = element('kontakt-email');
  const nachricht = element('kontakt-nachricht');
  const felder = element('kontakt-felder');
  const senden = element('kontakt-senden');
  const gestartet = Date.now();
  let zustand = 'bereit';
  const reduziert = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const warten = ms => reduziert() ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms));

  function meldung(id, text) {
    element(id).textContent = text;
    const container = id === 'kontakt-fehlertext' ? 'kontakt-fehler' : id.replace('-fehler', '-meldung');
    element(container).classList.toggle('sichtbar', Boolean(text));
  }

  function feldfehler(feld, text) {
    const id = `${feld.id}-fehler`;
    meldung(id, text);
    if (text) {
      feld.setAttribute('aria-invalid', 'true');
      feld.setAttribute('aria-describedby', id);
    } else {
      feld.removeAttribute('aria-invalid');
      feld.removeAttribute('aria-describedby');
    }
  }

  function sendestatus(aktiv) {
    senden.disabled = aktiv;
    felder.disabled = aktiv;
    form.setAttribute('aria-busy', String(aktiv));
    senden.setAttribute('aria-label', aktiv ? 'Wird gesendet …' : 'Nachricht senden');
    element('kontakt-knopftext').textContent = 'Wird gesendet …';
    senden.classList.toggle('sendet', aktiv);
  }

  async function erfolg() {
    const wechsel = element('kontakt-wechsel');
    const dank = element('kontakt-erfolg');
    wechsel.style.height = `${wechsel.getBoundingClientRect().height}px`;
    form.classList.add('verschwindet');
    await warten(240);
    form.hidden = true;
    dank.hidden = false;
    element('kontakt-danke').textContent = 'Danke, deine Nachricht ist angekommen.';
    wechsel.style.height = `${dank.scrollHeight}px`;
    requestAnimationFrame(() => dank.classList.add('sichtbar'));
    await warten(240);
    wechsel.style.height = 'auto';
    dank.focus();
  }

  nachricht.addEventListener('input', () => {
    const rest = element('kontakt-rest');
    rest.hidden = nachricht.value.length < 3800;
    rest.textContent = rest.hidden ? '' : `noch ${4000 - nachricht.value.length} Zeichen`;
  });

  sendestatus(false);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (zustand !== 'bereit') return;
    const adresse = email.value.trim();
    const text = nachricht.value.trim();
    const emailFalsch = adresse.length < 3 || adresse.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)
      || /[\u0000-\u001f\u007f]|\p{Surrogate}/u.test(email.value);
    const textFalsch = text.length < 10 || text.length > 4000 || /[\u0000-\u0009\u000b-\u001f\u007f]|\p{Surrogate}/u.test(nachricht.value);
    feldfehler(email, emailFalsch ? 'Bitte gib eine gültige E-Mail-Adresse ein.' : '');
    feldfehler(nachricht, textFalsch ? 'Bitte schreib mindestens 10 Zeichen.' : '');
    meldung('kontakt-fehlertext', '');
    if (emailFalsch || textFalsch) { (emailFalsch ? email : nachricht).focus(); return; }
    zustand = 'sendet';
    sendestatus(true);
    let fehler = 'Senden hat nicht geklappt. Versuche es noch einmal oder schreib an kontakt@teachify-studio.de.';
    try {
      const restzeit = Math.max(0, 3000 - (Date.now() - gestartet));
      if (restzeit > 0) await new Promise(resolve => setTimeout(resolve, restzeit));
      const response = await fetch('https://wdievwrnwtmvktzupzhy.supabase.co/functions/v1/kontakt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ version: 1, email: adresse, nachricht: text, website: element('kontakt-website').value, gestartet }),
      });
      if (response.status === 429) fehler = 'Gerade kommen sehr viele Nachrichten an. Versuche es in einer Stunde noch einmal oder schreib an kontakt@teachify-studio.de.';
      if (response.status === 200 && (await response.json()).ok === true) {
        zustand = 'erfolg';
        await erfolg();
        return;
      }
    } catch {}
    zustand = 'bereit';
    sendestatus(false);
    meldung('kontakt-fehlertext', fehler);
  });
})();
