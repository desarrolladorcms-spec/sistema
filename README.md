# Monstruo Creativo CMS — Frontend

Frontend del sistema de gestión de Agencia Monstruo Creativo.
Alojado en GitHub Pages, conectado al backend Google Apps Script.

## Estructura

```
mc-cms/
├── index.html          ← App principal con login
├── panels/             ← Todos los paneles del sistema
│   ├── PanelCentral.html
│   ├── PanelMiDia_Master.html
│   └── ...
└── assets/
    ├── api.js          ← Capa de comunicación con el GAS
    └── auth.js         ← Gestión de sesión PIN
```

## Setup inicial (solo una vez)

### 1. Fork o clona este repo
```bash
git clone https://github.com/TU_USUARIO/mc-cms.git
```

### 2. Activa GitHub Pages
Settings → Pages → Branch: main → / (root) → Save

### 3. Configura el GAS backend

En el editor de Apps Script (ROSSIO MASTER v24):
- Ve a Implementar → Nueva implementación → Web app
- Ejecutar como: **Tu cuenta**
- Acceso: **Cualquier usuario de Google**
- Copia la URL del web app

### 4. Configura PINs del equipo

En Apps Script → Proyecto → Propiedades del script, agrega:
```
ROSSIO_PIN  = 1234   (elige el PIN de Rossio, 4-6 dígitos)
CAMILA_PIN  = 5678
LUCY_PIN    = 9012
```

### 5. Primer acceso

Abre: `https://TU_USUARIO.github.io/mc-cms/`

La primera vez pide la URL del GAS y el PIN. Las siguientes veces solo el PIN.

## Actualizar paneles

Cuando se actualice un HTML en el proyecto GAS, copiar el archivo a `/panels/` y hacer commit:
```bash
git add panels/PanelMiDia_Master.html
git commit -m "feat: actualizar Mi Día con nuevas secciones"
git push
```
GitHub Pages se actualiza automáticamente en ~1 minuto.

## URLs del sistema

| Persona | URL |
|---|---|
| Todas | `https://TU_USUARIO.github.io/mc-cms/` |

Bookmark esta URL en el celular/computadora — funciona como PWA.
