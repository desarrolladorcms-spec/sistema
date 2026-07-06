/**
 * MC_API — Capa de comunicación con el GAS backend
 * Reemplaza google.script.run en todos los paneles.
 * Usa Content-Type: text/plain para evitar CORS preflight.
 */
(function(global) {

  // La URL del GAS web app se carga desde localStorage (configurada en login)
  function getBaseUrl() {
    return localStorage.getItem('mc_gas_url') || window.MC_GAS_URL || '';
  }
  function getToken() {
    return localStorage.getItem('mc_token') || '';
  }
  function getUsuario() {
    try { return JSON.parse(localStorage.getItem('mc_usuario') || '{}'); }
    catch(e) { return {}; }
  }

  async function call(action, data, onSuccess, onError) {
    var url = getBaseUrl();
    if (!url) { console.error('MC_API: GAS URL no configurada'); return; }
    var u = getUsuario();
    var payload = Object.assign({}, data || {}, {
      action: action,
      _token: getToken(),
      usuario: u.nombre || '',  // Siempre enviar el usuario
      _rol: u.rol || ''
    });
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Simple request → no preflight
        body: JSON.stringify(payload)
      });
      var result = await res.json();
      if (result && result.error === 'NO_AUTH') {
        // Sesión expirada → redirigir al login (se conserva la URL guardada)
        localStorage.removeItem('mc_token');
        localStorage.removeItem('mc_usuario');
        window.location.href = '/';
        return;
      }
      if (onSuccess) onSuccess(result);
      return result;
    } catch(e) {
      console.error('MC_API error:', action, e);
      if (onError) onError(e);
    }
  }

  // fire: llamada sin esperar respuesta (fire and forget)
  function fire(action, data) { call(action, data); }

  // Compatibilidad con google.script.run estilo builder
  function runner(action) {
    var _success = null, _error = null, _data = {};
    return {
      withSuccessHandler: function(fn) { _success = fn; return this; },
      withFailureHandler: function(fn) { _error = fn; return this; },
      _run: function(data) { call(action, Object.assign(_data, data||{}), _success, _error); }
    };
  }

  // ── API pública ────────────────────────────────────────────────────────────
  global.MC_API = { call, fire, runner, getUsuario, getToken };

  // ── Shim de google.script.run ──────────────────────────────────────────────
  // Intercepta llamadas a google.script.run.mc_pub_X(data) y las redirige a MC_API
  global.google = global.google || {};
  global.google.script = global.google.script || {};

  function mc_makeRunner_(successCb, failureCb) {
    return new Proxy(function () {}, {
      apply: function () { /* google.script.run() solo no se usa directo */ },
      get: function (_, prop) {
        if (prop === 'withSuccessHandler') return function (fn) { return mc_makeRunner_(fn, failureCb); };
        if (prop === 'withFailureHandler') return function (fn) { return mc_makeRunner_(successCb, fn); };
        if (typeof prop !== 'string' || prop.startsWith('__')) return undefined;
        // Cualquier otro nombre es el de la función real del backend
        return function (rawArg) {
          var data;
          if (rawArg === null || rawArg === undefined) data = {};
          else if (typeof rawArg === 'object' && !Array.isArray(rawArg)) data = rawArg;
          else data = { '0': rawArg };
          call(prop, data, successCb, failureCb);
        };
      }
    });
  }
  global.google.script.run = mc_makeRunner_(null, null);

  // google.script.host.close() — no hace nada fuera de GAS pero tampoco rompe
  global.google.script.host = { close: function() {
    // En web app standalone, cerrar un "modal" equivale a volver al panel anterior
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'MC_CLOSE_PANEL' }, '*');
    }
  }};

})(window);
