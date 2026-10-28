import type { Metadata } from "next";
import Link from "next/link";
import { Icon3D, type Icon3DName } from "@/components/icon3d";

export const metadata: Metadata = {
  title: "Cara ngitungnya",
  description: "Gimana Cobain ngitung masa depan uangmu: data, perkiraan, lempar dadu 4.000 kali, dan bukti ketepatannya.",
};

const STEPS: { icon: Icon3DName; title: string; text: string }[] = [
  { icon: "saham", title: "Ambil sejarah harganya", text: "Harga bulanan dari Yahoo Finance, termasuk dividen. Yang pakai dolar atau mata uang lain kita ubah ke Rupiah tiap bulan." },
  { icon: "dunia", title: "Pasang perkiraan yang wajar", text: "Kita nggak pakai rata-rata masa lalu si saham sendiri, soalnya yang dulu melesat belum tentu melesat lagi. Kita pakai perkiraan buat pasarnya secara umum." },
  { icon: "dadu", title: "Kocok kayak kartu", text: "Sejarah naik-turunnya dipotong-potong (rata-rata 1 tahun per potong), terus diacak jadi 4.000 masa depan. Krisis 1998, 2008, COVID, sampai 2026 ikut kebawa apa adanya." },
  { icon: "keranjang", title: "Akui kita nggak tahu pasti", text: "Tiap masa depan pakai rata-rata yang sedikit beda. Aset yang naik-turunnya ekstrem, perkiraannya kita rem biar nggak keliatan kebagusan." },
  { icon: "celengan", title: "Jalanin tabunganmu", text: "Di tiap masa depan: setor tiap awal bulan, potong biaya beli, kena naik-turun pasar, dan di akhir dipotong biaya jual + pajak." },
];

const CALIBRATION = [
  { name: "IHSG", n: 86, wide: "95%", mid: "66%" },
  { name: "S&P 500 (dalam Rupiah)", n: 42, wide: "98%", mid: "36%" },
  { name: "BBCA", n: 30, wide: "93%", mid: "63%" },
  { name: "TLKM", n: 29, wide: "97%", mid: "48%" },
  { name: "Emas (dalam Rupiah)", n: 42, wide: "83%", mid: "62%" },
];

const ASSUMPTIONS = [
  ["Saham & reksa dana indeks Indonesia", "9%", "7%"],
  ["Saham & ETF Amerika (dalam dolar)", "5,5%", "4%"],
  ["Saham negara lain", "6%", "4,5%"],
  ["Emas (dalam dolar)", "4%", "2,5%"],
  ["Bitcoin / Ethereum (dalam dolar)", "12%", "3% / 0%"],
  ["Kripto lain (dalam dolar)", "5%", "−5%"],
  ["RD Pasar Uang", "4,75%", "4%"],
  ["SBN Ritel", "5,4%", "5%"],
  ["Rupiah melemah ke dolar", "2%", "1%"],
  ["Inflasi", "3%", "3,5%"],
];

export default function Metodologi() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-2 sm:px-6">
      <section className="on-dark relative overflow-hidden rounded-[var(--radius-card)] bg-night p-7 text-on-night sm:p-10">
        <Icon3D name="dadu-trio" size={150} className="absolute -top-4 right-6 hidden md:block" />
        <h1 className="max-w-[16ch] font-display text-[2.5rem] font-extrabold leading-none sm:text-4xl">Cara ngitungnya</h1>
        <p className="mt-4 max-w-[52ch] text-lg text-on-night-2">
          Kita nggak nebak harga besok. Kita bikin ribuan kemungkinan masa depan dari sejarah yang beneran terjadi, terus ngitung
          seberapa sering tiap hasil muncul. Mirip ramalan cuaca: “70% hujan” bukan janji, tapi cukup buat mutusin bawa payung.
        </p>
      </section>

      <ol className="mt-5 grid gap-4 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-[var(--radius-card)] bg-surface p-6">
            <Icon3D name={s.icon} size={64} />
            <div>
              <p className="font-display text-lg font-extrabold text-ink">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-ink-2">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="tahunan" className="mt-5 rounded-[var(--radius-card)] bg-surface p-6 sm:p-8">
        <h2 id="tahunan" className="font-display text-2xl font-extrabold text-ink">
          Tabel “Tahun demi tahun” dihitung gimana?
        </h2>
        <p className="mt-2 max-w-[66ch] text-ink-2">
          Dari 4.000 masa depan tadi, kita intip nilainya di setiap akhir tahun, seolah kamu mencairkan semuanya hari itu (sudah dipotong biaya jual
          & pajak). Lalu 4.000 angka itu diurutkan:
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Apes", "angka ke-200 dari bawah (persentil 5): cuma 5 dari 100 masa depan yang lebih jelek."],
            ["Tengah", "angka di urutan tengah (persentil 50): separuh lebih bagus, separuh lebih jelek."],
            ["Hoki", "angka ke-200 dari atas (persentil 95)."],
            ["Separuh kemungkinan", "rentang persentil 25 sampai 75. Separuh masa depan jatuh di sini."],
            ["Peluang rugi", "berapa dari 100 masa depan yang nilainya di bawah total setoran saat itu."],
            ["Hasil investasi tahun ini", "kenaikan versi tengah selama setahun dikurangi setoranmu tahun itu. Kalau ini lebih gede dari setoran, bunga berbunga mulai kerasa."],
            ["Tumbuh per tahun", "pertumbuhan tahunan versi tengah, dihitung dengan memperhitungkan kapan tiap setoran masuk (XIRR)."],
            ["Kata sejarah", "kalau kamu nabung selama itu mulai dari tiap bulan di masa lalu, berapa dari 100 yang berakhir untung. Idenya dari tabel “Bedah instrumen” di seandainya.vercel.app."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-page p-4">
              <dt className="font-bold text-ink">{t}</dt>
              <dd className="mt-1 text-sm text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-[66ch] text-sm text-muted">
          Kenapa “kata sejarah” sering lebih bagus dari proyeksi? Karena sejarah cuma punya satu jalan yang kebetulan terjadi, sedangkan proyeksi
          memperhitungkan banyak jalan lain yang mungkin, termasuk yang lebih jelek. Kita sengaja tidak mengandalkan sejarah yang bagus.
        </p>
      </section>

      <section className="mt-5 rounded-[var(--radius-card)] bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-extrabold text-ink">Seberapa bisa dipercaya?</h2>
        <p className="mt-2 max-w-[66ch] text-ink-2">
          Kita uji mundur. Di tiap titik di masa lalu, mesinnya cuma boleh lihat data sebelum titik itu, nebak hasil nabung 5 tahun ke
          depan, terus dicocokin sama yang beneran terjadi. Kalau jujur, hasil aslinya masuk rentang “9 dari 10” sekitar 90% kali.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl" tabIndex={0} role="region" aria-label="Tabel hasil uji ketepatan, bisa digeser">
          <table className="w-full min-w-[480px] border-collapse text-left tabular">
            <caption className="sr-only">Hasil uji ketepatan</caption>
            <thead>
              <tr className="text-sm text-ink-2">
                <th scope="col" className="py-2 pr-4 font-bold">Instrumen</th>
                <th scope="col" className="py-2 pr-4 text-right font-bold">Kali diuji</th>
                <th scope="col" className="py-2 pr-4 text-right font-bold">Masuk rentang 9/10 (idealnya 90%)</th>
                <th scope="col" className="py-2 text-right font-bold">Masuk rentang 5/10 (idealnya 50%)</th>
              </tr>
            </thead>
            <tbody>
              {CALIBRATION.map((r) => (
                <tr key={r.name} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-4 font-normal text-ink">{r.name}</th>
                  <td className="py-2.5 pr-4 text-right">{r.n}</td>
                  <td className="py-2.5 pr-4 text-right font-extrabold">{r.wide}</td>
                  <td className="py-2.5 text-right">{r.mid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[66ch] text-sm text-muted">
          Pembanding: kalau pakai rata-rata masa lalu BBCA sendiri, cuma 73% yang masuk, dan hasil aslinya hampir selalu di bawah
          tebakan. Makanya kita nggak pakai cara itu. Ujinya saling tumpang tindih, jadi anggap angka ini gambaran kasar.
        </p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-ink">Perkiraan yang dipakai</h2>
          <table className="mt-4 w-full border-collapse text-left text-sm tabular">
            <caption className="sr-only">Perkiraan tumbuh per tahun</caption>
            <thead>
              <tr className="text-ink-2">
                <th scope="col" className="py-2 pr-3 font-bold">Per tahun</th>
                <th scope="col" className="py-2 pr-3 font-bold">Normal</th>
                <th scope="col" className="py-2 font-bold">Pas seret</th>
              </tr>
            </thead>
            <tbody>
              {ASSUMPTIONS.map(([a, b, c]) => (
                <tr key={a} className="border-t border-line">
                  <th scope="row" className="py-2 pr-3 font-normal text-ink">{a}</th>
                  <td className="py-2 pr-3 font-bold">{b}</td>
                  <td className="py-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-muted">Sumber: Vanguard & J.P. Morgan 2026, dividen + pertumbuhan laba IDX, target inflasi BI. Ditinjau tiap tahun.</p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-ink">Batasannya</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-ink-2">
            <li>Masa depan cuma dirakit dari kejadian yang pernah ada. Bencana yang belum pernah terjadi nggak masuk hitungan.</li>
            <li>Yang sejarahnya pendek (di bawah 7 tahun) kita kasih label keandalan rendah.</li>
            <li>RD pasar uang, SBN, dan deposito dihitung dari suku bunga sekarang, bukan produk tertentu.</li>
            <li>Biaya & pajak pakai tarif umum. Aplikasi tertentu bisa beda.</li>
            <li>Data Yahoo Finance bisa telat dan kadang salah. Lonjakan yang jelas rusak kita buang.</li>
          </ul>
          <h3 className="mt-6 font-display text-lg font-extrabold text-ink">Bacaan</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
            <li>Politis & Romano (1994), The Stationary Bootstrap</li>
            <li>Fama & French (2018), Long-Horizon Returns</li>
            <li>Anarkulova, Cederburg & O’Doherty (2022), Stocks for the Long Run?</li>
            <li>Gigerenzer & Hoffrage (1995), peluang dalam bentuk “12 dari 100”</li>
            <li>Spiegelhalter, Pearson & Short (2011), menampilkan ketidakpastian masa depan</li>
            <li>Tata cara tabel: GOV.UK & USWDS, NN/g, WAI. Skenario terbaik/standar/terburuk: SEOJK 12/2014</li>
            <li>Inspirasi: seandainya.vercel.app oleh Rio Nur Arifin</li>
            <li>PMK 50/2025 (pajak kripto), UU HPP (dividen)</li>
          </ul>
        </div>
      </section>

      <p className="mt-6">
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-coral px-6 font-extrabold text-on-coral">
          Balik ngitung
        </Link>
      </p>
    </main>
  );
}
