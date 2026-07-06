/**
 * MC Auth — Login con PIN y gestión de sesión
 */
(function(global) {

  var GAS_URL_KEY = 'mc_gas_url';
  var TOKEN_KEY   = 'mc_token';
  var USER_KEY    = 'mc_usuario';

  async function login(gasUrl, pin) {
    try {
      var res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'LOGIN', pin: String(pin) })
      });
      var result = await res.json();
      if (result && result.ok) {
        localStorage.setItem(GAS_URL_KEY, gasUrl);
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify({
          nombre: result.nombre, rol: result.rol, color: result.color
        }));
      }
      return result;
    } catch(e) {
      return { ok: false, msg: 'Error de conexión: ' + e.message };
    }
  }

  function logout() {
    var token = localStorage.getItem(TOKEN_KEY);
    var url   = localStorage.getItem(GAS_URL_KEY);
    if (token && url) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'LOGOUT', _token: token })
      }).catch(function(){});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() { return !!localStorage.getItem(TOKEN_KEY); }
  function getUser()    { try { return JSON.parse(localStorage.getItem(USER_KEY)||'{}'); } catch(e){ return {}; } }

  global.MC_AUTH = { login, logout, isLoggedIn, getUser };

})(window);
