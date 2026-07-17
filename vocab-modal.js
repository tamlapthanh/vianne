(function () {
  const modalEl = document.getElementById('vocabModal');
  const tableBody = document.querySelector('#vocab-table tbody');
  const playAllBtn = document.getElementById('vocab-play-all');
  const audioEl = document.getElementById('vocab-audio');

  let vocabList = [];
  let currentIndex = -1;
  let isPlayingAll = false;

  // Load file text
  async function loadVocabFromFile(page) {
    const url = global_const.PATH_TXT_DATA + `${page}`; 
    const res = await fetch(url);
    const text = await res.text();

    vocabList = text
      .split('\n')
      .map(line => line.trim())
      .filter(l => l && l.includes('/'))
      .map((l, idx) => {
        const [file, start, end, text, vn] = l.split('/');
        return {
          id: idx + 1,
          file: file?.trim(),
          start: parseFloat(start) || 0,
          end: parseFloat(end) || null,
          text: text?.trim() || '',
          vn: vn?.trim() || ''
        };
      });

    renderTable();
  }

  // Render table
  function renderTable() {
    tableBody.innerHTML = vocabList.map(v =>
      `<tr data-index="${v.id - 1}">
        <td>${v.id}</td>
        <td>${v.file}</td>
        <td>${v.start.toFixed(3)}</td>
        <td>${v.end ? v.end.toFixed(3) : ''}</td>
        <td>${v.text}</td>
        <td>${v.vn || ''}</td>
      </tr>`
    ).join('');
  }

  // Play one segment
  function playSegment(item) {
    if (!item || !item.file) return;

    const url =  global_const.PATH_SOUND + item.file;

    audioEl.src = url;
    audioEl.currentTime = item.start || 0;
    audioEl.play().catch(() => {});

    currentIndex = vocabList.indexOf(item);

    // highlight hàng đang phát
    tableBody.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-success'));
    const currentRow = tableBody.querySelector(`tr[data-index="${currentIndex}"]`);
    if (currentRow) currentRow.classList.add('table-success');

    // nếu có thời gian end thì dừng tại đó
    if (item.end) {
      const stopAt = item.end;
      const interval = setInterval(() => {
        if (audioEl.currentTime >= stopAt) {
          audioEl.pause();
          clearInterval(interval);
          if (isPlayingAll) playNext();
        }
      }, 200);
    } else if (isPlayingAll) {
      audioEl.onended = playNext;
    }
  }

  // Play all
  function playNext() {
    currentIndex++;
    if (currentIndex < vocabList.length) playSegment(vocabList[currentIndex]);
    else stopPlayAll();
  }

  function startPlayAll() {
    if (!vocabList.length) return;
    isPlayingAll = true;
    currentIndex = -1;
    playNext();
    playAllBtn.innerHTML = `<i class="bi bi-stop-fill"></i> Stop`;
    playAllBtn.classList.replace('btn-success', 'btn-danger');
  }

  function stopPlayAll() {
    isPlayingAll = false;
    currentIndex = -1;
    audioEl.pause();
    playAllBtn.innerHTML = `<i class="bi bi-play-circle-fill"></i> Play All`;
    playAllBtn.classList.replace('btn-danger', 'btn-success');
    tableBody.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-success'));
  }

  // Events
  playAllBtn.addEventListener('click', () => {
    if (isPlayingAll) stopPlayAll();
    else startPlayAll();
  });

  // ✅ Click hoặc touch vào hàng để phát
  tableBody.addEventListener('click', e => {
    const row = e.target.closest('tr');
    if (!row) return;
    const index = parseInt(row.dataset.index);
    playSegment(vocabList[index]);
  });

  tableBody.addEventListener('touchend', e => {
    const row = e.target.closest('tr');
    if (!row) return;
    const index = parseInt(row.dataset.index);
    playSegment(vocabList[index]);
  });

  // Expose method global (để gọi từ nút mở modal)
  window.VocabModal = {
    load: loadVocabFromFile
  };
})();
