(async function(){
  const { createClient } = supabase;
  const cfg = window.APP_CONFIG;
  const client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const titleEl = document.getElementById('trackTitle');
  const player = document.getElementById('player');
  const downloadBtn = document.getElementById('downloadBtn');
  const releaseInfo = document.getElementById('releaseInfo');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if(!id){
    titleEl.textContent = 'Nie znaleziono utworu';
    downloadBtn.disabled = true;
    return;
  }

  const { data: track, error } = await client.from('tracks').select('*').eq('id', id).single();
  if(error || !track){
    titleEl.textContent = 'Błąd ładowania utworu';
    downloadBtn.disabled = true;
    return;
  }

  titleEl.textContent = track.title;
  const releaseDate = new Date(track.release_at);
  releaseInfo.textContent = `Premiera: ${releaseDate.toLocaleString()}`;

  const { data: urlData, error: urlErr } = await client.storage
    .from('songs')
    .createSignedUrl(track.file_path, 3600);

  if(urlErr){
    titleEl.textContent = 'Błąd ładowania pliku';
    downloadBtn.disabled = true;
    return;
  }

  player.src = urlData.signedUrl;

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Przygotowuję...';

    try {
      const res = await fetch(urlData.signedUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = track.title + '.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      downloadBtn.textContent = 'Pobierz ponownie';
    } catch(e){
      alert('Błąd pobierania: ' + e.message);
      downloadBtn.textContent = 'Pobierz';
    }

    downloadBtn.disabled = false;
  });
})();
