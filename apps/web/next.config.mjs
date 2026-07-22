/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Some o selo flutuante de desenvolvimento do Next (o "N" com a contagem de
  // problemas no canto da tela). Ele só existe em `next dev` — nunca apareceu
  // para usuário final —, mas atrapalhava a conferência visual das telas.
  //
  // Isto esconde o SELO, não os erros: aviso e erro de console continuam no
  // console do navegador e no terminal do `next dev`, que é onde se olha.
  devIndicators: false,
};

export default nextConfig;
