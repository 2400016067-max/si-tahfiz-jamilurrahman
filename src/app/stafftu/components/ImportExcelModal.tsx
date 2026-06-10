'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';
import { Halaqah, Santri } from '@/types/tahfiz';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ImportRow {
  nama_santri: string;
  nis?: string;
  kelas: string;
  grade: string;
  nama_halaqah: string;
  nama_wali?: string;
  no_hp_wali?: string;
  current_juz?: number;
  _valid: boolean;
  _errors: string[];
  _warnings: string[];
}

interface ImportExcelModalProps {
  onClose: () => void;
  halaqahs: Halaqah[];
  santriList: Santri[];
}

function ImportExcelModal({ onClose, halaqahs, santriList }: ImportExcelModalProps) {
  const [step, setStep] = React.useState<number>(1);
  
  // State for step 1
  const [isTemplateDownloading, setIsTemplateDownloading] = React.useState(false);
  
  // State for step 2
  const [dragActive, setDragActive] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [parsedRows, setParsedRows] = React.useState<ImportRow[]>([]);
  const [parsingError, setParsingError] = React.useState<string | null>(null);
  
  // State for step 4
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importStats, setImportStats] = React.useState<{
    success: number;
    failed: number;
    details: { rowNum: number; name: string; error: string }[];
  }>({ success: 0, failed: 0, details: [] });
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    setIsTemplateDownloading(true);
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'nama_santri',
        'nis',
        'kelas',
        'grade',
        'nama_halaqah',
        'nama_wali',
        'no_hp_wali',
        'current_juz'
      ];
      
      const data = [
        headers,
        ['Ahmad Fauzan', '123456', '7A', 'Tahfiz', halaqahs[0]?.nama || 'Abu Bakar', 'Budi Santoso', '081234567890', 30],
        ['Fathur Rahman', '123457', '8B', 'Tahsin', halaqahs[1]?.nama || 'Umar bin Khattab', 'Heri Setiawan', '089876543210', 30]
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws as any)['!dataValidation'] = [
        {
          sqref: 'D2:D1000',
          type: 'list',
          formula1: '"Tahsin,Takmil,Tahfiz"',
          showErrorMessage: true,
          error: 'Grade harus berupa: Tahsin, Takmil, atau Tahfiz',
          errorTitle: 'Grade Tidak Valid'
        }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Import Santri');
      XLSX.writeFile(wb, 'Template_Import_Santri.xlsx');
    } catch (err) {
      console.error('Gagal membuat template:', err);
      alert('Gagal mendownload template.');
    } finally {
      setIsTemplateDownloading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParsingError(null);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSX = await import('xlsx');
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        
        if (rawData.length === 0) {
          throw new Error('File Excel kosong atau tidak terbaca.');
        }
        
        const rawHeaders = rawData[0] as string[];
        if (!rawHeaders || rawHeaders.length === 0) {
          throw new Error('Tidak ditemukan header kolom di baris pertama.');
        }
        
        const expectedHeaders = {
          nama_santri: ['nama_santri', 'nama santri', 'nama'],
          nis: ['nis', 'nomor induk', 'no induk'],
          kelas: ['kelas', 'class'],
          grade: ['grade', 'tipe', 'program'],
          nama_halaqah: ['nama_halaqah', 'nama halaqah', 'halaqah', 'kelompok'],
          nama_wali: ['nama_wali', 'nama wali', 'wali', 'orang tua', 'orangtua', 'parent'],
          no_hp_wali: ['no_hp_wali', 'no hp wali', 'no hp', 'hp wali', 'phone'],
          current_juz: ['current_juz', 'juz sekarang', 'juz', 'current juz']
        };
        
        const indexMap: Record<string, number> = {};
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawHeaders.forEach((header: any, idx) => {
          if (!header) return;
          const normHeader = header.toString().toLowerCase().trim();
          for (const [key, aliases] of Object.entries(expectedHeaders)) {
            if (aliases.includes(normHeader)) {
              indexMap[key] = idx;
            }
          }
        });
        
        const required = ['nama_santri', 'kelas', 'grade', 'nama_halaqah'];
        const missing = required.filter(field => indexMap[field] === undefined);
        if (missing.length > 0) {
          throw new Error(`Kolom wajib tidak terdeteksi: ${missing.map(f => f.replace('_', ' ')).join(', ')}. Harap sesuaikan dengan format template.`);
        }
        
        const rows: ImportRow[] = [];
        
        for (let i = 1; i < rawData.length; i++) {
          const rawRow = rawData[i];
          if (!rawRow || rawRow.length === 0) continue;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isRowEmpty = rawRow.every((val: any) => val === undefined || val === null || val.toString().trim() === '');
          if (isRowEmpty) continue;
          
          const nama_santri = indexMap['nama_santri'] !== undefined ? rawRow[indexMap['nama_santri']]?.toString() || '' : '';
          const nis = indexMap['nis'] !== undefined ? rawRow[indexMap['nis']]?.toString() || '' : '';
          const kelas = indexMap['kelas'] !== undefined ? rawRow[indexMap['kelas']]?.toString() || '' : '';
          const gradeRaw = indexMap['grade'] !== undefined ? rawRow[indexMap['grade']]?.toString() || '' : '';
          const nama_halaqah = indexMap['nama_halaqah'] !== undefined ? rawRow[indexMap['nama_halaqah']]?.toString() || '' : '';
          const nama_wali = indexMap['nama_wali'] !== undefined ? rawRow[indexMap['nama_wali']]?.toString() || '' : '';
          const no_hp_wali = indexMap['no_hp_wali'] !== undefined ? rawRow[indexMap['no_hp_wali']]?.toString() || '' : '';
          const current_juz_raw = indexMap['current_juz'] !== undefined ? rawRow[indexMap['current_juz']] : undefined;
          const current_juz = current_juz_raw !== undefined && current_juz_raw !== null && !isNaN(parseInt(current_juz_raw.toString())) 
            ? parseInt(current_juz_raw.toString()) 
            : 30;
            
          const _errors: string[] = [];
          const _warnings: string[] = [];
          
          if (!nama_santri.trim()) {
            _errors.push('Nama santri tidak boleh kosong.');
          }
          
          if (!kelas.trim()) {
            _errors.push('Kelas tidak boleh kosong.');
          }
          
          let grade = gradeRaw.trim();
          const normGrade = grade.toLowerCase();
          if (normGrade === 'tahsin') grade = 'Tahsin';
          else if (normGrade === 'takmil') grade = 'Takmil';
          else if (normGrade === 'tahfiz') grade = 'Tahfiz';
          else {
            _errors.push(`Grade "${grade}" tidak valid. Harus Tahsin, Takmil, atau Tahfiz.`);
          }
          
          const matchHalaqah = halaqahs.find(h => {
            const normInput = nama_halaqah.toLowerCase().trim();
            const normDb = h.nama.toLowerCase().trim();
            const normDbWithoutPrefix = h.nama.toLowerCase().replace(/^halaqah\s+/, '').trim();
            return normInput === normDb || normInput === normDbWithoutPrefix;
          });
          
          if (!nama_halaqah.trim()) {
            _errors.push('Nama halaqah tidak boleh kosong.');
          } else if (!matchHalaqah) {
            _errors.push(`Kelompok halaqah "${nama_halaqah}" tidak terdaftar di database.`);
          }
          
          if (nis.trim()) {
            const isNisDuplicate = santriList.some(s => s.nis && s.nis.toLowerCase().trim() === nis.toLowerCase().trim());
            if (isNisDuplicate) {
              _warnings.push(`NIS "${nis}" sudah terdaftar pada santri lain.`);
            }
          }
          
          rows.push({
            nama_santri,
            nis: nis || undefined,
            kelas,
            grade,
            nama_halaqah,
            nama_wali: nama_wali || undefined,
            no_hp_wali: no_hp_wali || undefined,
            current_juz,
            _valid: _errors.length === 0,
            _errors,
            _warnings
          });
        }
        
        if (rows.length === 0) {
          throw new Error('Tidak ada data santri yang dapat diproses dari file Excel.');
        }
        
        setParsedRows(rows);
        setStep(3);
      } catch (err) {
        console.error(err);
        setParsingError(err instanceof Error ? err.message : 'Gagal membaca file Excel.');
      } finally {
        setIsParsing(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const handleStartImport = async () => {
    setIsImporting(true);
    setStep(4);
    setImportProgress(0);
    setImportStats({ success: 0, failed: 0, details: [] });
    
    const validRows = parsedRows.filter(r => r._valid);
    const total = validRows.length;
    
    if (total === 0) {
      setIsImporting(false);
      return;
    }
    
    let successCount = 0;
    let failedCount = 0;
    const errorDetails: { rowNum: number; name: string; error: string }[] = [];
    
    const batchSize = 10;
    for (let i = 0; i < total; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      
      const batchData = batch.map(row => {
        const matchHalaqah = halaqahs.find(h => {
          const normInput = row.nama_halaqah.toLowerCase().trim();
          const normDb = h.nama.toLowerCase().trim();
          const normDbWithoutPrefix = h.nama.toLowerCase().replace(/^halaqah\s+/, '').trim();
          return normInput === normDb || normInput === normDbWithoutPrefix;
        });
        
        const targetBarisMap: Record<string, number> = {
          Tahsin: 3,
          Takmil: 7,
          Tahfiz: 12
        };
        
        return {
          nama: row.nama_santri.trim(),
          nis: row.nis ? row.nis.toString().trim() : null,
          kelas: row.kelas.toString().trim(),
          grade: row.grade,
          target_baris: targetBarisMap[row.grade as 'Tahsin' | 'Takmil' | 'Tahfiz'] || 3,
          halaqah_id: matchHalaqah!.id,
          parent_name: row.nama_wali ? row.nama_wali.trim() : null,
          parent_phone: row.no_hp_wali ? row.no_hp_wali.toString().trim() : null,
          current_juz: row.current_juz !== undefined ? parseInt(row.current_juz.toString()) : 30,
          status: 'active'
        };
      });
      
      try {
        const { error } = await supabase
          .from('santri')
          .insert(batchData);
          
        if (error) {
          throw error;
        }
        
        successCount += batch.length;
      } catch (err) {
        failedCount += batch.length;
        const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan ke database.';
        batch.forEach((row, bidx) => {
          errorDetails.push({
            rowNum: i + bidx + 1,
            name: row.nama_santri,
            error: errMsg
          });
        });
      }
      
      const progress = Math.min(Math.round(((i + batch.length) / total) * 100), 100);
      setImportProgress(progress);
      setImportStats({
        success: successCount,
        failed: failedCount,
        details: errorDetails
      });
    }
    
    setIsImporting(false);
  };

  const steps = [
    { num: 1, label: 'Unduh Template' },
    { num: 2, label: 'Unggah File' },
    { num: 3, label: 'Validasi & Pratinjau' },
    { num: 4, label: 'Proses Impor' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl p-6 flex flex-col space-y-6 animate-in zoom-in-95 duration-200 overflow-y-auto my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Import Data Santri via Excel
            </h3>
          </div>
          <button onClick={onClose} disabled={isImporting} className="text-slate-400 hover:text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2 pb-4 border-b border-slate-100 dark:border-slate-850">
          {steps.map(s => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex flex-col items-center text-center space-y-1">
                <div className={`
                  h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isActive ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-200 dark:ring-violet-900' : ''}
                  ${isCompleted ? 'bg-emerald-50 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : ''}
                `}>
                  {isCompleted ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-450'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-850 dark:text-slate-200">Unduh &amp; Isi Template Excel</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sebelum mengunggah, silakan unduh template Excel resmi terlebih dahulu. Isi data santri sesuai dengan format kolom yang telah ditentukan agar sistem dapat mengenali data dengan benar.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={isTemplateDownloading}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-60 shadow-sm"
                  >
                    {isTemplateDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>{isTemplateDownloading ? 'Memproses...' : 'Unduh Template Excel'}</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <h5 className="font-bold text-slate-700 dark:text-slate-350">Ketentuan Pengisian Kolom:</h5>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-500 dark:text-slate-400">
                  <li><strong className="text-slate-700 dark:text-slate-350">nama_santri:</strong> Nama lengkap santri (wajib diisi).</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">nis:</strong> Nomor Induk Santri (opsional, unik).</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">kelas:</strong> Kelas santri (wajib, contoh: 7A, 8B, 9A).</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">grade:</strong> Pilihan program, harus diisi salah satu dari: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Tahsin</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Takmil</code>, atau <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Tahfiz</code>.</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">nama_halaqah:</strong> Nama kelompok halaqah (wajib, harus sesuai dengan nama halaqah aktif di sistem, contoh: &quot;Abu Bakar&quot;).</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">nama_wali:</strong> Nama lengkap orang tua/wali santri (opsional).</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">no_hp_wali:</strong> Nomor WhatsApp wali santri (opsional).</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">current_juz:</strong> Juz hafalan sekarang, default 30 (opsional, angka 1-30).</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2 text-xs">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center space-y-3 transition-all cursor-pointer
                  ${dragActive ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/10' : 'border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-350 dark:hover:border-slate-700'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="p-4 bg-violet-50 dark:bg-violet-950/45 text-violet-650 dark:text-violet-400 rounded-full">
                  {isParsing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <div className="text-center space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {isParsing ? 'Sedang Membaca & Memvalidasi File...' : 'Pilih file Excel atau seret & drop di sini'}
                  </p>
                  <p className="text-[10px] text-slate-400">Mendukung format .xlsx, .xls, .csv</p>
                </div>
              </div>

              {fileName && (
                <div className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-xl max-w-max">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-650" />
                  <span className="font-semibold text-slate-655 dark:text-slate-300 truncate max-w-xs">{fileName}</span>
                </div>
              )}

              {parsingError && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-650 dark:text-red-400 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{parsingError}</span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2 text-xs">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-150 dark:border-slate-850 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Santri</span>
                  <span className="text-lg font-extrabold text-slate-850 dark:text-slate-100">{parsedRows.length}</span>
                </div>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-150 dark:border-emerald-900/40 flex flex-col justify-center">
                  <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-semibold uppercase">Baris Valid</span>
                  <span className="text-lg font-extrabold text-emerald-655 dark:text-emerald-455">{parsedRows.filter(r => r._valid).length}</span>
                </div>
                <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-150 dark:border-red-900/40 flex flex-col justify-center">
                  <span className="text-[10px] text-red-650 dark:text-red-400 font-semibold uppercase">Baris Error</span>
                  <span className="text-lg font-extrabold text-red-655 dark:text-red-450">{parsedRows.filter(r => !r._valid).length}</span>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/25 rounded-xl border border-amber-150 dark:border-amber-900/40 flex flex-col justify-center">
                  <span className="text-[10px] text-amber-650 dark:text-amber-405 font-semibold uppercase">Peringatan (Warning)</span>
                  <span className="text-lg font-extrabold text-amber-655 dark:text-amber-450">{parsedRows.filter(r => r._warnings.length > 0).length}</span>
                </div>
              </div>

              {/* Error warning note */}
              {parsedRows.some(r => !r._valid) && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-800/60 rounded-xl text-red-650 dark:text-red-400 font-semibold leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Harap perbaiki semua data yang bertanda error (⚠️) di Excel Anda dan unggah ulang. Tombol impor hanya aktif bila tidak ada data error.</span>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-auto max-h-[300px] border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                <table className="w-full text-left divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                    <tr>
                      <th className="p-2.5">No</th>
                      <th className="p-2.5">Nama Santri</th>
                      <th className="p-2.5">NIS</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5">Grade</th>
                      <th className="p-2.5">Halaqah</th>
                      <th className="p-2.5">Wali</th>
                      <th className="p-2.5">No HP</th>
                      <th className="p-2.5">Juz</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {parsedRows.map((row, idx) => (
                      <tr 
                        key={idx}
                        className={`
                          ${!row._valid ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30' : ''}
                          ${row._valid && row._warnings.length > 0 ? 'bg-yellow-50/40 dark:bg-yellow-955/15 hover:bg-yellow-100/40 dark:hover:bg-yellow-950/20' : ''}
                          ${row._valid && row._warnings.length === 0 ? 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50' : ''}
                        `}
                      >
                        <td className="p-2.5 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-850 dark:text-slate-100">
                          {row.nama_santri || <span className="italic text-red-500 font-normal">Kosong</span>}
                        </td>
                        <td className="p-2.5">{row.nis || '—'}</td>
                        <td className="p-2.5">{row.kelas || <span className="italic text-red-500 font-normal">Kosong</span>}</td>
                        <td className="p-2.5 font-bold text-violet-650 dark:text-violet-400">{row.grade || <span className="italic text-red-500 font-normal">Kosong</span>}</td>
                        <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-350">
                          {row.nama_halaqah || <span className="italic text-red-500 font-normal">Kosong</span>}
                        </td>
                        <td className="p-2.5">{row.nama_wali || '—'}</td>
                        <td className="p-2.5">{row.no_hp_wali || '—'}</td>
                        <td className="p-2.5">{row.current_juz ?? 30}</td>
                        <td className="p-2.5 max-w-xs">
                          {!row._valid && (
                            <div className="flex flex-col space-y-0.5 text-[9px] text-red-655 dark:text-red-400 font-semibold">
                              {row._errors.map((e, ei) => (
                                <span key={ei}>⚠️ {e}</span>
                              ))}
                            </div>
                          )}
                          {row._valid && row._warnings.length > 0 && (
                            <div className="flex flex-col space-y-0.5 text-[9px] text-amber-655 dark:text-amber-450 font-semibold">
                              {row._warnings.map((w, wi) => (
                                <span key={wi}>⚠️ {w}</span>
                              ))}
                            </div>
                          )}
                          {row._valid && row._warnings.length === 0 && (
                            <span className="text-[9px] text-emerald-650 dark:text-emerald-400 font-bold">✓ Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 py-2 text-xs">
              {isImporting ? (
                <div className="text-center py-6 space-y-4">
                  <Loader2 className="h-8 w-8 text-violet-600 dark:text-violet-400 animate-spin mx-auto" />
                  <div className="space-y-2">
                    <p className="font-extrabold text-slate-805 dark:text-slate-200 text-sm">Sedang Mengimpor Data...</p>
                    <p className="text-slate-455">Jangan tutup jendela ini atau keluar dari halaman.</p>
                  </div>
                  <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mx-auto border border-slate-200 dark:border-slate-700">
                    <div 
                      className="bg-violet-650 h-full transition-all duration-300 rounded-full" 
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500">{importProgress}% Selesai</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col space-y-2 items-center text-center">
                    <Check className="h-8 w-8 text-emerald-500 bg-emerald-100 dark:bg-emerald-950/50 p-1.5 rounded-full animate-bounce" />
                    <h4 className="font-extrabold text-slate-850 dark:text-slate-250">Proses Impor Selesai!</h4>
                    <p className="text-slate-550 dark:text-slate-400">
                      Berhasil ditambahkan: <strong className="text-emerald-655 dark:text-emerald-450">{importStats.success} santri</strong> 
                      {importStats.failed > 0 && (
                        <span> | Gagal: <strong className="text-red-655 dark:text-red-455">{importStats.failed} santri</strong></span>
                      )}
                    </p>
                  </div>

                  {importStats.details.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-bold text-red-655 dark:text-red-400">Detail Kesalahan (Gagal Impor):</h5>
                      <div className="overflow-auto max-h-[200px] border border-red-100 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10 rounded-xl p-3 text-xs space-y-1 font-semibold text-red-655 dark:text-red-450">
                        {importStats.details.map((detail, di) => (
                          <div key={di} className="flex space-x-1.5">
                            <span>•</span>
                            <span>Baris {detail.rowNum} ({detail.name}): {detail.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 mt-auto">
          <div>
            {step > 1 && step < 4 && (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Kembali
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm active:scale-95"
              >
                Lanjut
              </button>
            )}
            {step === 2 && parsedRows.length > 0 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm active:scale-95"
              >
                Lihat Pratinjau
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleStartImport}
                disabled={parsedRows.length === 0 || parsedRows.some(r => !r._valid) || isImporting}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-755 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center space-x-1 shadow-sm"
              >
                <span>Import Sekarang</span>
                <span>({parsedRows.filter(r => r._valid).length} santri)</span>
              </button>
            )}
            {step === 4 && !isImporting && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm active:scale-95"
              >
                Selesai
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default ImportExcelModal;
