/**
 * MC_WIDGET_FLOTANTE — Tarjeta de "Mi Día" que queda ENCIMA de todo
 * ─────────────────────────────────────────────────────────────────────────
 * Usa la API "Document Picture-in-Picture" (Chrome/Edge 116+), la misma
 * tecnología del video flotante de YouTube, aplicada a HTML normal.
 * Esto sí queda flotando sobre CUALQUIER ventana (el navegador, Word,
 * Excel, etc.) mientras trabajas — no solo sobre otras pestañas.
 *
 * Si el navegador no soporta esa API (Firefox, Safari), cae automáticamente
 * a una ventana normal (widget.html), que sigue siendo útil pero se tapa
 * como cualquier otra ventana.
 *
 * Se incluye en AppShell.html y AppShellOp.html, después de api.js:
 *   <script src="../assets/widget-flotante.js"></script>
 *
 * Y se dispara con un botón:
 *   <button class="tb-btn" onclick="MC_abrirWidgetFlotante()">📌 Fijar Mi Día</button>
 *
 * Importante: por seguridad de los navegadores, esto SOLO se puede abrir
 * como reacción directa a un clic de la persona (no se puede abrir solo).
 */
(function () {
  var pipWindow = null;
  var pollTimer = null;
  // Capturado AHORA porque document.currentScript deja de existir en cuanto
  // el script termina de ejecutarse (no sirve dentro de un manejador de clic).
  var MI_SCRIPT_URL_ = (document.currentScript && document.currentScript.src) || '';

  function prioridadClase(p) {
    p = String(p || '').toLowerCase();
    if (/alta|urgente/.test(p)) return 'b-alta';
    if (/baja/.test(p)) return 'b-baja';
    return 'b-media';
  }

  function estilosPip() {
    return [
      '*{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:Inter,system-ui,sans-serif;font-size:12px;background:#F1F5F9;color:#0F172A;height:100vh;overflow:hidden;display:flex;flex-direction:column}',
      '.head{background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;padding:9px 11px;flex-shrink:0}',
      '.head .t{font-weight:700;font-size:12px}',
      '.head .h{font-size:10px;opacity:.85}',
      '.body{flex:1;overflow-y:auto;padding:9px}',
      '.item{background:#fff;border:1px solid #E8ECF0;border-radius:9px;padding:8px 9px;margin-bottom:6px}',
      '.item .n{font-weight:600;font-size:11.5px;margin-bottom:2px}',
      '.item .m{font-size:10px;color:#64748B;display:flex;justify-content:space-between}',
      '.badge{display:inline-block;padding:1px 6px;border-radius:6px;font-size:9px;font-weight:700}',
      '.b-alta{background:#FEE2E2;color:#DC2626}.b-media{background:#FEF3C7;color:#D97706}.b-baja{background:#DCFCE7;color:#059669}',
      '.empty{text-align:center;color:#94A3B8;padding:20px 8px;font-size:11px}',
      '.sec-t{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94A3B8;margin:8px 0 5px}',
      '.sec-t:first-child{margin-top:0}'
    ].join('');
  }

  function render(doc, d) {
    var body = doc.getElementById('body');
    var html = '';
    var items = d.items || [], soporte = d.soporte || [], reuniones = d.reuniones || [];

    if (reuniones.length) {
      html += '<div class="sec-t">Reuniones de hoy</div>';
      reuniones.forEach(function (r) {
        html += '<div class="item"><div class="n">' + (r.titulo || 'Reunión') + '</div><div class="m"><span>' + (r.hora || '') + '</span></div></div>';
      });
    }
    if (items.length) {
      html += '<div class="sec-t">Tareas de proyecto</div>';
      items.forEach(function (it) {
        html += '<div class="item"><div class="n">' + (it.nombre || it.proyecto || 'Tarea') + '</div>' +
          '<div class="m"><span>' + (it.marca || '') + (it.limite ? ' · vence ' + it.limite : '') + '</span></div></div>';
      });
    }
    if (soporte.length) {
      html += '<div class="sec-t">Soporte</div>';
      soporte.forEach(function (s) {
        html += '<div class="item"><div class="n">' + (s.nombre || 'Ticket') + '</div>' +
          '<div class="m"><span>' + (s.marca || '') + '</span><span class="badge ' + prioridadClase(s.prioridad) + '">' + (s.prioridad || '') + '</span></div></div>';
      });
    }
    if (!html) html = '<div class="empty">🎉 No tienes pendientes por ahora.</div>';
    body.innerHTML = html;
  }

  // Las llamadas a MC_API se hacen SIEMPRE desde el documento principal
  // (esta página), no desde dentro de la ventana PiP — así no hay que
  // preocuparse por compartir sesión: usamos la sesión ya activa aquí.
  function cargarEnPip(doc) {
    var u = MC_API.getUsuario();
    if (!u || !u.nombre) { doc.getElementById('body').innerHTML = '<div class="empty">Sin sesión activa.</div>'; return; }
    var accion = (u.rol === 'operativa') ? 'OP_MI_DIA' : 'GET_MI_DIA';
    var payload = (u.rol === 'operativa') ? { data: { usuario: u.nombre } } : { usuario: u.nombre };
    MC_API.call(accion, payload, function (r) {
      if (r && r.ok) render(doc, r);
      else doc.getElementById('body').innerHTML = '<div class="empty">No se pudo cargar. Reintentando...</div>';
    }, function () {
      doc.getElementById('body').innerHTML = '<div class="empty">Sin conexión. Reintentando...</div>';
    });
  }

  async function abrirConPip() {
    if (pipWindow) { pipWindow.focus(); return; }
    pipWindow = await documentPictureInPicture.requestWindow({ width: 290, height: 380 });

    var style = pipWindow.document.createElement('style');
    style.textContent = estilosPip();
    pipWindow.document.head.appendChild(style);

    var u = MC_API.getUsuario();
    pipWindow.document.body.innerHTML =
      '<div class="head"><div class="t">☀️ Mi Día</div><div class="h">' + (u.nombre || '') + '</div></div>' +
      '<div class="body" id="body"><div class="empty">Cargando...</div></div>';

    cargarEnPip(pipWindow.document);
    pollTimer = setInterval(function () {
      if (!pipWindow || pipWindow.closed) { clearInterval(pollTimer); return; }
      cargarEnPip(pipWindow.document);
    }, 120000);

    // Cuando la persona cierra la ventanita flotante
    pipWindow.addEventListener('pagehide', function () {
      clearInterval(pollTimer);
      pipWindow = null;
    });
  }

  function abrirFallback() {
    var w = 300, h = 420;
    var left = screen.availWidth - w - 20, top = screen.availHeight - h - 20;
    // Funciona sin importar si este script se cargó desde la raíz (index.html)
    // o desde panels/ (AppShell.html), calculando la ruta a partir de dónde
    // vive este mismo archivo.
    var widgetUrl = MI_SCRIPT_URL_ ? new URL('../widget.html', MI_SCRIPT_URL_).href : 'widget.html';
    window.open(widgetUrl, 'mc_widget', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
  }

  window.MC_abrirWidgetFlotante = function () {
    if ('documentPictureInPicture' in window) {
      abrirConPip().catch(function (e) {
        console.error('No se pudo abrir el widget flotante:', e);
        abrirFallback();
      });
    } else {
      abrirFallback();
    }
  };

  // ── Botón flotante propio (no depende del HTML de cada shell) ────────────
  function inyectarBoton() {
    if (document.getElementById('mc-pin-fab')) return;
    var b = document.createElement('button');
    b.id = 'mc-pin-fab';
    b.title = 'Fijar Mi Día en pantalla';
    b.textContent = '📌';
    b.style.cssText = [
      'position:fixed;left:86px;bottom:22px;width:44px;height:44px;border-radius:50%;',
      'background:#fff;color:#7C3AED;border:1px solid #E8ECF0;font-size:18px;cursor:pointer;',
      'box-shadow:0 4px 14px rgba(15,23,42,.14);z-index:9998;display:flex;',
      'align-items:center;justify-content:center;transition:transform .15s'
    ].join('');
    b.onmouseenter = function () { b.style.transform = 'scale(1.06)'; };
    b.onmouseleave = function () { b.style.transform = 'scale(1)'; };
    b.onclick = window.MC_abrirWidgetFlotante;
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inyectarBoton);
  else inyectarBoton();
})();
