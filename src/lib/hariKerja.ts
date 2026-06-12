import { HariLibur } from '@/types/tahfiz'

// Cek apakah sebuah tanggal adalah hari kerja
// (bukan Sabtu/Ahad DAN bukan periode hari_libur)
export function isHariKerja(
  date: Date, 
  hariLiburList: HariLibur[]
): boolean {
  const day = date.getDay() // 0 = Ahad, 6 = Sabtu
  if (day === 0 || day === 6) return false

  // Gunting ke YYYY-MM-DD
  // timezone-safe string representation helper
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayStr = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${dayStr}`

  const isLibur = hariLiburList.some(libur =>
    dateStr >= libur.tanggal_mulai && 
    dateStr <= libur.tanggal_selesai
  )
  return !isLibur
}

// Hitung jumlah hari kerja dalam rentang tanggal (inklusif)
export function countHariKerja(
  startDate: string,
  endDate: string,
  hariLiburList: HariLibur[]
): number {
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    if (isHariKerja(current, hariLiburList)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

// Cek apakah sebuah tanggal jatuh di periode libur,
// kembalikan info liburnya jika ada
export function getLiburInfo(
  date: Date,
  hariLiburList: HariLibur[]
): HariLibur | null {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayStr = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${dayStr}`

  return hariLiburList.find(libur =>
    dateStr >= libur.tanggal_mulai && 
    dateStr <= libur.tanggal_selesai
  ) ?? null
}
