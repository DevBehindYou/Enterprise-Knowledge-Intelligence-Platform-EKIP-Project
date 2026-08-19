import {
  Folder, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet,
  FileArchive, FileCode, Presentation, File as FileGeneric,
} from 'lucide-react';

/** Icon + accent colour per file kind (kinds come from the backend's classifyFile). */
const BY_KIND = {
  folder: { Icon: Folder, className: 'text-accent' },
  image: { Icon: FileImage, className: 'text-[#7C5CFF]' },
  video: { Icon: FileVideo, className: 'text-[#D9534F]' },
  audio: { Icon: FileAudio, className: 'text-[#E0A800]' },
  pdf: { Icon: FileText, className: 'text-[#B3282C]' },
  document: { Icon: FileText, className: 'text-accent-dim' },
  spreadsheet: { Icon: FileSpreadsheet, className: 'text-[#146C48]' },
  presentation: { Icon: Presentation, className: 'text-[#C2571A]' },
  archive: { Icon: FileArchive, className: 'text-[#8A5C0D]' },
  code: { Icon: FileCode, className: 'text-[#0F6E8C]' },
  other: { Icon: FileGeneric, className: 'text-ink-muted' },
};

export default function FileIcon({ kind = 'other', size = 20, className = '' }) {
  const { Icon, className: kindClass } = BY_KIND[kind] || BY_KIND.other;
  return <Icon size={size} className={`${kindClass} ${className} shrink-0`} />;
}
