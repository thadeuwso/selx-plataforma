import React from 'react';
import { Modal } from '../overlay/Modal.jsx';
import { Button } from '../actions/Button.jsx';
import { TextField } from '../inputs/TextField.jsx';

/** Confirmação proporcional ao risco: destrutiva pede confirmação explícita;
 * irreversível em massa exige digitar para confirmar. */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive = false, typeToConfirm, onConfirm, onCancel }) {
  const [typed, setTyped] = React.useState('');
  React.useEffect(() => { if (!open) setTyped(''); }, [open]);
  const blocked = typeToConfirm && typed !== typeToConfirm;
  return (
    <Modal open={open} title={title} onClose={onCancel} width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} disabled={blocked} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }>
      <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 'var(--measure-reading)' }}>{description}</p>
      {typeToConfirm && (
        <TextField
          label={`Digite "${typeToConfirm}" para confirmar`}
          value={typed} onChange={setTyped}
          style={{ marginTop: 'var(--space-4)' }}
        />
      )}
    </Modal>
  );
}
