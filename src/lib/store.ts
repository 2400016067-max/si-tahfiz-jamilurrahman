import {
  Santri,
  Halaqah,
  Setoran,
  Pesan,
  ModulAjar,
  UjianJuz,
  initialSantri,
  initialHalaqahs,
  initialSetorans,
  initialPesans,
  initialModuls,
  initialUjians
} from './mockData';

// Safe localStorage checks for Next.js SSR
const isClient = typeof window !== 'undefined';

const STORAGE_KEYS = {
  SANTRI: 'tahfiz_santri',
  HALAQAH: 'tahfiz_halaqah',
  SETORAN: 'tahfiz_setoran',
  PESAN: 'tahfiz_pesan',
  MODUL: 'tahfiz_modul',
  UJIAN: 'tahfiz_ujian',
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isClient) return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading key ${key} from localStorage`, error);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (!isClient) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Trigger custom event so other components in the same page/window can update
    window.dispatchEvent(new Event('tahfiz_storage_update'));
  } catch (error) {
    console.error(`Error writing key ${key} to localStorage`, error);
  }
}

// Getters
export const getSantriList = (): Santri[] => getFromStorage(STORAGE_KEYS.SANTRI, initialSantri);
export const getHalaqahList = (): Halaqah[] => getFromStorage(STORAGE_KEYS.HALAQAH, initialHalaqahs);
export const getSetoranList = (): Setoran[] => getFromStorage(STORAGE_KEYS.SETORAN, initialSetorans);
export const getPesanList = (): Pesan[] => getFromStorage(STORAGE_KEYS.PESAN, initialPesans);
export const getModulList = (): ModulAjar[] => getFromStorage(STORAGE_KEYS.MODUL, initialModuls);
export const getUjianList = (): UjianJuz[] => getFromStorage(STORAGE_KEYS.UJIAN, initialUjians);

// Setters / Updates
export const saveSantriList = (list: Santri[]) => setToStorage(STORAGE_KEYS.SANTRI, list);
export const saveHalaqahList = (list: Halaqah[]) => setToStorage(STORAGE_KEYS.HALAQAH, list);
export const saveSetoranList = (list: Setoran[]) => setToStorage(STORAGE_KEYS.SETORAN, list);
export const savePesanList = (list: Pesan[]) => setToStorage(STORAGE_KEYS.PESAN, list);
export const saveModulList = (list: ModulAjar[]) => setToStorage(STORAGE_KEYS.MODUL, list);
export const saveUjianList = (list: UjianJuz[]) => setToStorage(STORAGE_KEYS.UJIAN, list);

// Helper Operations
export const addSetoran = (setoran: Omit<Setoran, 'id'>) => {
  const list = getSetoranList();
  const newSetoran: Setoran = {
    ...setoran,
    id: `set-${Date.now()}`
  };
  list.unshift(newSetoran); // Put newest setoran at the beginning
  saveSetoranList(list);
  return newSetoran;
};

export const updateSantri = (id: string, updates: Partial<Santri>) => {
  const list = getSantriList();
  const index = list.findIndex(s => s.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    saveSantriList(list);
  }
};

export const addPesan = (santriId: string, sender: 'pengampu' | 'orangtua', content: string) => {
  const list = getPesanList();
  const newPesan: Pesan = {
    id: `msg-${Date.now()}`,
    santriId,
    sender,
    content,
    timestamp: new Date().toISOString()
  };
  list.push(newPesan);
  savePesanList(list);
  return newPesan;
};

export const addUjianJuz = (ujian: Omit<UjianJuz, 'id' | 'date'>) => {
  const list = getUjianList();
  const newUjian: UjianJuz = {
    ...ujian,
    id: `uj-${Date.now()}`,
    date: new Date().toISOString().split('T')[0]
  };
  list.unshift(newUjian);
  saveUjianList(list);
  return newUjian;
};

export const approveUjianJuz = (ujianId: string) => {
  const list = getUjianList();
  const index = list.findIndex(u => u.id === ujianId);
  if (index !== -1) {
    list[index].approvedByKoordinator = true;
    saveUjianList(list);

    // Also update santri's totalHafalanJuz if they passed and it's not already added
    const ujian = list[index];
    if (ujian.status === 'lulus') {
      const santriList = getSantriList();
      const sIndex = santriList.findIndex(s => s.id === ujian.santriId);
      if (sIndex !== -1) {
        const currentJuzList = santriList[sIndex].totalHafalanJuz || [];
        if (!currentJuzList.includes(ujian.juz)) {
          currentJuzList.push(ujian.juz);
          santriList[sIndex].totalHafalanJuz = currentJuzList;
          // Set currentJuz to next target juz if applicable (e.g. going down 30->29->28)
          const minJuz = Math.min(...currentJuzList);
          if (minJuz > 1) {
            santriList[sIndex].currentJuz = minJuz - 1;
          }
          saveSantriList(santriList);
        }
      }
    }
  }
};

export const resetAllData = () => {
  if (!isClient) return;
  localStorage.removeItem(STORAGE_KEYS.SANTRI);
  localStorage.removeItem(STORAGE_KEYS.HALAQAH);
  localStorage.removeItem(STORAGE_KEYS.SETORAN);
  localStorage.removeItem(STORAGE_KEYS.PESAN);
  localStorage.removeItem(STORAGE_KEYS.MODUL);
  localStorage.removeItem(STORAGE_KEYS.UJIAN);
  window.dispatchEvent(new Event('tahfiz_storage_update'));
};
