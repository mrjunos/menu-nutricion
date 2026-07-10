// Config web del proyecto Firebase. Estos valores son públicos por diseño:
// la seguridad la dan las reglas de Firestore (solo los emails autorizados leen/escriben).
// OJO: solo el objeto exportado — la inicialización la hace firebase-sync.js.
export const firebaseConfig = {
  apiKey: 'AIzaSyC4Nq6eujpPUuHDPJnlQwvC-TA--K--Hck',
  authDomain: 'menu-nutricion.firebaseapp.com',
  projectId: 'menu-nutricion',
  storageBucket: 'menu-nutricion.firebasestorage.app',
  messagingSenderId: '491570177841',
  appId: '1:491570177841:web:a0977b19899e7afa30f210',
};
