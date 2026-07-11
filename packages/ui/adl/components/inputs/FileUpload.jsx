import React from 'react';
import { fieldLabel, fieldHelp, useFieldId } from './fieldBase.jsx';
import { Icon } from '../foundation/Icon.jsx';

/** Upload de arquivo — área de soltar + botão, com lista dos arquivos escolhidos. */
export function FileUpload({ label, accept, multiple, onChange, help, error, disabled, hint = 'Arraste arquivos ou clique para escolher', id, style }) {
  const fid = useFieldId(id);
  const [files, setFiles] = React.useState([]);
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef(null);
  const setList = (list) => { const arr = Array.from(list || []); setFiles(arr); onChange && onChange(arr); };
  return (
    <div style={style}>
      {fieldLabel(label, fid)}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) setList(e.dataTransfer.files); }}
        onClick={() => !disabled && inputRef.current && inputRef.current.click()}
        style={{
          border: `1px dashed ${over ? 'var(--border-selected)' : error ? 'var(--feedback-danger)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
          background: over ? 'var(--surface-selected)' : 'var(--surface-default)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--text-muted)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
          transition: 'border-color var(--duration-instant) var(--ease-standard)', textAlign: 'center',
        }}>
        <Icon name="upload" size={20} />
        <span style={{ fontSize: 'var(--type-support-size)' }}>{hint}</span>
        <input ref={inputRef} id={fid} type="file" accept={accept} multiple={multiple} disabled={disabled}
          onChange={(e) => setList(e.target.files)} style={{ display: 'none' }} />
      </div>
      {files.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 'var(--space-2) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {files.map((f) => (
            <li key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--type-support-size)', color: 'var(--text-body)' }}>
              <Icon name="file-text" size={14} style={{ color: 'var(--text-subtle)' }} />
              {f.name}
              <span style={{ color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{(f.size / 1024).toFixed(0)} KB</span>
            </li>
          ))}
        </ul>
      )}
      {fieldHelp(error, help, fid + '-help')}
    </div>
  );
}
