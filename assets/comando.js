/**
 * MC_COMANDO — Widget flotante de "hablar con el sistema" + modo Jarvis
 * ─────────────────────────────────────────────────────────────────────────
 * Se incluye en AppShell.html y AppShellOp.html, después de api.js:
 *   <script src="../assets/comando.js"></script>
 *
 * Dos formas de usarlo:
 *  1) Clic en el botón 🎙️ → escribir o hablar UNA orden puntual → confirmar
 *     con un clic → se ejecuta.
 *  2) Modo manos libres ("Jarvis"): se activa una vez con un clic, y desde
 *     ahí puedes decir en cualquier momento, sin tocar nada:
 *       "Jarvis, crea la tarea X para el proyecto Y"
 *     El sistema responde hablando, pide confirmación de viva voz (sí/no),
 *     ejecuta, y avisa cuando ya quedó listo, usando tu nombre de perfil.
 *
 * LÍMITE REAL (léelo antes de prometerle esto a nadie más):
 * Esto solo escucha mientras la pestaña del CMS sigue abierta en el
 * navegador (puede estar en segundo plano mientras usas otra ventana).
 * Si cierras el navegador por completo, deja de escuchar — ningún sitio
 * web puede escuchar con el navegador cerrado, por seguridad del sistema.
 */
(function () {
  var STYLE_ID = 'mc-comando-style';
  var reconociendo = false;      // dictado de un solo comando (botón mic)
  var jarvisActivo = false;      // modo manos libres encendido/apagado
  var jarvisEscuchando = false;  // recognition corriendo ahora mismo
  var esperandoConfirmacionVoz = false;
  var pendiente = null;          // {accion, data, resumen}
  var WAKE_WORDS = ['jarvis', 'yarvis', 'harvis'];

  function inyectarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '#mc-cmd-fab{position:fixed;right:22px;bottom:22px;width:52px;height:52px;border-radius:50%;',
      'background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;border:none;font-size:22px;',
      'box-shadow:0 4px 14px rgba(124,58,237,.4);cursor:pointer;z-index:9999;display:flex;',
      'align-items:center;justify-content:center;transition:transform .15s}',
      '#mc-cmd-fab:hover{transform:scale(1.06)}',
      '#mc-cmd-fab.jarvis-on{box-shadow:0 0 0 4px rgba(220,38,38,.25),0 4px 14px rgba(124,58,237,.4);',
      'animation:mcPulse 1.6s infinite}',
      '@keyframes mcPulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.35)}70%{box-shadow:0 0 0 10px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}',
      '#mc-cmd-panel{position:fixed;right:22px;bottom:86px;width:320px;max-height:460px;background:#fff;',
      'border:1px solid #E8ECF0;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);',
      'display:none;flex-direction:column;overflow:hidden;z-index:9999;font-family:Inter,system-ui,sans-serif}',
      '#mc-cmd-panel.on{display:flex}',
      '#mc-cmd-head{padding:12px 14px;background:#F5F3FF;border-bottom:1px solid #E8ECF0;',
      'font-size:12px;font-weight:700;color:#5B21B6;display:flex;justify-content:space-between;align-items:center}',
      '#mc-cmd-close{cursor:pointer;color:#94A3B8;font-size:16px;line-height:1}',
      '#mc-cmd-jarvis-row{padding:9px 14px;border-bottom:1px solid #E8ECF0;display:flex;align-items:center;',
      'justify-content:space-between;font-size:11.5px;color:#334155;background:#FAFBFC}',
      '#mc-cmd-jarvis-toggle{width:38px;height:21px;border-radius:11px;background:#E2E8F0;position:relative;',
      'cursor:pointer;transition:.15s;flex-shrink:0}',
      '#mc-cmd-jarvis-toggle .dot{width:17px;height:17px;border-radius:50%;background:#fff;position:absolute;',
      'top:2px;left:2px;transition:.15s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
      '#mc-cmd-jarvis-toggle.on{background:#059669}',
      '#mc-cmd-jarvis-toggle.on .dot{left:19px}',
      '#mc-cmd-voz-row{padding:9px 14px;border-bottom:1px solid #E8ECF0;display:flex;align-items:center;',
      'justify-content:space-between;font-size:11.5px;color:#334155;background:#FAFBFC;gap:8px}',
      '#mc-cmd-voz{flex:1;max-width:190px;border:1px solid #E2E8F0;border-radius:7px;padding:4px 6px;',
      'font-size:11px;font-family:inherit;background:#fff;color:#334155}',
      '#mc-cmd-body{padding:12px 14px;overflow-y:auto;flex:1;font-size:12.5px;color:#0F172A}',
      '#mc-cmd-msg{min-height:32px;margin-bottom:10px;color:#334155;line-height:1.4}',
      '.mc-cmd-confirm{background:#F1F5F9;border:1px solid #E2E8F0;border-radius:10px;padding:10px;margin-top:6px}',
      '.mc-cmd-confirm .r{font-weight:600;margin-bottom:8px}',
      '.mc-cmd-btns{display:flex;gap:8px;margin-top:8px}',
      '.mc-cmd-btns button{flex:1;padding:7px 0;border-radius:8px;border:none;font-size:12px;cursor:pointer;font-weight:600}',
      '.mc-cmd-ok{background:#059669;color:#fff}',
      '.mc-cmd-no{background:#E2E8F0;color:#334155}',
      '#mc-cmd-foot{padding:10px;border-top:1px solid #E8ECF0;display:flex;gap:6px;align-items:center}',
      '#mc-cmd-input{flex:1;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;font-size:12.5px;',
      'font-family:inherit;resize:none;max-height:60px}',
      '#mc-cmd-mic,#mc-cmd-send{width:34px;height:34px;border-radius:8px;border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}',
      '#mc-cmd-mic{background:#F5F3FF;color:#7C3AED}',
      '#mc-cmd-mic.rec{background:#DC2626;color:#fff}',
      '#mc-cmd-send{background:#7C3AED;color:#fff}'
    ].join('');
    var s = document.createElement('style');
    s.id = STYLE_ID; s.textContent = css;
    document.head.appendChild(s);
  }

  function construirUI() {
    var fab = document.createElement('button');
    fab.id = 'mc-cmd-fab'; fab.title = 'Hablar con el sistema'; fab.textContent = '🎙️';
    fab.onclick = function () { togglePanel(); };

    var panel = document.createElement('div');
    panel.id = 'mc-cmd-panel';
    panel.innerHTML =
      '<div id="mc-cmd-head"><span>🎙️ Dale una orden al sistema</span><span id="mc-cmd-close">✕</span></div>' +
      '<div id="mc-cmd-jarvis-row"><span>Modo manos libres ("Jarvis")</span>' +
        '<div id="mc-cmd-jarvis-toggle"><div class="dot"></div></div></div>' +
      '<div id="mc-cmd-voz-row"><span>Voz</span><select id="mc-cmd-voz"></select></div>' +
      '<div id="mc-cmd-body"><div id="mc-cmd-msg">Escribe o habla una orden, por ejemplo: "crea una tarea para Camila de revisar el plugin de ETPOWER para mañana". O activa el modo manos libres y di "Jarvis" seguido de tu orden.</div></div>' +
      '<div id="mc-cmd-foot">' +
        '<textarea id="mc-cmd-input" rows="1" placeholder="Escribe tu orden..."></textarea>' +
        '<button id="mc-cmd-mic" title="Hablar">🎤</button>' +
        '<button id="mc-cmd-send" title="Enviar">➤</button>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    document.getElementById('mc-cmd-close').onclick = function () { panel.classList.remove('on'); };
    document.getElementById('mc-cmd-send').onclick = enviarTexto;
    document.getElementById('mc-cmd-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTexto(); }
    });
    document.getElementById('mc-cmd-mic').onclick = toggleMicUnaVez;
    document.getElementById('mc-cmd-jarvis-toggle').onclick = toggleJarvis;
  }

  function togglePanel() { document.getElementById('mc-cmd-panel').classList.toggle('on'); }
  function mostrarMsg(html) { document.getElementById('mc-cmd-msg').innerHTML = html; }
  function nombreUsuario() { var u = MC_API.getUsuario(); return (u && u.nombre) || ''; }

  function hablar(texto, cb) {
    try {
      if (!window.speechSynthesis) { if (cb) cb(); return; }
      var u = new SpeechSynthesisUtterance(String(texto).replace(/[✅⚠️🤔🎙️🟢]/g, ''));
      u.lang = 'es-PE';
      var vozElegida = mc_obtenerVozGuardada_();
      if (vozElegida) u.voice = vozElegida;
      if (cb) u.onend = cb;
      window.speechSynthesis.speak(u);
    } catch (e) { if (cb) cb(); }
  }

  // ── Selector de voz ─────────────────────────────────────────────────────
  var VOZ_KEY_ = 'mc_voz_jarvis';

  function mc_obtenerVozGuardada_() {
    var nombreGuardado = localStorage.getItem(VOZ_KEY_);
    if (!nombreGuardado) return null;
    var voces = window.speechSynthesis.getVoices();
    var v = voces.filter(function (x) { return x.name === nombreGuardado; })[0];
    return v || null;
  }

  function poblarSelectorVoces_() {
    var sel = document.getElementById('mc-cmd-voz');
    if (!sel || !window.speechSynthesis) return;
    var voces = window.speechSynthesis.getVoices();
    if (!voces.length) return; // a veces cargan async, se reintenta con el evento de abajo
    // Poner primero las voces en español, pero dejar todas disponibles por si
    // el navegador solo trae voces en inglés instaladas.
    var enEspanol = voces.filter(function (v) { return /^es/i.test(v.lang); });
    var otras = voces.filter(function (v) { return !/^es/i.test(v.lang); });
    var ordenadas = enEspanol.concat(otras);
    var guardada = localStorage.getItem(VOZ_KEY_);
    sel.innerHTML = ordenadas.map(function (v) {
      var sel_attr = (v.name === guardada) ? ' selected' : '';
      return '<option value="' + v.name.replace(/"/g,'') + '"' + sel_attr + '>' + v.name + ' (' + v.lang + ')</option>';
    }).join('');
    if (!guardada && ordenadas[0]) localStorage.setItem(VOZ_KEY_, ordenadas[0].name);
  }

  function initSelectorVoces_() {
    poblarSelectorVoces_();
    // Chrome carga la lista de voces de forma asíncrona la primera vez.
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = poblarSelectorVoces_;
    }
    var sel = document.getElementById('mc-cmd-voz');
    if (sel) {
      sel.onchange = function () {
        localStorage.setItem(VOZ_KEY_, sel.value);
        hablar('Hola, así sueno yo ahora.');
      };
    }
  }

  // ── Flujo de UN comando (por texto o por el botón de mic normal) ──────────
  function enviarTexto() {
    var input = document.getElementById('mc-cmd-input');
    var texto = (input.value || '').trim();
    if (!texto) return;
    input.value = '';
    interpretar(texto, { porVoz: false });
  }

  function interpretar(texto, opts) {
    opts = opts || {};
    mostrarMsg('Entendiendo la orden...');
    MC_API.call('AI_INTERPRETAR_COMANDO', { texto: texto }, function (r) {
      if (!r || !r.ok) {
        var m = '⚠️ ' + ((r && r.msg) || 'No se pudo interpretar la orden.');
        mostrarMsg(m); if (opts.porVoz) hablar('No entendí eso, ¿puedes repetirlo?');
        return;
      }
      if (!r.entendido) {
        mostrarMsg('🤔 ' + r.resumen);
        if (opts.porVoz) hablar(r.resumen);
        return;
      }
      pendiente = { accion: r.accion, data: r.data, resumen: r.resumen };
      mostrarMsg(
        '<div class="mc-cmd-confirm"><div class="r">' + r.resumen + '</div>' +
        '<div class="mc-cmd-btns">' +
          '<button class="mc-cmd-ok" id="mc-cmd-btn-ok">Sí, hazlo</button>' +
          '<button class="mc-cmd-no" id="mc-cmd-btn-no">Cancelar</button>' +
        '</div></div>'
      );
      document.getElementById('mc-cmd-btn-ok').onclick = function () { ejecutarPendiente(opts.porVoz); };
      document.getElementById('mc-cmd-btn-no').onclick = function () { pendiente = null; mostrarMsg('Cancelado. ¿Otra orden?'); };

      if (opts.porVoz) {
        // Confirmación de viva voz: Jarvis pregunta y espera sí/no habladas
        hablar(r.resumen + '. ¿Confirmas? Di sí o no.', function () { escucharConfirmacionVoz(); });
      }
    }, function () {
      var m = '⚠️ Error de conexión al interpretar la orden.';
      mostrarMsg(m); if (opts.porVoz) hablar('Hubo un error de conexión.');
    });
  }

  function ejecutarPendiente(porVoz) {
    if (!pendiente) return;
    mostrarMsg('Ejecutando...');
    var accion = pendiente.accion, data = pendiente.data;
    pendiente = null;
    var nombre = nombreUsuario();
    MC_API.call(accion, data, function (r) {
      if (r && r.ok) {
        var msgVisual = '✅ Listo. ' + (r.msg || '');
        var msgHablado = 'Listo' + (nombre ? ', ' + nombre : '') + '. ' + (r.msg || 'Se completó la acción.');
        mostrarMsg(msgVisual);
        if (porVoz) hablar(msgHablado, function () { if (jarvisActivo) reanudarEscuchaJarvis(); });
      } else {
        var e1 = '⚠️ ' + ((r && r.msg) || 'No se pudo completar la acción.');
        mostrarMsg(e1);
        if (porVoz) hablar('No se pudo completar. ' + ((r && r.msg) || ''), function () { if (jarvisActivo) reanudarEscuchaJarvis(); });
      }
    }, function () {
      mostrarMsg('⚠️ Error de conexión al ejecutar la acción.');
      if (porVoz) hablar('Hubo un error de conexión al ejecutar.', function () { if (jarvisActivo) reanudarEscuchaJarvis(); });
    });
  }

  // ── Dictado de un solo comando (botón 🎤 dentro del panel) ─────────────────
  var recognitionUnico = null;
  function toggleMicUnaVez() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) { mostrarMsg('⚠️ Este navegador no soporta dictado por voz. Usa el texto.'); return; }
    var btn = document.getElementById('mc-cmd-mic');
    if (reconociendo) { recognitionUnico && recognitionUnico.stop(); return; }
    recognitionUnico = new Ctor();
    recognitionUnico.lang = 'es-PE'; recognitionUnico.interimResults = false; recognitionUnico.maxAlternatives = 1;
    recognitionUnico.onstart = function () { reconociendo = true; btn.classList.add('rec'); mostrarMsg('Escuchando...'); };
    recognitionUnico.onend = function () { reconociendo = false; btn.classList.remove('rec'); };
    recognitionUnico.onerror = function () { reconociendo = false; btn.classList.remove('rec'); };
    recognitionUnico.onresult = function (e) {
      var texto = e.results[0][0].transcript;
      document.getElementById('mc-cmd-input').value = texto;
      interpretar(texto, { porVoz: false });
    };
    recognitionUnico.start();
  }

  // ── Modo manos libres: escucha continua esperando la palabra "Jarvis" ─────
  var recognitionJarvis = null;

  function toggleJarvis() {
    jarvisActivo = !jarvisActivo;
    document.getElementById('mc-cmd-jarvis-toggle').classList.toggle('on', jarvisActivo);
    document.getElementById('mc-cmd-fab').classList.toggle('jarvis-on', jarvisActivo);
    if (jarvisActivo) {
      var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) {
        mostrarMsg('⚠️ Este navegador no soporta el modo manos libres. Usa Chrome o Edge.');
        jarvisActivo = false;
        document.getElementById('mc-cmd-jarvis-toggle').classList.remove('on');
        return;
      }
      mostrarMsg('🟢 Modo manos libres activado. Di "Jarvis" seguido de tu orden, en cualquier momento.');
      iniciarEscuchaJarvis();
    } else {
      mostrarMsg('Modo manos libres desactivado.');
      detenerEscuchaJarvis();
    }
  }

  function iniciarEscuchaJarvis() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionJarvis = new Ctor();
    recognitionJarvis.lang = 'es-PE';
    recognitionJarvis.continuous = true;
    recognitionJarvis.interimResults = false;
    recognitionJarvis.onstart = function () { jarvisEscuchando = true; };
    recognitionJarvis.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var texto = e.results[i][0].transcript;
        procesarPosibleWake_(texto);
      }
    };
    recognitionJarvis.onerror = function (e) {
      // 'no-speech' y 'aborted' son normales en escucha continua: se reinicia solo.
    };
    recognitionJarvis.onend = function () {
      jarvisEscuchando = false;
      if (jarvisActivo && !esperandoConfirmacionVoz) {
        setTimeout(function () { if (jarvisActivo) iniciarEscuchaJarvis(); }, 300);
      }
    };
    try { recognitionJarvis.start(); } catch (e) {}
  }

  function detenerEscuchaJarvis() {
    jarvisActivo = false;
    if (recognitionJarvis) { try { recognitionJarvis.onend = null; recognitionJarvis.stop(); } catch (e) {} }
    recognitionJarvis = null;
  }

  function reanudarEscuchaJarvis() {
    esperandoConfirmacionVoz = false;
    if (jarvisActivo && !jarvisEscuchando) iniciarEscuchaJarvis();
  }

  function procesarPosibleWake_(textoOido) {
    var lower = textoOido.toLowerCase();
    var idx = -1, wakeUsada = '';
    WAKE_WORDS.forEach(function (w) {
      var p = lower.indexOf(w);
      if (p >= 0 && (idx === -1 || p < idx)) { idx = p; wakeUsada = w; }
    });
    if (idx === -1) return; // no se dijo la palabra de activación, se ignora

    var orden = textoOido.slice(idx + wakeUsada.length).replace(/^[,.\s]+/, '').trim();
    if (!orden) { hablar('Dime, ' + (nombreUsuario() || '') + '.'); return; }

    // Pausar la escucha continua mientras se procesa/confirma, para no
    // captar la propia voz del sistema (texto a voz) como si fuera un comando.
    esperandoConfirmacionVoz = true;
    if (recognitionJarvis) { try { recognitionJarvis.onend = null; recognitionJarvis.stop(); } catch (e) {} }
    document.getElementById('mc-cmd-panel').classList.add('on');
    interpretar(orden, { porVoz: true });
  }

  // Escucha corta de "sí" / "no" para confirmar de viva voz.
  function escucharConfirmacionVoz() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new Ctor();
    rec.lang = 'es-PE'; rec.interimResults = false; rec.maxAlternatives = 1;
    var resuelto = false;
    var timeout = setTimeout(function () {
      if (resuelto) return; resuelto = true;
      try { rec.stop(); } catch (e) {}
      pendiente = null;
      mostrarMsg('No escuché tu confirmación. Cancelado.');
      hablar('No escuché tu confirmación, cancelado.', function () { if (jarvisActivo) reanudarEscuchaJarvis(); });
    }, 7000);
    rec.onresult = function (e) {
      if (resuelto) return; resuelto = true; clearTimeout(timeout);
      var t = e.results[0][0].transcript.toLowerCase();
      if (/\b(si|sí|dale|confirmo|correcto|hazlo)\b/.test(t)) {
        ejecutarPendiente(true);
      } else {
        pendiente = null;
        mostrarMsg('Cancelado. ¿Otra orden?');
        hablar('Cancelado.', function () { if (jarvisActivo) reanudarEscuchaJarvis(); });
      }
    };
    rec.onerror = function () {
      if (resuelto) return; resuelto = true; clearTimeout(timeout);
      pendiente = null;
      hablar('No te escuché bien, cancelado.', function () { if (jarvisActivo) reanudarEscuchaJarvis(); });
    };
    try { rec.start(); } catch (e) {}
  }

  function init() { inyectarEstilos(); construirUI(); initSelectorVoces_(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
