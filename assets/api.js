/**
 * MC_API — Capa de comunicación con el GAS backend
 * Reemplaza google.script.run en todos los paneles.
 * Usa Content-Type: text/plain para evitar CORS preflight.
 */
(function(global) {

  // La URL del GAS web app se carga desde sessionStorage (configurada en login)
  function getBaseUrl() {
    return sessionStorage.getItem('mc_gas_url') || window.MC_GAS_URL || '';
  }
  function getToken() {
    return sessionStorage.getItem('mc_token') || '';
  }
  function getUsuario() {
    try { return JSON.parse(sessionStorage.getItem('mc_usuario') || '{}'); }
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
        // Sesión expirada → redirigir al login
        sessionStorage.clear();
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
  global.google.script.run = new Proxy({}, {
    get: function(_, fnName) {
      // Ignorar propiedades internas de JS
      if (typeof fnName !== 'string' || fnName.startsWith('__')) return undefined;

      var _success = null, _error = null;

      function execCall(rawArg) {
        // Normalizar argumento: objetos pasan directo, primitivos se envuelven
        var data;
        if (rawArg === null || rawArg === undefined) {
          data = {};
        } else if (typeof rawArg === 'object' && !Array.isArray(rawArg)) {
          data = rawArg;
        } else {
          // Primitivo (string, number, boolean) o array
          // El dispatcher GAS lo detectará y extraerá como fnArg
          data = { '0': rawArg };
        }
        call(fnName, data, _success, _error);
      }

      // Builder con handlers
      var builder = {
        withSuccessHandler: function(fn) { _success = fn; return builder; },
        withFailureHandler: function(fn) { _error = fn; return builder; },
      };

      // Devolver un objeto que funciona como builder Y como función
      return new Proxy(builder, {
        // Cuando se llama directamente: google.script.run.mc_pub_X(data)
        apply: function(target, thisArg, args) {
          execCall(args[0]);
        },
        get: function(target, prop) {
          // Acceso a withSuccessHandler / withFailureHandler
          if (prop in target) return target[prop];
          // Acceso a la función misma: .withSuccessHandler(fn).mc_pub_X(data)
          if (typeof prop === 'string' && prop === fnName) {
            return function() { execCall(arguments[0]); };
          }
          // Cualquier otro nombre de función → llamada directa
          return function() { execCall(arguments[0]); };
        }
      });
    }
  });

  // google.script.host.close() — no hace nada fuera de GAS pero tampoco rompe
  global.google.script.host = { close: function() {
    // En web app standalone, cerrar un "modal" equivale a volver al panel anterior
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'MC_CLOSE_PANEL' }, '*');
    }
  }};

})(window);
