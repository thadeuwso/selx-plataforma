/** Upload de arquivo — área de soltar + botão. */
export interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
  /** @default "Arraste arquivos ou clique para escolher" */
  hint?: string;
  id?: string;
  style?: React.CSSProperties;
}
