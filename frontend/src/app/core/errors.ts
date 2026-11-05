// Mengubah error dari API menjadi daftar pesan yang bisa ditampilkan
export function errorMessages(err: any): string[] {
  const e = err?.error;
  if (e?.errors) return (Object.values(e.errors) as string[][]).flat();
  if (e?.message) return [e.message];
  if (err?.status === 0) return ['Tidak dapat terhubung ke server.'];
  return ['Terjadi kesalahan. Coba lagi.'];
}
