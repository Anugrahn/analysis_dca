import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Bricolage Grotesque untuk judul & angka besar (berkarakter, berani); Atkinson Hyperlegible
// untuk isi — dirancang supaya huruf dan angka gampang dibedakan.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Cobain — nabung rutin, jadinya berapa?", template: "%s — Cobain" },
  description: "Coba hitung uang yang kamu tabung tiap bulan di saham, kripto, emas, atau reksa dana. Kita lempar dadu 4.000 kali buat lihat kemungkinannya.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1030" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${bricolage.variable} ${atkinson.variable} antialiased`}>
      <body className="min-h-dvh">
        <a
          href="#isi"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-5 focus:py-3 focus:font-bold focus:text-ink focus:shadow-lg"
        >
          Langsung ke isi
        </a>
        <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-2 px-4 pb-3 pt-4 sm:gap-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-full pr-2 text-ink no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/3d/dadu.webp" alt="" width={40} height={40} className="-my-1" />
            <span className="font-display text-[1.6rem] font-extrabold">Cobain</span>
          </Link>
          <nav aria-label="Utama">
            <Link href="/metodologi" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-surface px-3 text-sm font-bold text-ink hover:bg-line sm:px-4">
              Cara ngitungnya
            </Link>
          </nav>
        </header>
        <div id="isi" tabIndex={-1} className="outline-none">
          {children}
        </div>
        <footer className="mx-auto mt-16 flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10 sm:px-6">
          <div className="on-dark relative overflow-hidden rounded-[var(--radius-card)] bg-night p-6 text-on-night sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/3d/dadu.webp" alt="" width={64} height={64} className="-rotate-12" />
              <div>
                <p className="text-sm font-bold text-on-night-2">Diracik sambil iseng lempar dadu oleh</p>
                <p className="font-display text-2xl font-extrabold leading-tight">
                  Rio <span className="text-butter">ft</span> Uga
                </p>
              </div>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2 sm:mt-0" aria-label="Kontak pembuat">
              {[
                { name: "Rio", href: "https://www.linkedin.com/in/rionurarifin/", full: "Rio Nur Arifin" },
                { name: "Uga", href: "https://www.linkedin.com/in/anugrahn/", full: "Uga" },
              ].map((a) => (
                <li key={a.name}>
                  <a
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`LinkedIn ${a.full} (buka di tab baru)`}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-butter px-5 font-bold text-night hover:brightness-105"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.45h-4v-4.83c0-1.15-.02-2.64-1.6-2.64-1.62 0-1.86 1.26-1.86 2.56v4.91h-4v-11Z"
                      />
                    </svg>
                    {a.name}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="mailto:anugrahnrhmd@gmail.com"
                  aria-label="Email Uga: anugrahnrhmd@gmail.com"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-night-raise px-5 font-bold text-on-night hover:brightness-110"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Email
                </a>
              </li>
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-6 text-sm text-ink-2">
            <p className="max-w-[70ch]">
              <strong className="text-ink">Ini buat belajar, bukan saran beli atau jual.</strong> Hasil aslinya bisa lebih bagus atau lebih
              jelek. Mau ambil keputusan besar? Ngobrol dulu sama perencana keuangan berizin.
            </p>
            <p className="mt-2 text-muted">Data harga dari Yahoo Finance (bisa telat). Kurs & inflasi dari FRED/OECD.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
