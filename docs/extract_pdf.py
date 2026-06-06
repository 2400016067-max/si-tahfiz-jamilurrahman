import PyPDF2
import sys

def extract_pdf(filepath, output_path):
    with open(filepath, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text_parts = []
        text_parts.append(f'=== {filepath} ===')
        text_parts.append(f'Pages: {len(reader.pages)}')
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(f'--- Page {i+1} ---')
                text_parts.append(text)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(text_parts))

# Extract SRS
extract_pdf('SRS_Kelompok6.pdf', 'docs/srs_text.txt')
print('SRS extracted')

# Extract Laporan
extract_pdf('Laporan_Fase1.pdf', 'docs/laporan_text.txt')
print('Laporan extracted')
