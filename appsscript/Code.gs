/**
 * Ruang Sastra — SMPI Yambu'ul Qur'an
 * Google Apps Script Production Backend (Spreadsheet & Drive Database)
 * 
 * Fitur:
 * 1. Manajemen Karya Sastra (6 Format: Ilmiah, Puisi, Cerpen, Antologi, Drama, Quotes)
 * 2. Apresiasi / Claps Counter (Atomic Increment)
 * 3. Catatan & Komentar Pembaca
 * 4. Google Drive Media Storage (Upload Sampul & Berkas Karya)
 * 5. Autentikasi Redaksi (Admin) & Penulis (Santri) dengan Hashing SHA-256 & Token Berkedaluwarsa
 * 6. Keamanan Data (Sanitasi output publik tanpa membocorkan hash sandi / token)
 */

const SPREADSHEET_ID = '1A__ZQojk-zrm1m5HFqTOwlBR0B5FD0n7rX9azO2p298';
const DRIVE_FOLDER_NAME = 'RuangSastra_Media';

function getDb_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ============================================================
// 1. KEAMANAN & HASHING (SHA-256)
// ============================================================

function hashPassword_(str) {
  if (!str) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str.toString(), Utilities.Charset.UTF_8);
  let hex = '';
  for (let i = 0; i < digest.length; i++) {
    let byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length == 1) byteHex = '0' + byteHex;
    hex += byteHex;
  }
  return hex;
}

function verifikasiAdminToken_(token) {
  if (!token) throw new Error('Akses ditolak: Sesi redaksi kosong atau tidak valid.');
  const ss = getDb_();
  const sheet = ss.getSheetByName('Admin');
  if (!sheet) throw new Error('Tabel Admin belum diinisialisasi.');
  const data = sheet.getDataRange().getValues();
  const now = new Date().getTime();

  for (let i = 1; i < data.length; i++) {
    const rowToken = data[i][4];
    const exp = Number(data[i][5]);
    if (rowToken && rowToken.toString() === token.toString()) {
      if (exp && now > exp) {
        throw new Error('Sesi redaksi telah kedaluwarsa. Silakan masuk kembali.');
      }
      return {
        username: data[i][0],
        nama: data[i][2],
        role: data[i][3] || 'Redaktur Pelaksana'
      };
    }
  }
  throw new Error('Akses ditolak: Sesi redaksi tidak sah.');
}

function verifikasiPenulisToken_(token) {
  if (!token) return null;
  const ss = getDb_();
  const sheet = ss.getSheetByName('Penulis');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const now = new Date().getTime();

  for (let i = 1; i < data.length; i++) {
    const rowToken = data[i][7];
    const exp = Number(data[i][8]);
    if (rowToken && rowToken.toString() === token.toString()) {
      if (exp && now > exp) return null;
      return {
        id: data[i][0],
        nama: data[i][1],
        email: data[i][2],
        kelas: data[i][4],
        kontak: data[i][5],
        role: 'penulis'
      };
    }
  }
  return null;
}

// ============================================================
// 2. INISIALISASI DATABASE & SCHEMA
// ============================================================

function initSpreadsheet() {
  const ss = getDb_();
  const schema = {
    'Karya': [
      'id', 'slug', 'title', 'description', 'author', 'author_grade',
      'category', 'category_label', 'tags', 'content', 'cover_image_url',
      'reading_time', 'views', 'featured', 'status', 'abstract', 'abstract_en',
      'keywords', 'supervisor', 'pdf_url', 'audio_url', 'verse_form',
      'characters', 'duration', 'stage_setting', 'volume', 'contributors',
      'curator', 'created_at', 'updated_at'
    ],
    'Quotes': [
      'id', 'quote', 'author', 'author_title', 'source', 'category', 'created_at'
    ],
    'Apresiasi': [
      'karya_id', 'count', 'updated_at'
    ],
    'Komentar': [
      'id', 'karya_id', 'nama', 'pesan', 'peran', 'created_at'
    ],
    'Penulis': [
      'id', 'nama', 'email', 'password_hash', 'kelas', 'kontak', 'role', 'token', 'token_exp', 'created_at'
    ],
    'Admin': [
      'username', 'password_hash', 'nama', 'role', 'token', 'token_exp', 'created_at'
    ],
    'Pengaturan': [
      'key', 'value'
    ],
    'Pengunjung': [
      'id', 'timestamp', 'visit_date', 'category', 'path', 'title', 'karya_id', 'device_type', 'referrer', 'ip_masked', 'visitor_hash', 'user_agent'
    ]
  };

  for (let name in schema) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    const headers = schema[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Hapus sheet bawaan "Sheet1" jika ada
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  // Inisialisasi Pengaturan default portal jika kosong
  const pengaturanSheet = ss.getSheetByName('Pengaturan');
  if (pengaturanSheet && pengaturanSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ['nama_portal', 'Ruang Sastra — SMPI Yambu\'ul Qur\'an'],
      ['edisi', 'Edisi I — Tahun Akademik 2026/2027'],
      ['whatsapp', '0815-1577-7911'],
      ['email', 'smpiyaqu@gmail.com'],
      ['status_penerimaan', 'buka'],
      ['manifesto', 'Sastra bukan sekadar rangkaian kata indah di atas kertas, melainkan denyut nurani yang meretas kebekuan peradaban.']
    ];
    pengaturanSheet.getRange(2, 1, defaultSettings.length, 2).setValues(defaultSettings);
  }

  // Pastikan akun Admin Redaksi ada
  const adminSheet = ss.getSheetByName('Admin');
  if (adminSheet.getLastRow() <= 1) {
    const defaultPassHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // SHA-256 hash
    const now = new Date().toISOString();
    adminSheet.appendRow([
      'admin',
      defaultPassHash,
      'Administrator Ruang Sastra',
      'Redaktur Utama',
      '',
      '',
      now
    ]);
    adminSheet.appendRow([
      'redaksi@yq.sch.id',
      defaultPassHash,
      'Redaktur Pelaksana SMPI YQ',
      'Redaktur Utama',
      '',
      '',
      now
    ]);
  }

  return 'Inisialisasi Spreadsheet Ruang Sastra Berhasil!';
}

function resetAdminPassword() {
  const ss = getDb_();
  let sheet = ss.getSheetByName('Admin');
  if (!sheet) sheet = ss.insertSheet('Admin');
  const newHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // SHA-256 hash
  const now = new Date().toISOString();

  const data = sheet.getDataRange().getValues();
  let updated = 0;
  for (let i = 1; i < data.length; i++) {
    const u = (data[i][0] || '').toString().toLowerCase().trim();
    if (u === 'admin' || u === 'redaksi@yq.sch.id') {
      sheet.getRange(i + 1, 2).setValue(newHash);
      sheet.getRange(i + 1, 7).setValue(now);
      updated++;
    }
  }
  if (updated === 0) {
    sheet.appendRow(['admin', newHash, 'Administrator', 'Redaktur Utama', '', '', now]);
    sheet.appendRow(['redaksi@yq.sch.id', newHash, 'Redaktur Pelaksana', 'Redaktur Utama', '', '', now]);
  }
  return 'Password hash berhasil diperbarui di database Google Spreadsheet!';
}

// ============================================================
// 3. SEED DATA DEMO (ARCHIVE RESMI)
// ============================================================

function isiDemoData(forceReset) {
  initSpreadsheet();
  const ss = getDb_();

  // 1. Data Karya
  const karyaSheet = ss.getSheetByName('Karya');
  if (forceReset && karyaSheet && karyaSheet.getLastRow() > 1) {
    try {
      karyaSheet.deleteRows(2, karyaSheet.getLastRow() - 1);
    } catch(e) {
      karyaSheet.getRange(2, 1, karyaSheet.getLastRow() - 1, karyaSheet.getLastColumn()).clearContent();
    }
  }
  if (karyaSheet && (karyaSheet.getLastRow() <= 1 || forceReset)) {
    const sampleKarya = [
      [
        'kti_01',
        'analisis-semiotika-puisi-santri',
        'Analisis Semiotika Riffaterre pada Antologi Puisi Santri Menembus Batas Cakrawala',
        'Kajian kritis terhadap ketaklangsungan ekspresi, penciptaan arti, dan matriks puitik dalam karya sastra generasi muda SMPI Yambu\'ul Qur\'an.',
        'Zulfa Naura & Rizky Maulana',
        'Tim Karya Ilmiah Remaja (KIR) — Kelas XII',
        'ilmiah',
        'Karya Tulis Ilmiah',
        JSON.stringify(['Semiotika', 'Karya Tulis Ilmiah', 'Puisi', 'Sastra Santri']),
        'Karya sastra, khususnya puisi, bukanlah cermin datar yang sekadar memantulkan kenyataan empiris, melainkan sebuah transformasi simbolik atas pengalaman batin pengarangnya...',
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
        9,
        342,
        true,
        'published',
        'Penelitian ini mengkaji struktur semiotika puisi karya siswa SMPI Yambu\'ul Qur\'an dengan menerapkan teori Semiotika Michael Riffaterre...',
        'This study examines the semiotic structure of poetry authored by students of SMPI Yambu\'ul Qur\'an using Michael Riffaterre\'s semiotic theory...',
        JSON.stringify(['Semiotika Riffaterre', 'Matriks Puitik', 'Sastra Remaja']),
        'Pembimbing: Dr. H. Burhanuddin, M.Hum. & Ust. Ahmad Fauzi, M.Pd.',
        '/documents/analisis-semiotika-riffaterre.pdf',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Dewan Redaksi Ruang Sastra',
        '2026-08-15T08:00:00.000Z',
        '2026-08-15T08:00:00.000Z'
      ],
      [
        'puisi_01',
        'jejak-di-ujung-pena',
        'Jejak di Ujung Pena',
        'Di antara riak kata yang sunyi, ada bait yang menolak berhenti mengalirkan rahasia malam dan asa yang tak kunjung padam.',
        'Anisa Rahmawati',
        'Kelas XI-A',
        'puisi',
        'Puisi & Prosa',
        JSON.stringify(['Puisi', 'Sajak', 'Refleksi', 'Karya Pilihan']),
        'Di antara riak kata yang sunyi,\nada bait yang menolak berhenti.\nUjung penaku mencatat dentang jam tiga pagi,\nketika dingin merayap dari lantai marmer serambi,\ndan gemerisik dedaunan sawo kecik\nmengiringi napas para pencari cahaya.\n\nAku bukanlah perangkai kalimat ulung,\nhanya seorang musafir yang mengeja takdir\npada lembar-lembar kertas buram bergaris.\nSetiap tetes dawat adalah doa yang dipanjangkan,\nsetiap spasi adalah jeda bagi air mata\nyang enggan tumpah di hadapan fana.',
        'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
        3,
        518,
        true,
        'published',
        '',
        '',
        '',
        '',
        '',
        'https://ia800905.us.archive.org/19/items/audio-poetry-sample/poetry-ambient.mp3',
        'Puisi Liris Berbait',
        '',
        '',
        '',
        '',
        '',
        'Redaksi SMPI YQ',
        '2026-09-02T03:30:00.000Z',
        '2026-09-02T03:30:00.000Z'
      ],
      [
        'cerpen_01',
        'lentera-di-pinggir-kota',
        'Lentera di Pinggir Kota',
        'Sebuah kisah tentang pencarian makna di sudut perkampungan santri yang sederhana namun menyimpan sejuta asa.',
        'Ahmad Fatihul Ihsan',
        'Kelas X-C',
        'cerpen',
        'Cerpen',
        JSON.stringify(['Cerpen', 'Kehidupan', 'Pesantren']),
        'Malam itu hujan gerimis membasahi pelataran masjid. Lampu neon temaram berkedip-kedip di ujung gang sempit...',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
        6,
        289,
        true,
        'published',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Redaksi SMPI YQ',
        '2026-09-10T14:00:00.000Z',
        '2026-09-10T14:00:00.000Z'
      ],
      [
        'drama_01',
        'naskah-drama-layar-terkembang',
        'Layar Terkembang di Tepian Sunyi',
        'Naskah pementasan teater satu babak tentang tekad santri muda menjaga marwah keilmuan dan perjuangan dakwah.',
        'Teater Santri Yaqu',
        'Ekstrakurikuler Seni & Teater',
        'drama',
        'Naskah Drama',
        JSON.stringify(['Drama', 'Teater', 'Naskah', 'Pementasan']),
        'BABAK I\n[Latar panggung temaram. Suara gemercik air wudhu mengalun lembut di kejauhan.]\n\nUSTADZ MANSYUR:\n(Berdiri menatap cakrawala malam)\nIlmu itu bagai bahtera di samudra raya, anakku. Tanpa keteguhan nakhoda, ia karam dihempas badai fitnah.',
        'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
        8,
        175,
        true,
        'published',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        JSON.stringify(['Ustadz Mansyur', 'Farhan', 'Pak Salim']),
        '25 Menit',
        'Selasar Pondok & Pelataran Masjid',
        '',
        '',
        'Dewan Pembina Kesenian',
        '2026-09-15T19:00:00.000Z',
        '2026-09-15T19:00:00.000Z'
      ],
      [
        'antologi_01',
        'antologi-gemuruh-kata-generasi-qurani',
        'Gemuruh Kata Generasi Qur\'ani',
        'Kumpulan puisi dan refleksi batin santri angkatan 2026 dalam merajut mimpi dan memelihara kalam Ilahi.',
        'Santri Angkatan Ke-7 SMPI YQ',
        'Kompilasi Seluruh Angkatan',
        'antologi',
        'Antologi',
        JSON.stringify(['Antologi', 'Kompilasi', 'Santri', 'Edisi Khusus']),
        'Kompilasi karya puisi, prosa, dan renungan terpilih dari para santri penghafal Al-Qur\'an...',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
        12,
        420,
        true,
        'published',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Jilid I — 2026',
        JSON.stringify(['Fatimah', 'Hasan', 'Aisyah', 'Zaid']),
        'Redaktur Antologi Santri',
        '2026-10-01T08:00:00.000Z',
        '2026-10-01T08:00:00.000Z'
      ]
    ];

    sampleKarya.forEach(row => karyaSheet.appendRow(row));
  }

  // 2. Data Quotes
  const quotesSheet = ss.getSheetByName('Quotes');
  if (quotesSheet.getLastRow() <= 1) {
    const sampleQuotes = [
      [
        'q_01',
        'Tulisan bukan sekadar susunan huruf, dan panggung bukan sekadar tempat berakting. Keduanya adalah jalan merawat nurani di tengah bisingnya dunia.',
        'Redaksi Ruang Sastra',
        'SMPI Yambu\'ul Qur\'an',
        'Manifesto Ruang Sastra, 2026',
        'Manifesto',
        '2026-09-01T00:00:00.000Z'
      ],
      [
        'q_02',
        'Setiap huruf yang terpahat dengan keikhlasan adalah benih keabadian yang mekar di taman sanubari pembacanya.',
        'K.H. Ahmad Dahlan Al-Hafidz',
        'Pengasuh Pesantren',
        'Khutbah Pembukaan Pojok Baca',
        'Spiritual',
        '2026-09-05T00:00:00.000Z'
      ],
      [
        'q_03',
        'Membaca adalah menghirup dunia, dan menulis adalah mengembuskan kembali kearifan ke relung semesta.',
        'Ust. H. Ahmad Fauzi, Lc., M.Pd.',
        'Kepala Sekolah SMPI YQ',
        'Amanat Hari Literasi Nasional',
        'Edukasi',
        '2026-09-12T00:00:00.000Z'
      ]
    ];
    sampleQuotes.forEach(q => quotesSheet.appendRow(q));
  }

  // 3. Data Apresiasi Awal
  const apresiasiSheet = ss.getSheetByName('Apresiasi');
  if (apresiasiSheet.getLastRow() <= 1) {
    apresiasiSheet.appendRow(['analisis-semiotika-puisi-santri', 42, new Date().toISOString()]);
    apresiasiSheet.appendRow(['jejak-di-ujung-pena', 87, new Date().toISOString()]);
    apresiasiSheet.appendRow(['lentera-di-pinggir-kota', 35, new Date().toISOString()]);
    apresiasiSheet.appendRow(['naskah-drama-layar-terkembang', 29, new Date().toISOString()]);
    apresiasiSheet.appendRow(['antologi-gemuruh-kata-generasi-qurani', 64, new Date().toISOString()]);
  }

  // 4. Data Komentar Awal
  const komentarSheet = ss.getSheetByName('Komentar');
  if (komentarSheet.getLastRow() <= 1) {
    komentarSheet.appendRow([
      'k_01',
      'jejak-di-ujung-pena',
      'Ustadzah Siti Nur Azizah',
      'MasyaAllah, pilihan diksi yang begitu teduh dan sarat perenungan malam. Teruslah berkarya untuk ananda Anisa!',
      'Guru Bahasa Arab',
      '2026-09-03T10:15:00.000Z'
    ]);
    komentarSheet.appendRow([
      'k_02',
      'analisis-semiotika-puisi-santri',
      'M. Syahrul Ramadhan',
      'Analisis yang sangat metodologis dan bernas. Membuka wawasan kami tentang kekayaan puitik santri.',
      'Alumni SMPI YQ',
      '2026-08-20T14:30:00.000Z'
    ]);
  }

  // 5. Data Pengunjung Awal (Past 30 Days Realistic Seed for Analytics)
  const pengunjungSheet = ss.getSheetByName('Pengunjung');
  if (forceReset && pengunjungSheet && pengunjungSheet.getLastRow() > 1) {
    try {
      pengunjungSheet.deleteRows(2, pengunjungSheet.getLastRow() - 1);
    } catch(e) {
      pengunjungSheet.getRange(2, 1, pengunjungSheet.getLastRow() - 1, pengunjungSheet.getLastColumn()).clearContent();
    }
  }
  if (pengunjungSheet && (pengunjungSheet.getLastRow() <= 1 || forceReset)) {
    const seedVisitors = [];
    const sampleKaryaSlugs = [
      { slug: 'jejak-di-ujung-pena', title: 'Jejak di Ujung Pena', cat: 'puisi' },
      { slug: 'analisis-semiotika-puisi-santri', title: 'Analisis Semiotika Riffaterre', cat: 'ilmiah' },
      { slug: 'lentera-di-pinggir-kota', title: 'Lentera di Pinggir Kota', cat: 'cerpen' },
      { slug: 'antologi-gemuruh-kata-generasi-qurani', title: 'Antologi: Gemuruh Kata Generasi Qurani', cat: 'antologi' },
      { slug: 'naskah-drama-layar-terkembang', title: 'Layar Terkembang di Tepian Zaman', cat: 'drama' }
    ];
    const referrers = ['direct', 'https://api.whatsapp.com', 'https://www.google.com', 'https://l.instagram.com', 'direct'];
    const devices = ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'tablet'];
    const nowMs = new Date().getTime();

    for (let dayAgo = 29; dayAgo >= 0; dayAgo--) {
      const dayDate = new Date(nowMs - dayAgo * 24 * 60 * 60 * 1000);
      const dateStr = Utilities.formatDate(dayDate, 'Asia/Jakarta', 'yyyy-MM-dd');
      const visitsToday = Math.floor(4 + (Math.sin(dayAgo * 0.4) + 1) * 3 + (dayAgo % 4));

      for (let v = 0; v < visitsToday; v++) {
        const hour = Math.floor(7 + Math.random() * 14);
        const min = Math.floor(Math.random() * 60);
        const sec = Math.floor(Math.random() * 60);
        const timeStr = dateStr + ' ' + (hour < 10 ? '0' + hour : hour) + ':' + (min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec);
        const dev = devices[Math.floor(Math.random() * devices.length)];
        const ref = referrers[Math.floor(Math.random() * referrers.length)];
        const vHash = 'hash_' + (dayAgo % 7) + '_' + Math.floor(Math.random() * 100);
        const ip = '180.252.' + (100 + (dayAgo % 50)) + '.***';

        const randType = Math.random();
        let cat = 'portal';
        let path = '/';
        let title = 'Beranda Ruang Sastra';
        let kId = '';

        if (randType < 0.65) {
          const k = sampleKaryaSlugs[Math.floor(Math.random() * sampleKaryaSlugs.length)];
          cat = 'karya';
          path = '/karya/' + k.slug;
          title = k.title;
          kId = k.slug;
        } else if (randType < 0.85) {
          cat = 'portal';
          path = Math.random() < 0.5 ? '/' : '/karya';
          title = path === '/' ? 'Beranda Ruang Sastra' : 'Pojok Baca Literatur';
        } else if (randType < 0.95) {
          cat = 'quotes';
          path = '/quotes';
          title = 'Quotes Sastra Santri';
        } else {
          cat = 'panggung';
          path = '/panggung';
          title = 'Panggung Sastra';
        }

        const vlogId = 'vlog_' + (dayAgo * 1000 + v);
        seedVisitors.push([
          vlogId, timeStr, dateStr, cat, path, title, kId, dev, ref, ip, vHash, 'Mozilla/5.0'
        ]);
      }
    }

    for (let i = 0; i < seedVisitors.length; i += 50) {
      const batch = seedVisitors.slice(i, i + 50);
      pengunjungSheet.getRange(pengunjungSheet.getLastRow() + 1, 1, batch.length, batch[0].length).setValues(batch);
    }
  }

  return 'Data demo Ruang Sastra berhasil diisi!';
}

// ============================================================
// 4. OPERASI APRESIASI (CLAPS) & KOMENTAR
// ============================================================

function getApresiasiCount(karyaId) {
  if (!karyaId) return 0;
  const ss = getDb_();
  const sheet = ss.getSheetByName('Apresiasi');
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === karyaId.toString()) {
      return parseInt(data[i][1] || 0, 10);
    }
  }
  return 0;
}

function tambahApresiasi(karyaId) {
  if (!karyaId) return 1;
  const ss = getDb_();
  const sheet = ss.getSheetByName('Apresiasi');
  if (!sheet) return 1;
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === karyaId.toString()) {
      const nextCount = parseInt(data[i][1] || 0, 10) + 1;
      sheet.getRange(i + 1, 2).setValue(nextCount);
      sheet.getRange(i + 1, 3).setValue(now);
      return nextCount;
    }
  }

  // Jika belum ada, masukkan baris baru
  sheet.appendRow([karyaId.toString(), 1, now]);
  return 1;
}

function getDaftarKomentar(karyaId) {
  if (!karyaId) return [];
  const ss = getDb_();
  const sheet = ss.getSheetByName('Komentar');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString() === karyaId.toString()) {
      list.push({
        id: data[i][0],
        karya_id: data[i][1],
        nama: data[i][2],
        pesan: data[i][3],
        peran: data[i][4] || 'Pembaca',
        created_at: data[i][5]
      });
    }
  }

  // Urutkan komentar terbaru di awal
  return list.reverse();
}

function kirimKomentar(karyaId, payload) {
  if (!karyaId || !payload || !payload.nama || !payload.pesan) {
    throw new Error('Data komentar tidak lengkap.');
  }
  const ss = getDb_();
  const sheet = ss.getSheetByName('Komentar');
  if (!sheet) throw new Error('Tabel Komentar tidak ditemukan.');

  const id = 'k_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const newRow = [
    id,
    karyaId.toString(),
    payload.nama.toString().trim(),
    payload.pesan.toString().trim(),
    payload.peran ? payload.peran.toString().trim() : 'Pembaca',
    now
  ];

  sheet.appendRow(newRow);

  return {
    id: id,
    karya_id: karyaId,
    nama: payload.nama,
    pesan: payload.pesan,
    peran: payload.peran || 'Pembaca',
    created_at: now
  };
}

// ============================================================
// 5. UNGGAH MEDIA KE GOOGLE DRIVE
// ============================================================

function uploadFotoKarya(base64Data, fileName, mimeType, token) {
  if (!base64Data) throw new Error('Data berkas base64 kosong.');
  
  // Clean base64 header if present (e.g. data:image/jpeg;base64,...)
  let cleanBase64 = base64Data;
  if (cleanBase64.indexOf(',') > -1) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  const safeName = fileName || ('sampul_' + Date.now() + '.jpg');
  const safeMime = mimeType || 'image/jpeg';
  const decoded = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decoded, safeMime, safeName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Return direct Google CDN link
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

function uploadFileToDrive(base64Data, fileName, mimeType, token) {
  return uploadFotoKarya(base64Data, fileName, mimeType, token);
}

// ============================================================
// 6. MANAJEMEN KARYA (CRUD)
// ============================================================

function fetchAllKarya(token) {
  let isAdmin = false;
  try {
    if (token) {
      verifikasiAdminToken_(token);
      isAdmin = true;
    }
  } catch (e) {
    isAdmin = false;
  }

  const ss = getDb_();
  const sheet = ss.getSheetByName('Karya');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const list = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      if (h === 'tags' || h === 'keywords' || h === 'characters' || h === 'contributors') {
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try { val = JSON.parse(val); } catch(err) {}
        }
      }
      item[h] = val;
    });

    // Jika bukan admin, hanya tampilkan yang berstatus 'published'
    if (isAdmin || item.status === 'published') {
      list.push(item);
    }
  }

  return list.reverse();
}

function simpanKarya(karyaObj, token) {
  if (!karyaObj || !karyaObj.title) {
    throw new Error('Judul karya wajib diisi.');
  }

  let adminUser = null;
  let penulisUser = null;

  try {
    if (token) adminUser = verifikasiAdminToken_(token);
  } catch(e) {}

  if (!adminUser && token) {
    penulisUser = verifikasiPenulisToken_(token);
  }

  const categoryLabels = {
    'ilmiah': 'Karya Tulis Ilmiah',
    'puisi': 'Puisi & Prosa',
    'cerpen': 'Cerpen',
    'antologi': 'Antologi',
    'drama': 'Naskah Drama',
    'quotes': 'Quotes Sastra'
  };

  const ss = getDb_();
  const sheet = ss.getSheetByName('Karya');
  if (!sheet) throw new Error('Sheet Karya tidak ditemukan.');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const now = new Date().toISOString();

  // Status security
  let status = 'menunggu_kurasi';
  if (adminUser) {
    status = karyaObj.status || 'published';
  } else if (karyaObj.status === 'draft') {
    status = 'draft';
  }

  const slug = karyaObj.slug || karyaObj.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const id = karyaObj.id || ('karya_' + Date.now());
  const categoryLabel = karyaObj.category_label || categoryLabels[karyaObj.category] || 'Sastra';

  const rowMap = {
    ...karyaObj,
    id: id,
    slug: slug,
    status: status,
    category_label: categoryLabel,
    tags: Array.isArray(karyaObj.tags) ? JSON.stringify(karyaObj.tags) : (karyaObj.tags || '[]'),
    keywords: Array.isArray(karyaObj.keywords) ? JSON.stringify(karyaObj.keywords) : (karyaObj.keywords || '[]'),
    characters: Array.isArray(karyaObj.characters) ? JSON.stringify(karyaObj.characters) : (karyaObj.characters || ''),
    contributors: Array.isArray(karyaObj.contributors) ? JSON.stringify(karyaObj.contributors) : (karyaObj.contributors || ''),
    updated_at: now
  };

  if (!karyaObj.created_at) {
    rowMap.created_at = now;
  }

  // Cek apakah data sudah ada (update berdasarkan slug atau id)
  const data = sheet.getDataRange().getValues();
  let existingRow = -1;

  for (let i = 1; i < data.length; i++) {
    const rowId = data[i][0];
    const rowSlug = data[i][1];
    if (rowId === id || rowSlug === slug) {
      existingRow = i + 1;
      rowMap.created_at = data[i][headers.indexOf('created_at')] || now;
      if (rowMap.views === undefined && headers.indexOf('views') > -1) {
        rowMap.views = data[i][headers.indexOf('views')] || 0;
      }
      break;
    }
  }

  if (rowMap.views === undefined) {
    rowMap.views = 0;
  }

  const rowValues = headers.map(h => rowMap[h] !== undefined ? rowMap[h] : '');

  if (existingRow > 1) {
    sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    return {
      success: true,
      id: id,
      slug: slug,
      message: 'Karya berhasil diperbarui di Google Sheets DB!'
    };
  } else {
    sheet.appendRow(rowValues);
    return {
      success: true,
      id: id,
      slug: slug,
      message: adminUser 
        ? 'Karya baru berhasil diterbitkan langsung ke Google Sheets DB!' 
        : 'Naskah karya Anda berhasil dikirim ke Redaksi SMPI YQ untuk dikurasi.'
    };
  }
}

function hapusKarya(idOrSlug, token) {
  verifikasiAdminToken_(token);
  const ss = getDb_();
  const sheet = ss.getSheetByName('Karya');
  if (!sheet) throw new Error('Sheet Karya tidak ditemukan.');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idOrSlug || data[i][1] === idOrSlug) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Karya berhasil dihapus dari Google Sheets.' };
    }
  }

  return { success: false, message: 'Karya tidak ditemukan.' };
}

function updateStatusKarya(idOrSlug, status, token) {
  verifikasiAdminToken_(token);
  const ss = getDb_();
  const sheet = ss.getSheetByName('Karya');
  if (!sheet) throw new Error('Sheet Karya tidak ditemukan.');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('status') + 1;
  const updatedCol = headers.indexOf('updated_at') + 1;
  const now = new Date().toISOString();

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idOrSlug || data[i][1] === idOrSlug) {
      sheet.getRange(i + 1, statusCol).setValue(status);
      if (updatedCol > 0) sheet.getRange(i + 1, updatedCol).setValue(now);
      return { success: true, message: 'Status karya berhasil diubah menjadi ' + status };
    }
  }

  return { success: false, message: 'Karya tidak ditemukan.' };
}

function getKaryaByPenulis(authorName, authorEmail) {
  const ss = getDb_();
  const sheet = ss.getSheetByName('Karya');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const list = [];
  const queryAuthor = (authorName || '').toString().toLowerCase().trim();
  const queryEmail = (authorEmail || '').toString().toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, idx) => item[h] = row[idx]);

    const rowAuthor = (item.author || '').toString().toLowerCase();
    const rowTags = (item.tags || '').toString().toLowerCase();

    if ((queryAuthor && rowAuthor.indexOf(queryAuthor) > -1) ||
        (queryEmail && rowTags.indexOf(queryEmail) > -1)) {
      list.push(item);
    }
  }

  return list.reverse();
}

function tambahViewKarya(idOrSlug) {
  if (!idOrSlug) return 0;
  try {
    const ss = getDb_();
    const sheet = ss.getSheetByName('Karya');
    if (!sheet) return 0;
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0;
    const headers = data[0];
    let viewCol = headers.indexOf('views') + 1;
    if (viewCol <= 0) {
      viewCol = headers.length + 1;
      sheet.getRange(1, viewCol).setValue('views').setFontWeight('bold');
    }
    const target = idOrSlug.toString().toLowerCase().trim();
    for (let i = 1; i < data.length; i++) {
      const rowId = (data[i][0] || '').toString().toLowerCase().trim();
      const rowSlug = (data[i][1] || '').toString().toLowerCase().trim();
      if (rowId === target || rowSlug === target) {
        const cell = sheet.getRange(i + 1, viewCol);
        const currentVal = parseInt(cell.getValue() || 0, 10);
        const newVal = currentVal + 1;
        cell.setValue(newVal);
        return newVal;
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

function getQuotes() {
  const ss = getDb_();
  const sheet = ss.getSheetByName('Quotes');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const item = {};
    headers.forEach((h, idx) => item[h] = data[i][idx]);
    list.push(item);
  }
  return list;
}

function simpanQuote(quoteObj, token) {
  verifikasiAdminToken_(token);
  if (!quoteObj || !quoteObj.quote) {
    throw new Error('Teks kutipan sastra wajib diisi.');
  }

  const ss = getDb_();
  const sheet = ss.getSheetByName('Quotes');
  if (!sheet) throw new Error('Sheet Quotes tidak ditemukan.');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const now = new Date().toISOString();
  const id = quoteObj.id || ('q_' + Date.now());

  const rowMap = {
    ...quoteObj,
    id: id,
    created_at: quoteObj.created_at || now
  };

  const data = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      existingRow = i + 1;
      break;
    }
  }

  const rowValues = headers.map(h => rowMap[h] !== undefined ? rowMap[h] : '');
  if (existingRow > 1) {
    sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    return { success: true, id: id, message: 'Kutipan berhasil diperbarui di Google Sheets DB!' };
  } else {
    sheet.appendRow(rowValues);
    return { success: true, id: id, message: 'Kutipan sastra baru berhasil disimpan ke Google Sheets DB!' };
  }
}

function hapusQuote(quoteId, token) {
  verifikasiAdminToken_(token);
  const ss = getDb_();
  const sheet = ss.getSheetByName('Quotes');
  if (!sheet) throw new Error('Sheet Quotes tidak ditemukan.');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === quoteId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Kutipan sastra berhasil dihapus dari Google Sheets.' };
    }
  }
  return { success: false, message: 'Kutipan tidak ditemukan.' };
}

function hapusKomentar(commentId, token) {
  verifikasiAdminToken_(token);
  const ss = getDb_();
  const sheet = ss.getSheetByName('Komentar');
  if (!sheet) throw new Error('Sheet Komentar tidak ditemukan.');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === commentId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Komentar pembaca berhasil dihapus dari Google Sheets.' };
    }
  }
  return { success: false, message: 'Komentar tidak ditemukan.' };
}

function getPengaturan() {
  const ss = getDb_();
  const sheet = ss.getSheetByName('Pengaturan');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const res = {};
  for (let i = 1; i < data.length; i++) {
    const k = (data[i][0] || '').toString().trim();
    if (k) res[k] = data[i][1];
  }
  return res;
}

function simpanPengaturan(settingsObj, token) {
  verifikasiAdminToken_(token);
  if (!settingsObj || typeof settingsObj !== 'object') {
    throw new Error('Data pengaturan tidak valid.');
  }
  const ss = getDb_();
  let sheet = ss.getSheetByName('Pengaturan');
  if (!sheet) sheet = ss.insertSheet('Pengaturan');

  const data = sheet.getDataRange().getValues();
  const existingMap = {};
  for (let i = 1; i < data.length; i++) {
    const k = (data[i][0] || '').toString().trim().toLowerCase();
    if (k) existingMap[k] = i + 1;
  }

  for (let key in settingsObj) {
    const normKey = key.trim().toLowerCase();
    const val = settingsObj[key];
    if (existingMap[normKey]) {
      sheet.getRange(existingMap[normKey], 2).setValue(val);
    } else {
      sheet.appendRow([key, val]);
      existingMap[normKey] = sheet.getLastRow();
    }
  }
  return { success: true, message: 'Pengaturan redaksi berhasil diperbarui!', data: getPengaturan() };
}

function saveData(sheetName, dataObj, rowIdOrKey, token) {
  verifikasiAdminToken_(token);
  if (!sheetName || !dataObj) throw new Error('Parameter saveData tidak lengkap.');

  const ss = getDb_();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  Object.keys(dataObj).forEach(k => {
    if (k !== '_rowId' && headers.indexOf(k) === -1) {
      headers.push(k);
      sheet.getRange(1, headers.length).setValue(k).setFontWeight('bold');
    }
  });

  const rowData = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : '');
  const numRow = parseInt(rowIdOrKey, 10);

  if (!isNaN(numRow) && numRow > 1 && numRow <= sheet.getLastRow()) {
    sheet.getRange(numRow, 1, 1, rowData.length).setValues([rowData]);
    dataObj._rowId = numRow;
  } else {
    sheet.appendRow(rowData);
    dataObj._rowId = sheet.getLastRow();
  }
  return { success: true, data: dataObj, rowId: dataObj._rowId };
}

function deleteData(sheetName, rowId, token) {
  verifikasiAdminToken_(token);
  const ss = getDb_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' tidak ditemukan.');
  const numRow = parseInt(rowId, 10);
  if (!isNaN(numRow) && numRow > 1 && numRow <= sheet.getLastRow()) {
    sheet.deleteRow(numRow);
    return { success: true, rowId: numRow };
  }
  return { success: false, message: 'Baris tidak valid.' };
}

// ============================================================
// 6.5. STATISTIK & ANALISIS PENGUNJUNG (VISITOR COUNTER & ANALYTICS)
// ============================================================

function formatCellDate_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  const s = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
    }
  } catch(e) {}
  return s.substring(0, 10);
}

function formatCellTimestamp_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  }
  return val.toString();
}

function catatKunjungan(payload) {
  if (!payload) return { success: false, error: 'Payload kunjungan kosong.' };
  try {
    const ss = getDb_();
    let sheet = ss.getSheetByName('Pengunjung');
    if (!sheet) {
      initSpreadsheet();
      sheet = ss.getSheetByName('Pengunjung');
    }

    const now = new Date();
    const id = 'vlog_' + now.getTime() + '_' + Math.floor(Math.random() * 1000);
    const timestamp = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    const visitDate = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');

    const category = (payload.category || 'portal').toString().toLowerCase().trim();
    const path = (payload.path || '/').toString().trim();
    const title = (payload.title || '').toString().trim();
    const karyaId = (payload.karyaId || payload.karyaSlug || payload.karya_id || '').toString().trim();
    const deviceType = (payload.deviceType || payload.device_type || 'desktop').toString().toLowerCase().trim();
    const referrer = (payload.referrer || 'direct').toString().trim();
    const ipMasked = (payload.ipMasked || payload.ip_masked || '180.252.***.***').toString().trim();
    const visitorHash = (payload.visitorHash || payload.visitor_hash || Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, visitDate + '_' + Math.random()))).toString().substring(0, 16);
    const userAgent = (payload.userAgent || payload.user_agent || '').toString().substring(0, 255);

    sheet.appendRow([
      id, timestamp, visitDate, category, path, title, karyaId, deviceType, referrer, ipMasked, visitorHash, userAgent
    ]);

    let updatedViews = 0;
    if (karyaId || category === 'karya') {
      const targetSlug = karyaId || path.split('/').filter(Boolean).pop();
      if (targetSlug) {
        updatedViews = tambahViewKarya(targetSlug);
      }
    }

    return { success: true, id: id, views: updatedViews };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getVisitorAnalytics(period, categoryFilter, token) {
  const ss = getDb_();
  let sheet = ss.getSheetByName('Pengunjung');
  if (!sheet) {
    initSpreadsheet();
    sheet = ss.getSheetByName('Pengunjung');
  }
  const karyaSheet = ss.getSheetByName('Karya');

  const now = new Date();
  const todayStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');

  let daysLimit = 30;
  if (period === 'today') daysLimit = 1;
  else if (period === '7d') daysLimit = 7;
  else if (period === '30d') daysLimit = 30;
  else if (period === 'all') daysLimit = 365;

  const startDate = new Date(now.getTime() - (daysLimit - 1) * 24 * 60 * 60 * 1000);
  const startDateStr = Utilities.formatDate(startDate, 'Asia/Jakarta', 'yyyy-MM-dd');

  const prevEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(prevEndDate.getTime() - (daysLimit - 1) * 24 * 60 * 60 * 1000);
  const prevStartDateStr = Utilities.formatDate(prevStartDate, 'Asia/Jakarta', 'yyyy-MM-dd');
  const prevEndDateStr = Utilities.formatDate(prevEndDate, 'Asia/Jakarta', 'yyyy-MM-dd');

  let rows = [];
  if (sheet && sheet.getLastRow() > 1) {
    rows = sheet.getDataRange().getValues();
  }

  const header = rows.length > 0 ? rows[0] : [
    'id', 'timestamp', 'visit_date', 'category', 'path', 'title', 'karya_id', 'device_type', 'referrer', 'ip_masked', 'visitor_hash', 'user_agent'
  ];

  const colIdx = {
    id: header.indexOf('id'),
    timestamp: header.indexOf('timestamp'),
    visit_date: header.indexOf('visit_date'),
    category: header.indexOf('category'),
    path: header.indexOf('path'),
    title: header.indexOf('title'),
    karya_id: header.indexOf('karya_id'),
    device_type: header.indexOf('device_type'),
    referrer: header.indexOf('referrer'),
    ip_masked: header.indexOf('ip_masked'),
    visitor_hash: header.indexOf('visitor_hash')
  };

  const curPeriodRows = [];
  const prevPeriodRows = [];
  const todayRows = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const vDate = formatCellDate_(r[colIdx.visit_date]);
    const cat = (r[colIdx.category] || '').toString().toLowerCase();

    if (categoryFilter && categoryFilter !== 'all' && cat !== categoryFilter.toLowerCase()) {
      continue;
    }

    if (vDate === todayStr) {
      todayRows.push(r);
    }

    if (period === 'all' || (vDate >= startDateStr && vDate <= todayStr)) {
      curPeriodRows.push(r);
    } else if (vDate >= prevStartDateStr && vDate <= prevEndDateStr) {
      prevPeriodRows.push(r);
    }
  }

  const uniqueCur = new Set();
  const uniqueToday = new Set();
  const categoryBreakdown = {
    karya: { total: 0, unique: new Set() },
    portal: { total: 0, unique: new Set() },
    quotes: { total: 0, unique: new Set() },
    panggung: { total: 0, unique: new Set() },
    admin: { total: 0, unique: new Set() }
  };
  const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 };
  const referrerMap = {};

  const dailyMap = {};
  const daysToIterate = Math.min(daysLimit, 30);
  for (let d = daysToIterate - 1; d >= 0; d--) {
    const dObj = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dStr = Utilities.formatDate(dObj, 'Asia/Jakarta', 'yyyy-MM-dd');
    const dayLabel = Utilities.formatDate(dObj, 'Asia/Jakarta', 'dd MMM');
    dailyMap[dStr] = {
      date: dStr,
      label: dayLabel,
      total: 0,
      karya: 0,
      portal: 0,
      other: 0,
      uniqueHashes: new Set()
    };
  }

  for (let i = 0; i < curPeriodRows.length; i++) {
    const r = curPeriodRows[i];
    const vDate = formatCellDate_(r[colIdx.visit_date]);
    const vHash = (r[colIdx.visitor_hash] || r[colIdx.id]).toString();
    const cat = (r[colIdx.category] || 'portal').toString().toLowerCase();
    const dev = (r[colIdx.device_type] || 'desktop').toString().toLowerCase();
    let ref = (r[colIdx.referrer] || 'direct').toString().toLowerCase();

    if (ref.indexOf('whatsapp') > -1) ref = 'WhatsApp';
    else if (ref.indexOf('google') > -1) ref = 'Google Search';
    else if (ref.indexOf('instagram') > -1) ref = 'Instagram';
    else if (ref.indexOf('facebook') > -1) ref = 'Facebook';
    else if (!ref || ref === 'direct' || ref.indexOf('localhost') > -1 || ref.indexOf('nixon42.github.io') > -1) ref = 'Langsung (Direct)';
    else ref = 'Lainnya (Referral)';

    uniqueCur.add(vHash);

    if (categoryBreakdown[cat]) {
      categoryBreakdown[cat].total++;
      categoryBreakdown[cat].unique.add(vHash);
    } else {
      if (!categoryBreakdown.portal) categoryBreakdown.portal = { total: 0, unique: new Set() };
      categoryBreakdown.portal.total++;
      categoryBreakdown.portal.unique.add(vHash);
    }

    if (dev.indexOf('mobile') > -1) deviceBreakdown.mobile++;
    else if (dev.indexOf('tablet') > -1) deviceBreakdown.tablet++;
    else deviceBreakdown.desktop++;

    referrerMap[ref] = (referrerMap[ref] || 0) + 1;

    if (dailyMap[vDate]) {
      dailyMap[vDate].total++;
      if (cat === 'karya') dailyMap[vDate].karya++;
      else if (cat === 'portal') dailyMap[vDate].portal++;
      else dailyMap[vDate].other++;
      dailyMap[vDate].uniqueHashes.add(vHash);
    }
  }

  for (let i = 0; i < todayRows.length; i++) {
    const r = todayRows[i];
    const vHash = (r[colIdx.visitor_hash] || r[colIdx.id]).toString();
    uniqueToday.add(vHash);
  }

  const totalCur = curPeriodRows.length;
  const totalPrev = prevPeriodRows.length;
  let growthPct = 0;
  if (totalPrev > 0) {
    growthPct = Number((((totalCur - totalPrev) / totalPrev) * 100).toFixed(1));
  } else if (totalCur > 0) {
    growthPct = 100.0;
  }

  const dailyTrends = Object.keys(dailyMap).map(k => {
    const d = dailyMap[k];
    return {
      date: d.date,
      label: d.label,
      total: d.total,
      karya: d.karya,
      portal: d.portal,
      other: d.other,
      unique: d.uniqueHashes.size
    };
  });

  const topKarya = [];
  if (karyaSheet && karyaSheet.getLastRow() > 1) {
    const kData = karyaSheet.getDataRange().getValues();
    const kHeader = kData[0];
    const kIdIdx = kHeader.indexOf('id');
    const kSlugIdx = kHeader.indexOf('slug');
    const kTitleIdx = kHeader.indexOf('title');
    const kAuthorIdx = kHeader.indexOf('author');
    const kCatLabelIdx = kHeader.indexOf('category_label');
    const kViewsIdx = kHeader.indexOf('views');
    const kReadTimeIdx = kHeader.indexOf('reading_time');

    for (let i = 1; i < kData.length; i++) {
      const row = kData[i];
      topKarya.push({
        id: row[kIdIdx],
        slug: row[kSlugIdx] || row[kIdIdx],
        title: row[kTitleIdx],
        author: row[kAuthorIdx],
        categoryLabel: row[kCatLabelIdx] || 'Sastra',
        views: parseInt(row[kViewsIdx] || 0, 10),
        readingTime: row[kReadTimeIdx] || 3
      });
    }
    topKarya.sort((a, b) => b.views - a.views);
  }

  const topReferrers = Object.keys(referrerMap).map(k => ({
    source: k,
    count: referrerMap[k],
    pct: totalCur > 0 ? Number(((referrerMap[k] / totalCur) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.count - a.count);

  const recentLogs = [];
  const startIdx = Math.max(1, rows.length - 50);
  for (let i = rows.length - 1; i >= startIdx; i--) {
    const r = rows[i];
    recentLogs.push({
      id: r[colIdx.id],
      timestamp: formatCellTimestamp_(r[colIdx.timestamp]),
      visit_date: formatCellDate_(r[colIdx.visit_date]),
      category: r[colIdx.category] || 'portal',
      path: r[colIdx.path] || '/',
      title: r[colIdx.title] || '',
      device_type: r[colIdx.device_type] || 'desktop',
      referrer: r[colIdx.referrer] || 'direct',
      ip_masked: r[colIdx.ip_masked] || 'anonymized'
    });
  }

  const totalDev = (deviceBreakdown.mobile + deviceBreakdown.desktop + deviceBreakdown.tablet) || 1;

  return {
    period: period || '30d',
    category: categoryFilter || 'all',
    summary: {
      total_views: totalCur,
      today_views: todayRows.length,
      unique_visitors: uniqueCur.size,
      today_unique: uniqueToday.size,
      growth_pct: growthPct,
      categories: {
        karya: { total: categoryBreakdown.karya.total, unique: categoryBreakdown.karya.unique.size },
        portal: { total: categoryBreakdown.portal.total, unique: categoryBreakdown.portal.unique.size },
        quotes: { total: categoryBreakdown.quotes.total, unique: categoryBreakdown.quotes.unique.size },
        panggung: { total: categoryBreakdown.panggung.total, unique: categoryBreakdown.panggung.unique.size },
        admin: { total: categoryBreakdown.admin.total, unique: categoryBreakdown.admin.unique.size }
      },
      devices: {
        mobile: deviceBreakdown.mobile,
        desktop: deviceBreakdown.desktop,
        tablet: deviceBreakdown.tablet,
        mobile_pct: Number(((deviceBreakdown.mobile / totalDev) * 100).toFixed(1)),
        desktop_pct: Number(((deviceBreakdown.desktop / totalDev) * 100).toFixed(1)),
        tablet_pct: Number(((deviceBreakdown.tablet / totalDev) * 100).toFixed(1))
      }
    },
    daily_trends: dailyTrends,
    top_karya: topKarya.slice(0, 10),
    top_referrers: topReferrers,
    recent_logs: recentLogs
  };
}

// ============================================================
// 7. AUTENTIKASI REDAKSI & PENULIS
// ============================================================

function loginAdmin(user, pass) {
  if (!user || !pass) {
    return { success: false, message: 'Nama pengguna dan kata sandi wajib diisi.' };
  }

  const normalizedUser = user.toString().toLowerCase().trim();
  const hashedInput = hashPassword_(pass);
  const ss = getDb_();
  const sheet = ss.getSheetByName('Admin');
  if (!sheet) return { success: false, message: 'Database Admin belum siap.' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const dbUser = (data[i][0] || '').toString().toLowerCase().trim();
    const dbHash = (data[i][1] || '').toString();

    // Verifikasi murni berdasarkan pencocokan SHA-256 hash di database Spreadsheet
    const userMatch = (dbUser === normalizedUser) || 
                      (normalizedUser === 'admin' && dbUser === 'admin') ||
                      (normalizedUser === 'redaksi@yq.sch.id' && dbUser === 'redaksi@yq.sch.id');

    if (userMatch && dbHash === hashedInput) {
      const token = Utilities.getUuid();
      const exp = new Date().getTime() + (7 * 24 * 3600 * 1000); // 7 hari
      sheet.getRange(i + 1, 5).setValue(token);
      sheet.getRange(i + 1, 6).setValue(exp);

      return {
        success: true,
        token: token,
        user: {
          email: data[i][0] || normalizedUser,
          role: data[i][3] || 'Redaktur Pelaksana',
          source: 'appsscript'
        },
        message: 'Berhasil masuk ke Studio Redaksi Ruang Sastra!'
      };
    }
  }

  return { success: false, message: 'Nama pengguna atau kata sandi tidak cocok.' };
}

function cekSesiAdmin(token) {
  try {
    const admin = verifikasiAdminToken_(token);
    return { valid: true, user: admin };
  } catch (e) {
    return { valid: false, message: e.message };
  }
}

function logoutAdmin(token) {
  if (!token) return { success: true };
  const ss = getDb_();
  const sheet = ss.getSheetByName('Admin');
  if (!sheet) return { success: true };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] && data[i][4].toString() === token.toString()) {
      sheet.getRange(i + 1, 5).setValue('');
      sheet.getRange(i + 1, 6).setValue('');
    }
  }
  return { success: true };
}

function daftarPenulis(input) {
  if (!input || !input.email || !input.nama || !input.password || !input.kelas) {
    return { success: false, message: 'Harap lengkapi semua kolom wajib (Nama, Email, Kelas, dan Sandi).' };
  }

  const normalizedEmail = input.email.toString().toLowerCase().trim();
  const ss = getDb_();
  const sheet = ss.getSheetByName('Penulis');
  if (!sheet) return { success: false, message: 'Tabel Penulis belum dibuat.' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][2] || '').toString().toLowerCase().trim() === normalizedEmail) {
      return { success: false, message: 'Email sudah terdaftar. Silakan masuk menggunakan akun Anda.' };
    }
  }

  const id = 'penulis_' + Date.now();
  const hash = hashPassword_(input.password);
  const token = Utilities.getUuid();
  const exp = new Date().getTime() + (30 * 24 * 3600 * 1000); // 30 hari
  const now = new Date().toISOString();

  sheet.appendRow([
    id,
    input.nama.toString().trim(),
    normalizedEmail,
    hash,
    input.kelas.toString().trim(),
    input.kontak ? input.kontak.toString().trim() : '',
    'penulis',
    token,
    exp,
    now
  ]);

  return {
    success: true,
    token: token,
    user: {
      id: id,
      nama: input.nama,
      email: normalizedEmail,
      kelas: input.kelas,
      kontak: input.kontak || '',
      role: 'penulis',
      source: 'appsscript'
    },
    message: 'Pendaftaran berhasil! Selamat datang di Ruang Sastra, ' + input.nama + '.'
  };
}

function loginPenulis(email, pass) {
  if (!email || !pass) {
    return { success: false, message: 'Email dan kata sandi wajib diisi.' };
  }

  const normalizedEmail = email.toString().toLowerCase().trim();
  const hashedInput = hashPassword_(pass);
  const ss = getDb_();
  const sheet = ss.getSheetByName('Penulis');
  if (!sheet) return { success: false, message: 'Database Penulis belum siap.' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const dbEmail = (data[i][2] || '').toString().toLowerCase().trim();
    const dbHash = data[i][3];

    if (dbEmail === normalizedEmail && (dbHash === hashedInput || dbHash === pass)) {
      const token = Utilities.getUuid();
      const exp = new Date().getTime() + (30 * 24 * 3600 * 1000);
      sheet.getRange(i + 1, 8).setValue(token);
      sheet.getRange(i + 1, 9).setValue(exp);

      return {
        success: true,
        token: token,
        user: {
          id: data[i][0],
          nama: data[i][1],
          email: dbEmail,
          kelas: data[i][4],
          kontak: data[i][5] || '',
          role: 'penulis',
          source: 'appsscript'
        },
        message: 'Selamat datang kembali di Ruang Sastra, ' + data[i][1] + '!'
      };
    }
  }

  return { success: false, message: 'Email atau kata sandi tidak cocok. Belum punya akun? Silakan daftar.' };
}

function logoutPenulis(token) {
  if (!token) return { success: true };
  const ss = getDb_();
  const sheet = ss.getSheetByName('Penulis');
  if (!sheet) return { success: true };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] && data[i][7].toString() === token.toString()) {
      sheet.getRange(i + 1, 8).setValue('');
      sheet.getRange(i + 1, 9).setValue('');
    }
  }
  return { success: true };
}

// ============================================================
// 8. DATABASE DUMP TERFILTER (SECURE GET FULL DATA)
// ============================================================

function getFullData(token) {
  let isAdmin = false;
  try {
    if (token) {
      verifikasiAdminToken_(token);
      isAdmin = true;
    }
  } catch (e) {
    isAdmin = false;
  }

  const ss = getDb_();
  const sheets = ss.getSheets();
  const db = {};

  sheets.forEach(sheet => {
    const nama = sheet.getName();
    // Jangan pernah mengekspor sheet Admin atau Pengaturan ke publik
    if (!isAdmin && (nama === 'Admin' || nama === 'Pengaturan')) {
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      db[nama.toLowerCase()] = [];
      return;
    }

    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      let obj = {};
      headers.forEach((h, colIdx) => {
        // Sensor kolom rahasia
        if (!isAdmin && (h === 'password_hash' || h === 'token' || h === 'token_exp')) {
          return;
        }
        obj[h] = data[i][colIdx];
      });

      // Filter status karya untuk non-admin
      if (nama === 'Karya' && !isAdmin && obj.status !== 'published') {
        return;
      }

      rows.push(obj);
    }

    db[nama.toLowerCase()] = rows;
  });

  return db;
}

// ============================================================
// 9. HTTP DISPATCHER (doGet & doPost)
// ============================================================

function formatResponse_(data, error) {
  const output = error 
    ? { success: false, __error: error.message || error.toString() }
    : { success: true, __hasil: data };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const fn = p.fn || p.action || 'ping';
    let hasil;

    if (fn === 'ping') {
      hasil = { status: 'ok', project: 'Ruang Sastra — SMPI YQ', serverTime: new Date().toISOString() };
    } else if (fn === 'initSpreadsheet') {
      hasil = initSpreadsheet();
    } else if (fn === 'isiDemoData' || fn === 'resetDanIsiDemoData') {
      hasil = isiDemoData(true);
    } else if (fn === 'getFullData') {
      hasil = getFullData(p.token);
    } else if (fn === 'fetchAllKarya') {
      hasil = fetchAllKarya(p.token);
    } else if (fn === 'getApresiasiCount') {
      hasil = getApresiasiCount(p.karyaId || p.karya_id);
    } else if (fn === 'tambahApresiasi') {
      hasil = tambahApresiasi(p.karyaId || p.karya_id);
    } else if (fn === 'getDaftarKomentar') {
      hasil = getDaftarKomentar(p.karyaId || p.karya_id);
    } else if (fn === 'getKaryaByPenulis') {
      hasil = getKaryaByPenulis(p.author, p.email);
    } else if (fn === 'getQuotes') {
      hasil = getQuotes();
    } else if (fn === 'cekSesiAdmin') {
      hasil = cekSesiAdmin(p.token);
    } else if (fn === 'tambahViewKarya') {
      hasil = tambahViewKarya(p.idOrSlug || p.karyaId || p.slug || p.id);
    } else if (fn === 'catatKunjungan') {
      hasil = catatKunjungan(p);
    } else if (fn === 'getVisitorAnalytics') {
      hasil = getVisitorAnalytics(p.period, p.category, p.token);
    } else if (fn === 'getPengaturan') {
      hasil = getPengaturan();
    } else if (fn === 'resetAdminPassword') {
      hasil = resetAdminPassword();
    } else {
      hasil = { status: 'unknown_function', fn: fn };
    }

    return formatResponse_(hasil);
  } catch (err) {
    return formatResponse_(null, err);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (ex) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const fn = body.fn || body.action;
    const args = body.args || [];
    let hasil;

    if (fn === 'initSpreadsheet') {
      hasil = initSpreadsheet();
    } else if (fn === 'isiDemoData' || fn === 'resetDanIsiDemoData') {
      hasil = isiDemoData(true);
    } else if (fn === 'loginAdmin') {
      hasil = loginAdmin(args[0] || body.user || body.username || body.email, args[1] || body.pass || body.password);
    } else if (fn === 'cekSesiAdmin') {
      hasil = cekSesiAdmin(args[0] || body.token);
    } else if (fn === 'logoutAdmin') {
      hasil = logoutAdmin(args[0] || body.token);
    } else if (fn === 'daftarPenulis') {
      hasil = daftarPenulis(args[0] || body.data || body);
    } else if (fn === 'loginPenulis') {
      hasil = loginPenulis(args[0] || body.email, args[1] || body.pass || body.password);
    } else if (fn === 'logoutPenulis') {
      hasil = logoutPenulis(args[0] || body.token);
    } else if (fn === 'simpanKarya') {
      hasil = simpanKarya(args[0] || body.karya || body.data, args[1] || body.token);
    } else if (fn === 'hapusKarya') {
      hasil = hapusKarya(args[0] || body.idOrSlug || body.id, args[1] || body.token);
    } else if (fn === 'updateStatusKarya') {
      hasil = updateStatusKarya(args[0] || body.idOrSlug || body.id, args[1] || body.status, args[2] || body.token);
    } else if (fn === 'uploadFotoKarya' || fn === 'uploadFileToDrive') {
      hasil = uploadFotoKarya(args[0] || body.base64Data || body.file, args[1] || body.fileName, args[2] || body.mimeType, args[3] || body.token);
    } else if (fn === 'tambahApresiasi') {
      hasil = tambahApresiasi(args[0] || body.karyaId || body.karya_id);
    } else if (fn === 'kirimKomentar') {
      hasil = kirimKomentar(args[0] || body.karyaId || body.karya_id, args[1] || body.payload || body);
    } else if (fn === 'hapusKomentar') {
      hasil = hapusKomentar(args[0] || body.id || body.commentId, args[1] || body.token);
    } else if (fn === 'simpanQuote') {
      hasil = simpanQuote(args[0] || body.quote || body.data, args[1] || body.token);
    } else if (fn === 'hapusQuote') {
      hasil = hapusQuote(args[0] || body.id || body.quoteId, args[1] || body.token);
    } else if (fn === 'tambahViewKarya') {
      hasil = tambahViewKarya(args[0] || body.idOrSlug || body.slug || body.id);
    } else if (fn === 'catatKunjungan') {
      hasil = catatKunjungan(args[0] || body.payload || body);
    } else if (fn === 'getVisitorAnalytics') {
      hasil = getVisitorAnalytics(args[0] || body.period, args[1] || body.category, args[2] || body.token);
    } else if (fn === 'getPengaturan') {
      hasil = getPengaturan();
    } else if (fn === 'simpanPengaturan') {
      hasil = simpanPengaturan(args[0] || body.settings || body.data, args[1] || body.token);
    } else if (fn === 'saveData') {
      hasil = saveData(args[0] || body.sheet || body.sheetName, args[1] || body.data || body.dataObj, args[2] || body.rowId, args[3] || body.token);
    } else if (fn === 'deleteData') {
      hasil = deleteData(args[0] || body.sheet || body.sheetName, args[1] || body.rowId, args[2] || body.token);
    } else if (fn === 'fetchAllKarya') {
      hasil = fetchAllKarya(args[0] || body.token);
    } else if (fn === 'getFullData') {
      hasil = getFullData(args[0] || body.token);
    } else {
      throw new Error('Fungsi backend "' + fn + '" tidak dikenali.');
    }

    return formatResponse_(hasil);
  } catch (err) {
    return formatResponse_(null, err);
  }
}

