export const MASA_OPTIONS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

const MASA_MAP: Record<string, string> = {
  'januari': 'Januari', 'jan': 'Januari', '01': 'Januari', '1': 'Januari',
  'februari': 'Februari', 'feb': 'Februari', '02': 'Februari', '2': 'Februari',
  'maret': 'Maret', 'mar': 'Maret', '03': 'Maret', '3': 'Maret',
  'april': 'April', 'apr': 'April', '04': 'April', '4': 'April',
  'mei': 'Mei', '05': 'Mei', '5': 'Mei',
  'juni': 'Juni', 'jun': 'Juni', '06': 'Juni', '6': 'Juni',
  'juli': 'Juli', 'jul': 'Juli', '07': 'Juli', '7': 'Juli',
  'agustus': 'Agustus', 'agu': 'Agustus', '08': 'Agustus', '8': 'Agustus',
  'september': 'September', 'sep': 'September', '09': 'September', '9': 'September',
  'oktober': 'Oktober', 'okt': 'Oktober', '10': 'Oktober',
  'november': 'November', 'nov': 'November', '11': 'November',
  'desember': 'Desember', 'des': 'Desember', '12': 'Desember',
}

export const normalizeMasa = (value?: string | null) => {
  if (!value) return ''
  const key = value.trim().toLowerCase()
  return MASA_MAP[key] ?? value.trim()
}
