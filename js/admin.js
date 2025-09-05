(function(){
  const { createClient } = supabase;
  const cfg = window.APP_CONFIG;
  const client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const els = {
    auth: document.getElementById('auth'),
    adminEmail: document.getElementById('adminEmail'),
    adminPassword: document.getElementById('adminPassword'),
    adminLogin: document.getElementById('adminLogin'),
    adminAuthMsg: document.getElementById('adminAuthMsg'),
    panel: document.getElementById('adminPanel'),
    adminUserEmail: document.getElementById('adminUserEmail'),
    adminLogout: document.getElementById('adminLogout'),
    title: document.getElementById('trackTitle'),
    date: document.getElementById('trackDate'),
    file: document.getElementById('trackFile'),
    uploadBtn: document.getElementById('uploadBtn'),
    uploadMsg: document.getElementById('uploadMsg'),
    adminTracks: document.getElementById('adminTracks')
  };

  async function requireAdmin(){
    const { data: { session } } = await client.auth.getSession();
    if (!session){
      els.auth.classList.remove('hidden');
      els.panel.classList.add('hidden');
      return;
    }
    els.auth.classList.add('hidden');
    els.panel.classList.remove('hidden');
    els.adminUserEmail.textContent = session.user.email;
    await refreshList();
  }

  els.adminLogin.addEventListener('click', async () => {
    els.adminLogin.disabled = true;
    els.adminAuthMsg.textContent = 'Logowanie...';
    const email = els.adminEmail.value || cfg.ADMIN_EMAIL;
    const password = els.adminPassword.value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error){
      els.adminAuthMsg.textContent = 'Błąd logowania.';
    } else {
      els.adminAuthMsg.textContent = '';
      await requireAdmin();
    }
    els.adminLogin.disabled = false;
  });

  els.adminLogout.addEventListener('click', async () => {
    await client.auth.signOut();
    location.reload();
  });

  els.uploadBtn.addEventListener('click', async () => {
    const file = els.file.files[0];
    const title = els.title.value.trim();
    const releaseAt = els.date.value;
    if (!file || !title || !releaseAt){
      els.uploadMsg.textContent = 'Uzupełnij tytuł, datę i wybierz plik.';
      return;
    }
    els.uploadBtn.disabled = true;
    els.uploadMsg.textContent = 'Wysyłanie pliku...';

    const path = `${Date.now()}_${file.name.replace(/\s+/g,'_')}`;

    const up = await client.storage.from('songs').upload(path, file, { upsert: false });
    if (up.error){
      els.uploadMsg.textContent = 'Błąd uploadu: ' + up.error.message;
      els.uploadBtn.disabled = false;
      return;
    }

    const ins = await client.from('tracks').insert({
      title,
      file_path: path,
      release_at: new Date(releaseAt).toISOString()
    }).select().single();

    if (ins.error){
      els.uploadMsg.textContent = 'Błąd zapisu metadanych: ' + ins.error.message;
      els.uploadBtn.disabled = false;
      return;
    }

    els.uploadMsg.textContent = 'OK. Dodano.';
    els.title.value = '';
    els.date.value = '';
    els.file.value = '';
    els.uploadBtn.disabled = false;
    await refreshList();
  });

  async function refreshList(){
    const { data, error } = await client.from('tracks')
      .select('id,title,file_path,release_at,created_at')
      .order('created_at', { ascending: false });

    els.adminTracks.innerHTML = '';
    if (error){
      els.adminTracks.innerHTML = '<p class="muted">Błąd ładowania.</p>';
      return;
    }

    data.forEach(tr => {
      const div = document.createElement('div');
      div.className = 'card-item';
      const dt = new Date(tr.release_at);
      div.innerHTML = `
        <strong>${tr.title}</strong>
        <div class="muted">Premiera: ${dt.toLocaleString()}</div>
        <div class="muted">Plik: ${tr.file_path}</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button data-id="${tr.id}" class="del">Usuń</button>
        </div>
      `;
      els.adminTracks.appendChild(div);
      const delBtn = div.querySelector('.del');
      delBtn.addEventListener('click', async () => {
        if (!confirm('Usunąć tę pozycję?')) return;
        const { data: row } = await client.from('tracks').select('file_path').eq('id', tr.id).single();
        await client.from('tracks').delete().eq('id', tr.id);
        if (row && row.file_path){
          await client.storage.from('songs').remove([row.file_path]);
        }
        await refreshList();
      });
    });
  }

  requireAdmin();
})();
