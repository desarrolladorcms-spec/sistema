/**
 * CONFIG — Único lugar donde vive la URL del backend (Apps Script) para los
 * formularios PÚBLICOS (los que usa gente sin cuenta en el sistema: equipo
 * de campañas, clientes dejando observaciones).
 *
 * Si alguna vez cambias de implementación en Apps Script y te da una URL
 * `/exec` nueva, edita SOLO esta línea y vuelve a subir este archivo — los
 * links que ya le compartiste a campañas o a clientes (los de GitHub Pages)
 * NO cambian, siguen funcionando igual.
 *
 * Nota: esta es una URL distinta a la que cada persona del equipo pega una
 * vez en su login — esa la guarda cada quien en su navegador. Esta de aquí
 * es la que necesitan los formularios públicos, que no tienen sesión.
 */
window.MC_GAS_URL_PUBLICO = 'PEGA_AQUI_TU_URL_/exec';
