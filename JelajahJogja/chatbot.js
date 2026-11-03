/* ============================================================
   JelajahJogja — chatbot.js
   Asisten Wisata rule-based berbasis data destinations.json
   BUKAN AI generatif — jawaban dihasilkan dari keyword matching
   terhadap dataset lokal yang sudah dimuat oleh script.js.
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────
   MODUL CHATBOT
   Semua kode chatbot terisolasi dalam IIFE agar
   tidak mencemari namespace global script.js.
   ────────────────────────────────────────────── */
(function () {

  /* ── STATE CHATBOT ── */
  const CHAT = {
    isOpen: false,
    isTyping: false,
  };

  /* ── REFERENSI ELEMEN DOM ── */
  let fab, chatWindow, messagesEl, inputEl, sendBtn;

  /* ──────────────────────────────────────────────
     FUNGSI UTILITAS
     ────────────────────────────────────────────── */

  /**
   * Mendapatkan data destinasi dari STATE global yang diisi script.js.
   * Mengembalikan array kosong jika data belum tersedia.
   * @returns {Array}
   */
  function getDestinations() {
    return (typeof STATE !== 'undefined' && Array.isArray(STATE.allDestinations))
      ? STATE.allDestinations
      : [];
  }

  /**
   * Normalisasi teks: lowercase + hapus tanda baca.
   * @param {string} text
   * @returns {string}
   */
  function normalize(text) {
    return text.toLowerCase()
      .replace(/[.,!?;:'"()\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Mengecek apakah teks mengandung salah satu keyword.
   * @param {string} text - teks yang sudah dinormalisasi
   * @param {string[]} keywords
   * @returns {boolean}
   */
  function hasKeyword(text, keywords) {
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Format waktu HH:MM untuk timestamp pesan.
   * @returns {string}
   */
  function getTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /* ──────────────────────────────────────────────
     ENGINE RESPONS (RULE-BASED)
     Mencocokkan input pengguna dengan pola keyword
     dan mengembalikan respons dari dataset lokal.
     ────────────────────────────────────────────── */

  /**
   * Menghasilkan respons teks berdasarkan input pengguna.
   * @param {string} rawInput - teks asli dari pengguna
   * @returns {{ text: string, cards?: Array, chips?: string[] }}
   */
  function generateResponse(rawInput) {
    const input     = normalize(rawInput);
    const dests     = getDestinations();
    const wisata    = dests.filter((d) => d.category === 'Wisata Alternatif');
    const kerajinan = dests.filter((d) => d.category === 'Sentra Kerajinan Edukatif');

    // ── Data belum tersedia ──
    if (dests.length === 0) {
      return { text: 'Data destinasi sedang dimuat. Silakan coba beberapa saat lagi.' };
    }

    // ── Sapaan ──
    if (hasKeyword(input, ['halo', 'hai', 'hi', 'hello', 'selamat', 'pagi', 'siang', 'sore', 'malam'])) {
      return {
        text: `Halo! Saya Asisten JelajahJogja. Saya dapat membantu Anda menemukan destinasi wisata alternatif dan sentra kerajinan edukatif di Daerah Istimewa Yogyakarta.\n\nAda yang bisa saya bantu?`,
        chips: ['Lihat semua destinasi', 'Wisata Alternatif', 'Sentra Kerajinan', 'Destinasi di Bantul'],
      };
    }

    // ── Terima kasih ──
    if (hasKeyword(input, ['terima kasih', 'makasih', 'thanks', 'thank'])) {
      return { text: 'Sama-sama! Semoga perjalanan Anda menyenangkan. Selamat menjelajahi Yogyakarta! 🗺️' };
    }

    // ── Daftar semua destinasi ──
    if (hasKeyword(input, ['semua destinasi', 'daftar destinasi', 'semua tempat', 'list destinasi', 'berapa destinasi', 'total destinasi'])) {
      return {
        text: `Tersedia ${dests.length} destinasi yang terdata:\n• ${wisata.length} Wisata Alternatif\n• ${kerajinan.length} Sentra Kerajinan Edukatif\n\nIngin melihat berdasarkan kategori atau wilayah tertentu?`,
        chips: ['Wisata Alternatif', 'Sentra Kerajinan', 'Kabupaten Bantul', 'Kabupaten Sleman', 'Kabupaten Gunungkidul'],
      };
    }

    // ── Kategori: Wisata Alternatif ──
    if (hasKeyword(input, ['wisata alternatif', 'wisata alam', 'wisata budaya', 'wisata'])) {
      if (wisata.length === 0) {
        return { text: 'Belum ada data destinasi wisata alternatif yang tersedia.' };
      }
      return {
        text: `Berikut ${wisata.length} destinasi **Wisata Alternatif** yang tersedia:`,
        cards: wisata,
        chips: getRegionChips(wisata),
      };
    }

    // ── Kategori: Sentra Kerajinan ──
    if (hasKeyword(input, ['sentra kerajinan', 'kerajinan', 'craft', 'pengrajin', 'workshop', 'batik', 'gerabah', 'perak', 'kulit', 'kayu', 'anyam'])) {
      if (kerajinan.length === 0) {
        return { text: 'Belum ada data sentra kerajinan edukatif yang tersedia.' };
      }
      return {
        text: `Berikut ${kerajinan.length} destinasi **Sentra Kerajinan Edukatif** yang tersedia:`,
        cards: kerajinan,
        chips: getRegionChips(kerajinan),
      };
    }

    // ── Filter berdasarkan wilayah/kabupaten ──
    const regionMap = {
      bantul:      'Kabupaten Bantul',
      sleman:      'Kabupaten Sleman',
      gunungkidul: 'Kabupaten Gunungkidul',
      'gunung kidul': 'Kabupaten Gunungkidul',
      'kulon progo': 'Kabupaten Kulon Progo',
      kulonprogo:  'Kabupaten Kulon Progo',
      yogyakarta:  'Kota Yogyakarta',
      jogja:       'Kota Yogyakarta',
      kotagede:    'Kota Yogyakarta',
    };

    for (const [keyword, regionName] of Object.entries(regionMap)) {
      if (input.includes(keyword)) {
        const found = dests.filter((d) => d.region === regionName);
        if (found.length === 0) {
          return { text: `Belum ada data destinasi yang terdata di wilayah ${regionName}.` };
        }
        return {
          text: `Ditemukan ${found.length} destinasi di **${regionName}**:`,
          cards: found,
          chips: ['Wisata Alternatif', 'Sentra Kerajinan', 'Lihat semua destinasi'],
        };
      }
    }

    // ── Cari berdasarkan nama destinasi ──
    const nameSearch = dests.filter((d) =>
      normalize(d.name).includes(input) || input.includes(normalize(d.name.split(' ')[0]))
    );
    if (nameSearch.length > 0 && input.length >= 4) {
      if (nameSearch.length === 1) {
        const d = nameSearch[0];
        return {
          text: buildDetailText(d),
          cards: [d],
          chips: ['Wisata Alternatif', 'Sentra Kerajinan', `${d.region}`],
        };
      }
      return {
        text: `Ditemukan ${nameSearch.length} destinasi yang cocok dengan pencarian Anda:`,
        cards: nameSearch,
      };
    }

    // ── Pertanyaan tentang aktivitas edukatif ──
    if (hasKeyword(input, ['aktivitas', 'kegiatan', 'edukasi', 'belajar', 'workshop', 'program'])) {
      const withActivities = dests.filter(
        (d) => d.educational_activities && d.educational_activities.length > 0
      );
      return {
        text: `Ada ${withActivities.length} destinasi yang menawarkan aktivitas edukatif. Berikut beberapa di antaranya:`,
        cards: withActivities.slice(0, 5),
        chips: ['Sentra Kerajinan', 'Wisata Alternatif'],
      };
    }

    // ── Pertanyaan tentang fasilitas ──
    if (hasKeyword(input, ['fasilitas', 'parkir', 'toilet', 'mushola', 'homestay', 'penginapan'])) {
      const withFacilities = dests.filter((d) => d.facilities && d.facilities.length > 0);
      return {
        text: `${withFacilities.length} destinasi memiliki informasi fasilitas yang terdata. Ketik nama destinasi untuk melihat detailnya, atau klik kartu di daftar untuk informasi lengkap.`,
        chips: ['Lihat semua destinasi', 'Wisata Alternatif', 'Sentra Kerajinan'],
      };
    }

    // ── Pertanyaan jam operasional ──
    if (hasKeyword(input, ['jam', 'buka', 'tutup', 'operasional', 'waktu', 'hari'])) {
      const withHours = dests.filter((d) => d.operating_hours);
      return {
        text: `${withHours.length} destinasi memiliki informasi jam operasional yang terdata. Silakan klik kartu destinasi di sidebar untuk melihat detailnya.`,
        chips: ['Wisata Alternatif', 'Sentra Kerajinan'],
      };
    }

    // ── Pertanyaan status verifikasi ──
    if (hasKeyword(input, ['verifikasi', 'terverifikasi', 'valid', 'akurat', 'terpercaya'])) {
      const verified = dests.filter((d) => d.verification_status === 'Terverifikasi');
      return {
        text: `Dari ${dests.length} destinasi, ${verified.length} sudah berstatus **Terverifikasi** dan ${dests.length - verified.length} masih dalam proses verifikasi. Data bersumber dari Dinas Pariwisata dan situs resmi desa wisata DIY.`,
        chips: ['Lihat semua destinasi'],
      };
    }

    // ── Pertanyaan tentang Yogyakarta secara umum ──
    if (hasKeyword(input, ['yogyakarta', 'diy', 'daerah istimewa', 'jogja', 'informasi'])) {
      return {
        text: `JelajahJogja memetakan destinasi wisata alternatif dan sentra kerajinan edukatif di Daerah Istimewa Yogyakarta, meliputi:\n\n• Kabupaten Bantul\n• Kabupaten Sleman\n• Kabupaten Gunungkidul\n• Kabupaten Kulon Progo\n• Kota Yogyakarta\n\nApa yang ingin Anda ketahui?`,
        chips: ['Wisata Alternatif', 'Sentra Kerajinan', 'Lihat semua destinasi'],
      };
    }

    // ── Pertanyaan petunjuk arah / rute ──
    if (hasKeyword(input, ['rute', 'jalan', 'arah', 'menuju', 'dari', 'akses', 'transportasi', 'google maps'])) {
      return {
        text: `Untuk petunjuk arah, klik kartu destinasi di sidebar atau klik marker di peta, lalu tekan tombol **"Buka di Google Maps"** untuk mendapatkan rute dari lokasi Anda.`,
        chips: ['Lihat semua destinasi'],
      };
    }

    // ── Bantuan penggunaan website ──
    if (hasKeyword(input, ['cara', 'gunakan', 'pakai', 'fitur', 'filter', 'cari', 'pencarian', 'bagaimana', 'gimana'])) {
      return {
        text: `Panduan menggunakan JelajahJogja:\n\n1. **Cari** — ketik nama destinasi di kolom pencarian navbar\n2. **Filter** — pilih kategori (Wisata/Kerajinan) atau wilayah di sidebar\n3. **Klik marker** di peta untuk melihat info singkat\n4. **Klik kartu** di daftar untuk melihat detail lengkap\n5. **Google Maps** — tersedia di modal detail untuk petunjuk arah`,
        chips: ['Wisata Alternatif', 'Sentra Kerajinan', 'Lihat semua destinasi'],
      };
    }

    // ── Fallback: tidak ada kecocokan ──
    return {
      text: `Maaf, saya belum memiliki informasi yang relevan untuk pertanyaan tersebut. Saya hanya dapat menjawab berdasarkan data destinasi wisata yang tersedia di JelajahJogja.\n\nCoba tanyakan tentang:`,
      chips: ['Wisata Alternatif', 'Sentra Kerajinan', 'Destinasi di Bantul', 'Aktivitas edukatif', 'Cara menggunakan peta'],
    };
  }

  /**
   * Membangun teks deskripsi singkat untuk satu destinasi.
   * @param {Object} d - objek destinasi
   * @returns {string}
   */
  function buildDetailText(d) {
    let text = `**${d.name}** (${d.category})\n📍 ${d.region}\n\n${d.description}`;
    if (d.operating_hours) text += `\n\n🕐 ${d.operating_hours}`;
    return text;
  }

  /**
   * Menghasilkan array chip berisi wilayah unik dari daftar destinasi.
   * @param {Array} list
   * @returns {string[]}
   */
  function getRegionChips(list) {
    return [...new Set(list.map((d) => d.region))].slice(0, 4);
  }

  /* ──────────────────────────────────────────────
     FUNGSI RENDER UI
     ────────────────────────────────────────────── */

  /**
   * Menambahkan bubble pesan ke area chat.
   * @param {string} text - teks pesan (mendukung **bold**)
   * @param {'bot'|'user'} role
   * @param {Array|null} cards - kartu destinasi opsional
   * @param {string[]|null} chips - quick reply chips opsional
   */
  function addMessage(text, role, cards = null, chips = null) {
    // Render teks dengan **bold** sederhana
    const htmlText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    const bubble = document.createElement('div');
    bubble.className = `chatbot-bubble chatbot-bubble--${role}`;
    bubble.innerHTML = htmlText;
    messagesEl.appendChild(bubble);

    // Kartu destinasi (hanya untuk bot)
    if (role === 'bot' && cards && cards.length > 0) {
      const maxCards = Math.min(cards.length, 5);
      for (let i = 0; i < maxCards; i++) {
        const d = cards[i];
        const card = document.createElement('div');
        card.className = 'chatbot-dest-card';
        card.innerHTML = `
          <div class="chatbot-dest-card__name">${d.name}</div>
          <div class="chatbot-dest-card__meta">${d.category} · ${d.region}</div>`;
        // Klik kartu chatbot → buka modal detail di peta utama
        card.addEventListener('click', () => {
          if (typeof window.openModalById === 'function') {
            window.openModalById(d.id);
          }
        });
        messagesEl.appendChild(card);
      }
      if (cards.length > 5) {
        const more = document.createElement('div');
        more.style.cssText = 'font-size:0.75rem;color:#6B7280;padding:4px 2px;';
        more.textContent = `+${cards.length - 5} destinasi lainnya tersedia di daftar sidebar.`;
        messagesEl.appendChild(more);
      }
    }

    // Quick reply chips (hanya untuk bot)
    if (role === 'bot' && chips && chips.length > 0) {
      const chipContainer = document.createElement('div');
      chipContainer.className = 'chatbot-quick-replies';
      chips.forEach((label) => {
        const btn = document.createElement('button');
        btn.className = 'chatbot-chip';
        btn.textContent = label;
        btn.addEventListener('click', () => handleUserInput(label));
        chipContainer.appendChild(btn);
      });
      messagesEl.appendChild(chipContainer);
    }

    scrollToBottom();
  }

  /** Tampilkan indikator "sedang mengetik". */
  function showTyping() {
    removeTyping();
    const el = document.createElement('div');
    el.className = 'chatbot-typing';
    el.id = 'chatTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    CHAT.isTyping = true;
    scrollToBottom();
  }

  /** Hapus indikator "sedang mengetik". */
  function removeTyping() {
    document.getElementById('chatTyping')?.remove();
    CHAT.isTyping = false;
  }

  /** Scroll area pesan ke paling bawah. */
  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  /**
   * Tambahkan timestamp di antara pesan.
   * Hanya muncul jika interval > 5 menit dari pesan terakhir.
   */
  let lastMessageTime = 0;
  function maybeAddTimestamp() {
    const now = Date.now();
    if (now - lastMessageTime > 5 * 60 * 1000) {
      const ts = document.createElement('div');
      ts.className = 'chatbot-time';
      ts.textContent = getTime();
      messagesEl.appendChild(ts);
    }
    lastMessageTime = now;
  }

  /* ──────────────────────────────────────────────
     ALUR PERCAKAPAN
     ────────────────────────────────────────────── */

  /**
   * Memproses input pengguna: render bubble user → delay → render respons bot.
   * @param {string} text
   */
  function handleUserInput(text) {
    const trimmed = text.trim();
    if (!trimmed || CHAT.isTyping) return;

    maybeAddTimestamp();
    addMessage(trimmed, 'user');
    inputEl.value = '';
    resizeInput();
    sendBtn.disabled = true;

    // Simulasi waktu respons (80–300ms) agar terasa natural
    const delay = 80 + Math.random() * 220;
    showTyping();

    setTimeout(() => {
      removeTyping();
      const response = generateResponse(trimmed);
      addMessage(response.text, 'bot', response.cards, response.chips);
      sendBtn.disabled = false;
      inputEl.focus();
    }, delay);
  }

  /** Resize textarea input sesuai konten. */
  function resizeInput() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
  }

  /* ──────────────────────────────────────────────
     TOGGLE BUKA / TUTUP
     ────────────────────────────────────────────── */

  function openChat() {
    CHAT.isOpen = true;
    chatWindow.classList.add('is-open');
    fab.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    fab.querySelector('.chatbot-fab__badge')?.remove(); // hapus badge notif
    inputEl.focus();
  }

  function closeChat() {
    CHAT.isOpen = false;
    chatWindow.classList.remove('is-open');
    fab.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
  }

  function toggleChat() {
    CHAT.isOpen ? closeChat() : openChat();
  }

  /* ──────────────────────────────────────────────
     INISIALISASI
     ────────────────────────────────────────────── */

  function init() {
    fab         = document.getElementById('chatbotFab');
    chatWindow  = document.getElementById('chatbotWindow');
    messagesEl  = document.getElementById('chatbotMessages');
    inputEl     = document.getElementById('chatbotInput');
    sendBtn     = document.getElementById('chatbotSend');

    if (!fab || !chatWindow) return; // elemen belum ada di DOM

    // Toggle buka/tutup
    fab.addEventListener('click', toggleChat);

    // Tutup dengan tombol X di header
    document.getElementById('chatbotClose')?.addEventListener('click', closeChat);

    // Kirim pesan
    sendBtn.addEventListener('click', () => handleUserInput(inputEl.value));

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput(inputEl.value);
      }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
      resizeInput();
      sendBtn.disabled = !inputEl.value.trim();
    });

    // Disable send button awal (input kosong)
    sendBtn.disabled = true;

    // Pesan sambutan — tunggu data destinasi dimuat (maks 5 detik, polling tiap 300ms)
    // Diperlukan karena chatbot.js dan script.js sama-sama defer;
    // loadData() bersifat async sehingga STATE.allDestinations bisa belum terisi.
    const MAX_WAIT_MS   = 5000;
    const POLL_MS       = 300;
    let   elapsed       = 0;

    const waitForData = setInterval(() => {
      elapsed += POLL_MS;
      const dests    = getDestinations();
      const dataReady = dests.length > 0 || elapsed >= MAX_WAIT_MS;

      if (dataReady) {
        clearInterval(waitForData);
        const totalText = dests.length > 0
          ? ` Saat ini tersedia **${dests.length} destinasi** dalam database.`
          : '';
        addMessage(
          `Halo! Saya **Asisten JelajahJogja** 👋\n\nSaya dapat membantu Anda menemukan destinasi wisata alternatif dan sentra kerajinan edukatif di DIY.${totalText}`,
          'bot',
          null,
          ['Wisata Alternatif', 'Sentra Kerajinan', 'Bantuan penggunaan']
        );
      }
    }, POLL_MS);
  }

  // Jalankan setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
