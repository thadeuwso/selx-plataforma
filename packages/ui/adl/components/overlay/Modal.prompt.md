Modal — decisão ou tarefa curta; scrim discreto, entrada 200ms, Esc fecha.

```jsx
<Modal open={open} title="Agendar entrevista" onClose={fechar}
  footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button>Agendar entrevista</Button></>}>
  …
</Modal>
```
