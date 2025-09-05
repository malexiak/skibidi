(function(){
  const { createClient } = supabase;
  const cfg = window.APP_CONFIG;
  const client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const els = {
    gate: document.getElementById('auth-gate'),
    pwd: document.getElementById('password'),
    login: document.getElementById('loginBtn'),
    msg: document.getElementById('auth-msg'),
    content: document.getElementById('content'),
    tracks: document.getElementById('tracks'),
    logout: document.getElementById('logoutBtn'),
    userEmail: document.getElementById('userEmail')
  };

async function requireSession() {
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    els.gate.classList.add('hidden');
    els.content.classList.remove('hidden');

    let emailToShow = session.user.email;
    if (emailToShow === 'pandus.info@gmail.com') {
      emailToShow = 'agatach06@gmail.com';
    }
    els.userEmail.textContent = emailToShow;

    await loadTracks();
  } else {
    els.gate.classList.remove('hidden');
    els.content.classList.add('hidden');
  }
}


  els.login.addEventListener('click', async () => {
    els.login.disabled = true;
    els.msg.textContent = 'Logowanie...';
    const password = els.pwd.value;
    const email = cfg.LISTENER_EMAIL;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      els.msg.textContent = 'Błędne hasło albo konto nie istnieje.';
    } else {
      els.msg.textContent = '';
      await requireSession();
    }
    els.login.disabled = false;
  });

  els.logout.addEventListener('click', async () => {
    await client.auth.signOut();
    location.reload();
  });

  async function loadTracks(){
    els.tracks.innerHTML = 'Ładowanie...';
    const { data, error } = await client
      .from('tracks')
      .select('id,title,file_path,release_at,created_at');

    if (error) {
      els.tracks.innerHTML = '<p class="muted">Błąd ładowania.</p>';
      return;
    }

    const now = new Date();
    const upcoming = [];
    const available = [];

    data.forEach(tr => {
      const release = new Date(tr.release_at);
      if (release.getTime() > now.getTime()) {
        upcoming.push(tr);
      } else {
        available.push(tr);
      }
    });

    upcoming.sort((a,b) => new Date(a.release_at) - new Date(b.release_at));

    available.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    const sortedTracks = [...upcoming, ...available];

    els.tracks.innerHTML = '';

    sortedTracks.forEach(tr => {
      const card = document.createElement('div');
      card.className = 'card-item';

      const release = new Date(tr.release_at);
      const beforeRelease = release.getTime() > now.getTime();

      const title = document.createElement('h3');
      title.textContent = tr.title;

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = beforeRelease ? 'Premiera wkrótce' : 'Dostępne';

      const timer = document.createElement('div');
      timer.className = 'timer muted';

      const btn = document.createElement('button');
      btn.textContent = beforeRelease ? 'Jeszcze troche cipo' : 'Pobierz';
      btn.disabled = beforeRelease;

      card.appendChild(title);
      card.appendChild(badge);
      card.appendChild(timer);
      card.appendChild(btn);
      els.tracks.appendChild(card);

      function updateTimer(){
        const now = new Date();
        const diff = release.getTime() - now.getTime();
        if (diff <= 0){
          timer.textContent = 'Już dostępne';
          btn.disabled = false;
          btn.textContent = 'Pobierz';
          return;
        }
        const s = Math.floor(diff / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400)/3600);
        const m = Math.floor((s % 3600)/60);
        const sec = s % 60;
        timer.textContent = `${d}d ${h}h ${m}m ${sec}s`;
        requestAnimationFrame(updateTimer);
      }
      updateTimer();

btn.addEventListener('click', () => {
  if (!beforeRelease) {
    window.location.href = `track.html?id=${tr.id}`;
  }
});


    });
  }

  requireSession();
})();
