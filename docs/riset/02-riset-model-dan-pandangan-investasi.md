# Riset Model Simulasi & Pandangan Manajemen Investasi (Draft untuk diskusi, 23 Okt 2026)

Lanjutan dari [riset awal](01-riset-awal-dan-desain-model.md). Dua pertanyaan:
**(A)** model apa yang dipakai riset & industri untuk mensimulasikan investasi saham, dan di mana posisi model kita;
**(B)** sebagai manajemen investasi, pandangan apa yang paling penting dalam memilih instrumen.
Angka "uji tuas" di §B dihitung dengan mesin dca-lab (Rp1 jt/bln × 10 thn, mode dasar, 4.000 jalur).

---

## A. Model simulasi investasi saham

### A.1 Peta keluarga model

| Keluarga | Contoh / siapa yang pakai | Kekuatan | Kelemahan |
|---|---|---|---|
| Deterministik | kalkulator "return 10%/thn" | sederhana | tidak ada risiko sama sekali |
| Lognormal / GBM (Monte Carlo normal) | banyak robo-advisor & kalkulator pensiun | mudah, parameter sedikit | ekor tipis, crash berurutan hilang; backtest SOA 2004–2008 menempatkan hasil nyata di ekor ~3% |
| Regime-switching lognormal (Hardy 2001) | standar aktuaria (cadangan asuransi, Solvency II) | ada rezim "tenang" & "krisis" | parameter sulit diestimasi, satu pasar |
| GARCH / Filtered Historical Simulation (Barone-Adesi) | manajemen risiko bank (VaR) | menyesuaikan dengan volatilitas *saat ini* | unggul di horizon pendek; untuk horizon tahunan+ hasil backtest campuran (LT-FHS 2026 masih working paper) |
| **Bootstrap / block bootstrap historis** | Fama & French (2018) "Long-horizon returns"; Anarkulova, Cederburg & O'Doherty (2022, JFE) | memakai return asli: ekor tebal, crash, korelasi | terikat sejarah yang dipakai; rata-rata ikut sejarah |
| Economic Scenario Generator / VAR (Vanguard VCMM, Moody's, Conning) | asset manager & dana pensiun besar | mengaitkan valuasi, suku bunga, inflasi, return | kompleks, butuh tim; tetap bergantung asumsi |
| Prediksi (regresi prediktor, ML, ARIMA/LSTM) | riset akademik, trader | – | **gagal di luar sampel** untuk return pasar (§A.2) |

### A.2 Apa kata riset (temuan yang paling relevan untuk kita)

1. **Memprediksi return pendek hampir mustahil.** Goyal, Welch & Zafirov (RFS 2024) menguji ulang
   46 variabel prediktor return pasar. Lebih dari sepertiganya sudah kehilangan daya prediksi, dan
   hanya segelintir yang bertahan di luar sampel. Vanguard: korelasi sinyal populer dengan return
   1 tahun ke depan ≈ 0, "lebih rendah dari curah hujan".
   → **Simulasi, bukan prediksi** adalah pendekatan yang benar.
2. **Valuasi hanya berguna untuk horizon panjang, dan itu pun sebagian.** CAPE / P/E menjelaskan
   ~40% variasi return riil 10 tahun ke depan (Vanguard, in-sample 1926–2011).
   → Pakai valuasi untuk **menggeser titik tengah** (CMA), jangan untuk timing.
3. **Ketidakpastian rata-rata return mendominasi di horizon panjang.** Fama & French (2018):
   "uncertainty about the expected return has a substantial impact on uncertainty about long-horizon
   payoffs." Model kita sekarang menganggap rata-ratanya *pasti* (hanya digeser per mode).
   → Perbaikan #1 di §A.4.
4. **Sejarah satu negara terlalu sempit.** Anarkulova dkk. memakai block bootstrap atas 39 negara
   maju (1841–2019). Peluang investor saham domestik kalah dari inflasi dalam 30 tahun **≈12%**,
   satu orde lebih besar dari estimasi data AS saja. Saham internasional ≈4%, karena kurs
   mengimbangi inflasi lokal.
   → Memakai sejarah satu pasar (apalagi pasar pemenang) membuat simulasi terlalu optimis.
   Kita sendiri melihat efeknya: drawdown p95 IHSG **-78%** jika sejarahnya dimulai 1990 (memuat 1998),
   tetapi **-64%** jika mulai 2004.
5. **Return saham individual sangat miring.** Bessembinder (JFE 2018): 4% saham terbaik menjelaskan
   seluruh kelebihan return pasar AS atas T-bill sejak 1926. Mayoritas saham memberi return seumur
   hidup di bawah T-bill.
   → Memegang sedikit saham = besar kemungkinan *tidak* memegang si 4%. Diversifikasi bukan
   sekadar "mengurangi volatilitas", tapi memastikan ikut memiliki pemenang.

### A.3 Posisi model dca-lab saat ini

Stationary block bootstrap + recentering ke CMA = keluarga "bootstrap historis" (sama dengan
Fama-French & Anarkulova dkk.), plus titik tengah berbasis CMA (meniru gagasan VCMM).
Untuk perencanaan DCA 3–20 tahun ini pilihan yang tepat: lebih jujur soal ekor daripada GBM, jauh
lebih sederhana daripada ESG, dan sudah lolos uji kalibrasi awal (riset awal §3).

### A.4 Perbaikan, diurutkan dari dampak terbesar

| # | Perbaikan | Kenapa | Usaha |
|---|---|---|---|
| 1 | **Ketidakpastian parameter**: tiap jalur menarik rata-rata return sendiri, mis. N(CMA, 1,5–2%/thn) | Fama-French §A.2-3; uji kalibrasi S&P menunjukkan pita p25–p75 terlalu sempit (cakupan 36% vs ideal 50%) | kecil |
| 2 | **Perpustakaan krisis lintas negara**: blok crash dari pasar lain (Thailand/Korea 1997, Jepang 1990, Yunani 2010, dll.) disisipkan dengan peluang kecil | Anarkulova dkk.; sejarah IDX 36 tahun belum memuat semua jenis bencana | sedang |
| 3 | **CMA berbasis valuasi terkini**: titik tengah IHSG dari dividend/earnings yield hari ini, SBN dari yield hari ini | setelah IHSG -40% di 2026, yield naik; CMA statis 9% mengabaikannya | sedang |
| 4 | **Skala volatilitas per rezim** (FHS-lite): skala residual ke volatilitas 3 tahun terakhir untuk kripto; opsi "kondisi saat ini" untuk horizon ≤2 thn | vol BTC turun dari ~80% (2014–18) ke ~40% (2026) | kecil |
| – | *Tidak disarankan*: model prediksi harga (ML/ARIMA) | gagal di luar sampel (§A.2-1), memberi kepastian palsu | – |

---

## B. Pandangan manajemen investasi: apa yang paling menentukan?

### B.1 Uji tuas dengan mesin kita

| Tuas keputusan | Pilihan | p5 | p50 | P(rugi) | Median max DD | DD terburuk (p95) | Setoran utk Rp200 jt @80% |
|---|---|---|---|---|---|---|---|
| **Negara/mata uang** | 100% IHSG | 83 jt | 201 jt | 17% | -51% | -78% | Rp1,56 jt |
| | 50% IHSG + 50% S&P 500 | **117 jt** | 195 jt | **6%** | **-28%** | -52% | **Rp1,31 jt** |
| **Alokasi saham vs pendapatan tetap** | 100% saham (50/50) | 117 jt | 195 jt | 6% | -28% | -52% | Rp1,31 jt |
| | 70% saham / 30% SBN | 129 jt | 185 jt | 3% | -19% | -35% | Rp1,29 jt |
| | 40% saham / 60% SBN+RDPU | 141 jt | 173 jt | 0% | -9% | -17% | Rp1,28 jt |
| **Biaya** (IHSG via reksa dana) | +0,5%/thn (indeks/ETF) | 81 jt | 195 jt | 18% | -52% | -78% | Rp1,60 jt |
| | +2,5%/thn (aktif, tanpa alpha) | 74 jt | **175 jt** | 24% | -54% | -80% | **Rp1,77 jt** |
| **Pilih saham vs indeks** (sejarah sama 2004–2026) | IHSG | 101 jt | 193 jt | 11% | -38% | -64% | Rp1,43 jt |
| | BBCA | 103 jt | 194 jt | 11% | -39% | -60% | Rp1,41 jt |
| | BMRI | 85 jt | 194 jt | 17% | -53% | -75% | Rp1,57 jt |
| **Asumsi return yang benar** (50/50) | historis / dasar / konservatif | 144 / 117 / 104 jt | 245 / 195 / 173 jt | 2 / 6 / 11% | | | Rp1,06 / 1,31 / 1,47 jt |

Cara membaca:
- **Diversifikasi negara** menurunkan peluang rugi 17% → 6% dan drawdown median -51% → -28%,
  dengan median hasil hampir sama. Setoran yang dibutuhkan juga turun 16%. Ini "makan siang
  gratis" terbesar di tabel.
- **Alokasi saham/obligasi** menukar potensi atas dengan lantai yang lebih tinggi. Tuas ini untuk
  menyesuaikan **kemampuan menahan rugi**, bukan untuk menaikkan hasil.
- **Biaya 2%/thn** memangkas median ~10% dan menaikkan setoran yang dibutuhkan ~11%. Ini satu-satunya
  tuas yang hasilnya **pasti**.
- **Saham pilihan**: dengan ekspektasi = pasar, saham tunggal tidak menambah median, hanya menambah
  risiko (BMRI) atau kurang lebih sama (BBCA). Lagi pula keempat saham ini dipilih *karena* sudah
  terbukti menang (survivorship).
- **Asumsi return** adalah ketidakpastian terbesar: setoran yang dibutuhkan bisa Rp1,06–1,47 jt
  (±20%) tergantung masa depan. Karena itu **rencanakan dengan mode konservatif**, dan anggap hasil
  lebih baik sebagai bonus.

### B.2 Hierarki pandangan (usulan untuk didiskusikan)

1. **Tujuan & kapan uangnya dipakai** menentukan berapa risiko yang *boleh* diambil.
   Tidak ada instrumen terbaik secara umum, yang ada instrumen yang cocok untuk tiap tujuan.
   Dana untuk 2 tahun lagi tidak boleh di aset yang bisa turun 40% dalam 10 bulan (IHSG 2026).
2. **Alokasi aset & diversifikasi negara** menentukan sebagian besar *naik-turun* portofolio.
   Ibbotson & Kaplan (2000): kebijakan alokasi menjelaskan ~90% variasi return portofolio dari waktu
   ke waktu, ~40% perbedaan antar-portofolio, dan ~100% level return rata-rata sebelum biaya.
   Untuk investor Indonesia, porsi global yang cukup adalah tuas terbesar yang paling sering
   diabaikan (home bias): lihat B.1 dan Anarkulova dkk. (domestik 12% vs internasional 4% peluang
   kalah dari inflasi).
3. **Ekspektasi realistis, bukan masa lalu.** Backtest BBCA 19,5%/thn atau BTC 77%/thn adalah
   *sejarah pemenang*. Gunakan CMA dan rencanakan di skenario konservatif.
4. **Biaya & pajak** adalah satu-satunya hal yang pasti. Pilih produk indeks/ETF berbiaya rendah,
   manfaatkan pembebasan PPh dividen (investasi ulang ≥3 thn), dan hindari exchange kripto luar
   negeri (PPh 1% vs 0,21%).
5. **Perilaku: bisa bertahan saat jatuh.** Morningstar *Mind the Gap* 2025: investor dana AS
   tertinggal ~1,2%/thn dari dananya sendiri. Gap-nya ~2%/thn di dana paling volatil vs 0,4% di
   yang paling tenang. Ada kritik (FAJ 2026) bahwa porsi akibat *timing* jauh lebih kecil (~0,1%/thn),
   tapi arahnya sama: instrumen yang membuatmu panik jual adalah instrumen yang salah, berapa pun
   return rata-ratanya.
   → **Max drawdown yang sanggup ditahan** adalah batas yang mengikat dalam memilih instrumen.
6. **Memilih saham / timing pasar** bernilai paling kecil bagi kebanyakan orang. Bessembinder
   (return terkonsentrasi di sedikit saham), SPIVA (mayoritas fund aktif kalah dari indeks dalam
   10 thn di hampir semua negara), dan Bareksa (per Jul 2023 hanya 14 reksa dana saham yang
   mengalahkan IHSG dalam 10 thn).
   → Kalau mau memilih saham, sebagai *satelit* ≤20%.
7. **Risiko struktural sebagai filter, bukan pendorong**: tata kelola & likuiditas pasar (kasus MSCI),
   regulator & kustodian (kripto di bawah OJK sejak 10 Jan 2025, POJK 27/2024), dan jaminan negara
   (SBN dijamin negara; deposito dijamin LPS sampai batas tertentu).

### B.3 Konteks hidup: IHSG & MSCI, Oktober 2026

- IHSG: 8.647 (akhir 2025) → 4.997 (19 Okt 2026), **≈ -42%**. Dalam USD lebih buruk karena Rupiah
  juga melemah (16.741 → ~17.900).
- 15 Okt 2026: MSCI membuka konsultasi untuk menurunkan Indonesia dari Emerging ke **Standalone
  Market**. Alasannya: struktur kepemilikan tidak jelas, kepemilikan terkonsentrasi, dugaan
  perdagangan terkoordinasi. Masukan dibuka sampai 30 Apr 2027, keputusan paling lambat
  30 Jun 2027. MSCI "expects to proceed" kecuali ada bukti perbaikan material. Hari pengumuman,
  IHSG turun ~11%, penurunan harian terbesar dalam 28 tahun.
- Di model kita, kejadian ini **bukan anomali**: median max drawdown IHSG 10 thn = -51%. Backtest
  2015–2025 tidak akan pernah menunjukkannya, simulasi menunjukkannya.

Pandangan manajemen investasi:
- **Jangan berhenti DCA dan jangan panik jual.** DCA justru membeli lebih banyak unit saat harga
  rendah, dan rebalancing tahunan otomatis menambah porsi IHSG yang sudah turun. Itu disiplin,
  bukan menebak dasar.
- **Jangan juga menaikkan konsentrasi** ke Indonesia karena "sudah murah". Risiko arus keluar paksa
  dari dana indeks EM masih menggantung sampai Juni 2027, dan diversifikasi negara adalah tuas #2.
- Ini argumen kuat untuk **porsi global yang lebih besar** di portofolio model, dan untuk menambah
  indeks global (MSCI World/ACWI) di samping S&P 500 agar tidak bergantung pada satu negara lain.

---

## C. Usulan perubahan (menunggu keputusan bersama)

1. Model: implementasikan perbaikan #1 (ketidakpastian parameter) dan #3 (CMA berbasis valuasi), lalu
   ulang uji kalibrasi.
2. Instrumen: tambahkan indeks global (ACWI/MSCI World) dan indeks IDX total-return.
3. Portofolio model: geser porsi saham dari ~50/50 IHSG/S&P ke kisaran **35–40% Indonesia /
   60–65% global**, sejalan dengan B.1 dan Anarkulova dkk. Mereka bahkan menyarankan 33/67 untuk
   investor negara maju.
4. UI: tonjolkan **p5, P(rugi), max drawdown, dan setoran yang dibutuhkan @80%**, bukan median.

**Pertanyaan diskusi:**
- Berapa porsi Indonesia vs global yang nyaman untukmu, mengingat kewajiban masa depan (rumah,
  sekolah) dalam Rupiah?
- Max drawdown berapa yang benar-benar sanggup kamu tahan tanpa menjual? (IHSG 2026 = -42%)
- Untuk saham pilihan, perlu kerangka *screening* (kualitas, valuasi, likuiditas, free float), atau
  cukup indeks saja?

---

## Sumber

- Anarkulova, Cederburg & O'Doherty (2022). [Stocks for the Long Run? Evidence from a Broad Sample of Developed Markets](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3594660), *JFE* 143(1) · [Long-Horizon Losses in Stocks, Bonds, and Bills](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3964908) · [Beyond the Status Quo (AEA 2025)](https://www.aeaweb.org/conference/2025/program/paper/EFddaa8b)
- Fama & French (2018). [Long-Horizon Returns](https://www.chicagobooth.edu/research/fama-miller/finance-research/working-papers/2017/long-horizon-returns), *RFS*
- Goyal, Welch & Zafirov (2024). [A Comprehensive 2022 Look at the Empirical Performance of Equity Premium Prediction](https://academic.oup.com/rfs/article/37/11/3490/7749383), *RFS* 37(11)
- Bessembinder (2018). [Do Stocks Outperform Treasury Bills?](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2900447), *JFE* 129(3)
- Ibbotson & Kaplan (2000), lewat [CFA Institute — Setting the record straight on asset allocation](https://blogs.cfainstitute.org/investor/2012/02/16/setting-the-record-straight-on-asset-allocation)
- Vanguard, *Forecasting stock returns: What signals matter*, lewat [Capital Spectator](https://www.capitalspectator.com/?p=2436) & [Canadian Couch Potato](https://canadiancouchpotato.com/2013/02/25/estimating-future-stock-returns/)
- Hardy (2001) & model regime-switching: [Freeland, SOA monograph](https://www.soa.org/globalassets/assets/files/resources/essays-monographs/2009-erm-symposium/mono-2009-m-as09-1-freeland.pdf) · [Bégin, On complex ESGs: is less more?](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/E2C5F1AC813302DBD548ABD301C2B0DF/S0515036121000210a.pdf/on-complex-economic-scenario-generators-is-less-more.pdf) · [Evolution of ESGs (IFoA)](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/CCD87C42232C2BC03F5A578E14572BAB/S1357321718000181a.pdf/evolution-of-economic-scenario-generators-a-report-by-the-extreme-events-working-party-members.pdf)
- Filtered Historical Simulation: [Barone-Adesi dkk., LT-FHS 2026](https://filteredhistoricalsimulation.com/downloads/GBA_FHS_Feb%202026_ssrn-6120707.pdf) · [MathWorks — bootstrapping & FHS](https://www.mathworks.com/help/econ/using-bootstrapping-and-filtered-historical-simulation-to-evaluate-market-risk.html)
- [UBS Global Investment Returns Yearbook 2025](https://www.ubs.com/global/en/investment-bank/insights-and-data/2025/global-investment-returns-yearbook-2025.html): saham dunia 1900–2024 riil 5,2%/thn; sejak 2000 3,5%
- Morningstar *Mind the Gap*: [CNBC 2025](https://www.cnbc.com/2025/10/27/morningstar-research-investors-lose-out-on-mutual-fund-etf-returns.html) · [Advisor Perspectives 2026](https://www.advisorperspectives.com/commentaries/2026/08/21/what-advisors-can-learn-from-the-investor-return-gap) · kritik: [FAJ 2026](https://rpc.cfainstitute.org/research/financial-analysts-journal/2026/bad-timing-does-not-cost-investors-funds-returns)
- SPIVA: [India YE2025](https://www.spglobal.com/spdji/en/documents/spiva/spiva-india-scorecard-year-end-2025.pdf) · [Latin America YE2025](https://www.spglobal.com/spdji/en/documents/spiva/spiva-latin-america-year-end-2025.pdf) · [Global perspective](https://www.spglobal.com/spdji/en/index-tv/article/spiva-by-the-numbers-a-global-perspective/)
- Reksa dana Indonesia vs IHSG: [Bareksa Jul 2023](https://www.bareksa.com/berita/reksa-dana/2023-07-13/reksadana-aktif-sulit-kalahkan-pasar-index-fund-ini-malah-cuan-19-setahun-terakhir)
- MSCI & IHSG 2026: [MSCI press release](https://ir.msci.com/news-releases/news-release-details/msci-launches-consultation-proposal-reclassify-indonesia) · [Jakarta Post](https://www.thejakartapost.com/business/2026/10/16/msci-weighs-downgrading-indonesia-to-standalone-market-status) · [Euronews](https://www.euronews.com/2026/10/16/indonesian-stocks-plunge-11-as-msci-proposes-emerging-market-downgrade) · [CNBC Indonesia](https://www.cnbcindonesia.com/research/20261019103627-128-777380/10-bursa-saham-terburuk-di-dunia-ihsg-nomor-satu); level IHSG dari Yahoo Finance
- Volatilitas kripto: [The Block, Okt 2026](https://theblock.co/news/markets/2026-10-21-bitcoin-volatility-nears-2026-lows-as-traders-brace-for-fed-decision-and-us-midterms-421524) · [KuCoin 2026](https://www.kucoin.com/blog/fr-crypto-vs-stocks) (sekunder; perlu cek Coin Metrics/Kaiko)
- Regulasi kripto: [Bisnis — OJK awasi kripto mulai 10 Jan 2025](https://market.bisnis.com/read/20250110/94/1830566/ojk-mulai-awasi-perdagangan-aset-kripto-ini-aturan-terbarunya)
