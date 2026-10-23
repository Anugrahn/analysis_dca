/** Ikon 3D (dirender dari three.js, lihat scripts/icons3d). Selalu dekoratif: makna ada di teksnya. */
export type Icon3DName =
  | "dadu" | "dadu-trio" | "saham" | "kripto" | "emas" | "keranjang" | "dunia" | "celengan" | "sertifikat" | "tunas" | "awan" | "kilat" | "bendera";

export function Icon3D({ name, size = 48, className = "" }: { name: Icon3DName; size?: number; className?: string }) {
  const wide = name === "dadu-trio";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/3d/${name}.webp`}
      alt=""
      width={wide ? Math.round(size * 1.6) : size}
      height={size}
      decoding="async"
      className={`pointer-events-none shrink-0 select-none ${className}`}
    />
  );
}

/** Ikon untuk sebuah instrumen, dari jenisnya (kind dari server, atau kindLabel dari pencarian). */
export function iconFor(kind: string | undefined, symbol?: string): Icon3DName {
  const k = (kind ?? "").toLowerCase();
  if (symbol === "ACWI" || symbol === "VT" || symbol === "URTH") return "dunia";
  if (symbol === "sbn") return "sertifikat";
  if (symbol === "rdpu" || symbol === "deposito") return "celengan";
  if (k.includes("kripto")) return "kripto";
  if (k.includes("komoditas")) return "emas";
  if (k.includes("pasar uang") || k === "kas") return "celengan";
  if (k.includes("indeks") || k.includes("etf") || k.includes("reksa") || k === "campuran") return "keranjang";
  if (k.includes("saham")) return "saham";
  return "dadu";
}
