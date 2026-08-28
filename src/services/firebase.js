import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBrBqmKS57MYUvFHxrTFuId_S3TJwaCj0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gemoc-login.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gemoc-login",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gemoc-login.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "819519939",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:819519939:web:668ff53d4c47029d5d5d76",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-L8343PXT5W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Processa o resultado do redirect (chamar na inicializacao do app)
 * Retorna { user, token } ou null se nao veio de redirect
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const user = result.user;
    const token = await user.getIdToken();
    const userData = await saveOrUpdateUser(user);
    return { user: userData, token };
  } catch (err) {
    // Erro "missing initial state" = sessionStorage inacessível (mobile, in-app browser)
    // Limpa estado pendente do redirect para não travar
    console.error('[Firebase] Erro no redirect:', err);
    try { await signOut(auth); } catch (e) { /* ignora */ }
    return null;
  }
}

/**
 * Salva ou atualiza o perfil do usuario no Firestore
 * Se o Firestore estiver indisponivel, retorna dados default
 */
async function saveOrUpdateUser(user) {
  // Dados default caso Firestore falhe
  const defaultData = {
    uid: user.uid,
    nome: user.displayName,
    email: user.email,
    foto: user.photoURL,
    tipo: 'user',
    status: 'pendente',
  };

  try {
    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      nome: user.displayName,
      email: user.email,
      foto: user.photoURL,
      ultimoLogin: serverTimestamp(),
    };

    let tipo = 'user';
    let status = 'pendente';
    let permissoes = undefined;

    if (!userSnap.exists()) {
      const allUsersSnap = await getDocs(collection(db, 'usuarios'));
      const isFirstUser = allUsersSnap.empty;

      userData.primeiroAcesso = serverTimestamp();
      userData.loginCount = 1;
      userData.tipo = isFirstUser ? 'admin' : 'user';
      userData.status = isFirstUser ? 'ativo' : 'pendente';
      await setDoc(userRef, userData);

      tipo = userData.tipo;
      status = userData.status;
    } else {
      const existing = userSnap.data();
      tipo = existing.tipo || 'user';
      status = existing.status || 'pendente';
      permissoes = existing.permissoes;
      userData.loginCount = (existing.loginCount || 0) + 1;
      userData.primeiroAcesso = existing.primeiroAcesso || serverTimestamp();
      await setDoc(userRef, userData, { merge: true });
    }

    return {
      uid: user.uid,
      nome: user.displayName,
      email: user.email,
      foto: user.photoURL,
      tipo,
      status,
      permissoes,
    };
  } catch (err) {
    // Erro de permissao — mostra instrucao pro usuario
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient')) {
      throw new Error(
        'Firestore esta bloqueando o acesso. ' +
        'Va no Firebase Console > Firestore > Regras, cole as regras abaixo e publique:\n\n' +
        "rules_version = '2';\n" +
        'service cloud.firestore {\n' +
        "  match /databases/{database}/documents {\n" +
        "    // ─── Regras para usuarios comuns ──────────────────────\n" +
        "    match /usuarios/{userId} {\n" +
        "      allow create: if request.auth != null && request.auth.uid == userId;\n" +
        "      allow read: if request.auth != null;\n" +
        "      allow update: if request.auth != null\n" +
        "        && request.auth.uid == userId\n" +
        "        && (request.resource.data.tipo == resource.data.tipo\n" +
        "            || !('tipo' in request.resource.data))\n" +
        "        && (request.resource.data.status == resource.data.status\n" +
        "            || !('status' in request.resource.data));\n" +
        "      allow delete: if false;\n" +
        "    }\n" +
        "    // ─── Regras para admins ───────────────────────────────\n" +
        "    match /usuarios/{userId} {\n" +
        "      allow read, write: if request.auth != null\n" +
        "        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.tipo == 'admin';\n" +
        "    }\n" +
        "    // ─── Bloquear tudo que nao for usuarios/ ──────────────\n" +
        "    match /{document=**} {\n" +
        "      allow read, write: if false;\n" +
        "    }\n" +
        "  }\n" +
        "}\n\n" +
        '⚠️ ATENCAO: Essas regras permitem que usuarios se CADASTREM,\n' +
        'mas IMPEDEM que se promovam a admin (nao podem alterar tipo/status).\n' +
        'Apenas o primeiro usuario logado vira admin automaticamente.\n' +
        'Apos isso, apenas admins podem alterar tipo/status de outros usuarios.'
      );
    }
    // Firestore offline — retorna dados sem persistir
    console.warn('[Firebase] Firestore indisponivel, usando dados default:', err.message);
    return defaultData;
  }
}

/**
 * Login com Google via popup
 * Retorna { user, token } ou lanca erro
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const token = await user.getIdToken();
  const userData = await saveOrUpdateUser(user);
  return { user: userData, token };
}

/**
 * Login com Google via redirect (fallback para quando popup é bloqueado)
 */
export async function loginWithGoogleRedirect() {
  await signInWithRedirect(auth, googleProvider);
  // Apos o redirect, a pagina recarrega e handleRedirectResult pega o resultado
}

/**
 * Logout
 */
export async function logoutFirebase() {
  await signOut(auth);
}

/**
 * Retorna todos os usuarios cadastrados (apenas admin)
 */
export async function getAllUsers() {
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    return snap.docs.map(d => ({
      uid: d.id,
      ...d.data(),
      primeiroAcesso: d.data().primeiroAcesso?.toDate?.()?.toISOString() || null,
      ultimoLogin: d.data().ultimoLogin?.toDate?.()?.toISOString() || null,
    }));
  } catch (err) {
    console.warn('[Firebase] Erro ao buscar usuarios:', err.message);
    return [];
  }
}

/**
 * Altera o tipo de um usuario (admin/user)
 */
export async function setUserTipo(uid, novoTipo) {
  try {
    const userRef = doc(db, 'usuarios', uid);
    await updateDoc(userRef, { tipo: novoTipo });
  } catch (err) {
    console.warn('[Firebase] Erro ao alterar tipo:', err.message);
    throw err;
  }
}

/**
 * Altera o status de um usuario (pendente/ativo)
 */
export async function setUserStatus(uid, novoStatus) {
  try {
    const userRef = doc(db, 'usuarios', uid);
    await updateDoc(userRef, { status: novoStatus });
  } catch (err) {
    console.warn('[Firebase] Erro ao alterar status:', err.message);
    throw err;
  }
}

export async function setUserPermissoes(uid, permissoes) {
  try {
    const userRef = doc(db, 'usuarios', uid);
    await updateDoc(userRef, { permissoes });
  } catch (err) {
    console.warn('[Firebase] Erro ao alterar permissoes:', err.message);
    throw err;
  }
}

export { auth, db, doc, getDoc, collection, getDocs, updateDoc, setDoc, serverTimestamp };
