# CARINE SAKURA LOVE — CHRISTMAS REEL READY

## Update v7

- Warna seluruh lyric utama dibuat hitam murni (`#000000`).
- Frame foto sekarang muncul tepat pada `start` lyric dan mulai keluar tepat pada `end` lyric.
- Gap antar lyric tidak lagi menahan frame lama di layar.
- Final video tetap satu file: `assets/media/videos/video-01.mp4`.
- Animasi keluar tidak dipotong sebelum transition selesai.


Versi ini mempertahankan alur taman sakura, tetapi setelah kertas rahasia ditekan akan muncul **cinematic Christmas memory reel ±46,19 detik** sebelum galeri foto/video terbuka.

## Yang sudah dibuat

- Reel fullscreen bernuansa gelap/cinematic seperti referensi.
- Crossfade foto/video + Ken Burns movement.
- Grain, vignette, glow/light leak halus.
- Lyric overlay sinkron berdasarkan timestamp.
- Font script aesthetic **Parisienne** untuk tulisan tangan.
- Font editorial **Cormorant Garamond** untuk variasi lirik.
- Progress bar dan counter 00:00 / 00:46.
- Tombol skip.
- Setelah reel selesai, galeri memories lama tetap muncul.
- Semua foto/video tetap dideteksi otomatis.

## 1. Isi foto

Masukkan ke:

```text
assets/media/photos/
```

Nama file:

```text
photo-01.jpg
photo-02.jpg
...
photo-12.jpg
```

Tidak wajib mengisi semuanya.

## 2. Isi video

Masukkan ke:

```text
assets/media/videos/
```

Nama file:

```text
video-01.mp4
video-02.mp4
...
video-06.mp4
```

Format aman untuk iPhone/Safari: **MP4 / H.264 / AAC**.

## 3. Isi musik

Masukkan audio milik Anda ke:

```text
assets/media/music/music.mp3
```

Untuk hasil yang paling mirip dengan video referensi, gunakan potongan audio sekitar **46,19 detik**. Website akan menghentikan reel pada durasi tersebut.

## 4. Isi lirik tanpa edit kode

Buka:

```text
assets/media/lyrics/lyrics.txt
```

Contoh format:

```text
00:04.25|00:08.15|serif|[ISI LIRIK BARIS 01]
```

Artinya:

- `00:04.25` = mulai tampil
- `00:08.15` = selesai
- `serif` = jenis tampilan
- bagian terakhir = teks yang tampil

Pilihan gaya:

```text
script
serif
small
```

Gunakan `\\n` jika ingin membuat dua baris dalam satu scene.

> Template timestamp sudah disiapkan mengikuti durasi video referensi 46,186646 detik. Isi liriknya sendiri di file tersebut.

## Struktur folder

```text
carine-christmas-reel-READY/
│
├── index.html
├── styles.css
├── app.js
├── server.py
├── start.bat
├── README.md
├── ISI-MEDIA-SAJA.txt
│
└── assets/
    └── media/
        ├── photos/
        │   └── photo-01.jpg ...
        ├── videos/
        │   └── video-01.mp4 ...
        ├── music/
        │   └── music.mp3
        └── lyrics/
            └── lyrics.txt
```

## Cara menjalankan

Di folder project:

```powershell
py server.py
```

atau klik `start.bat`.

Buka URL yang muncul di terminal. Untuk iPhone, PC dan iPhone harus berada di Wi-Fi yang sama.

---

## PREVIEW LIRIK SUDAH TERISI

Versi ini sudah mempunyai teks lyric-style yang mengikuti teks yang terlihat pada video referensi.
Jadi walaupun folder foto/video masih kosong, setelah membuka Christmas Reel Anda tetap dapat melihat font, animasi, posisi, dan timing lirik.

Jika ingin mengganti lirik/timing, edit:

```text
assets/media/lyrics/lyrics.txt
```
