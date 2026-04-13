/**
 * AUTH SERVICE
 * -------------
 * Lógica de autenticación.
 * No maneja HTTP.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { Database } = require('../database');
const { Config } = require('../config');
const { sendPasswordResetEmail } = require('./mailer');

const COLLECTION = 'users';
const JWT_SECRET = Config.jwt_secret;
const JWT_EXPIRES = '8h';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 10 * 60 * 1000;
const DEFAULT_SESSION_VERSION = 0;
const CSRF_TOKEN_BYTES = 32;

/**
 * 🔎 Valida credenciales básicas
 */
const validateCredentialsInput = ({ email, password }) => {
  if (!email || !password) {
    throw new createError.BadRequest('Credenciales incompletas');
  }
};

/**
 * 🔎 Busca usuario por email
 */
const findUserByEmail = async (email) => {
  const collection = await Database(COLLECTION);
  const user = await collection.findOne({ email });

  if (!user) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  return user;
};

const getRemainingLockMinutes = (lockUntil) => {
  const remainingMs = new Date(lockUntil).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / (60 * 1000));
};

const ensureUserNotLocked = (user) => {
  if (!user.lockUntil) {
    return;
  }

  const remainingMinutes = getRemainingLockMinutes(user.lockUntil);

  if (remainingMinutes > 0) {
    throw new createError.Locked(`Cuenta bloqueada, intenta nuevamente en ${remainingMinutes} minutos`);
  }
};

/**
 * 🔎 Verifica si usuario está activo
 */
const validateUserStatus = (user) => {
  if (user.status === 'inactive') {
    throw new createError.Forbidden('Usuario inactivo');
  }
};

/**
 * 🔎 Verifica contraseña
 */
const validatePassword = async (password, hashedPassword) => {
  const isValid = await bcrypt.compare(password, hashedPassword);

  return isValid;
};

const registerFailedLoginAttempt = async (userId, currentAttempts = 0) => {
  const collection = await Database(COLLECTION);
  const nextAttempts = currentAttempts + 1;
  const lockUntil = nextAttempts >= MAX_LOGIN_ATTEMPTS
    ? new Date(Date.now() + LOCK_TIME_MS)
    : null;

  const updatePayload = {
    loginAttempts: nextAttempts,
    updatedAt: new Date()
  };

  if (lockUntil) {
    updatePayload.lockUntil = lockUntil;
  }

  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: updatePayload }
  );

  if (lockUntil) {
    const minutes = getRemainingLockMinutes(lockUntil);
    throw new createError.Locked(`Cuenta bloqueada, intenta nuevamente en ${minutes} minutos`);
  }

  throw new createError.Unauthorized('Credenciales inválidas');
};

const resetLoginAttempts = async (userId) => {
  const collection = await Database(COLLECTION);

  await collection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        loginAttempts: 0,
        updatedAt: new Date()
      },
      $unset: {
        lockUntil: ''
      }
    }
  );
};


const ensureStrongPassword = (password) => {
  if (!password) {
    throw new createError.BadRequest('La nueva contraseña es obligatoria');
  }

  if (typeof password !== 'string' || password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new createError.BadRequest(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
};

/**
 * 🔐 Genera token JWT
 */
const generateToken = (user) => {
  const sessionVersion = Number.isInteger(user.sessionVersion)
    ? user.sessionVersion
    : DEFAULT_SESSION_VERSION;

  const payload = {
    id: user._id,
    role: user.role,
    email: user.email,
    sessionVersion,
    csrfToken: user.csrfToken
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES
  });
};

const generateCsrfToken = () => crypto.randomBytes(CSRF_TOKEN_BYTES).toString('hex');

const getSessionUser = async (userId) => {
  const collection = await Database(COLLECTION);
  const user = await collection.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new createError.Unauthorized('Sesión inválida');
  }

  validateUserStatus(user);

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
};

const forgotPassword = async ({ email }) => {
  if (!email) {
    throw new createError.BadRequest('El correo es obligatorio');
  }

  const collection = await Database(COLLECTION);
  const user = await collection.findOne({ email });

  if (!user) {
    return { ok: true };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await collection.updateOne(
    { _id: new ObjectId(user._id) },
    {
      $set: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
        updatedAt: new Date()
      }
    }
  );

  const resetBaseUrl = process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:5173/reset-password';
  const resetUrl = `${resetBaseUrl}?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: email,
    resetUrl
  });

  return { ok: true };
};

const resetPassword = async ({ token, newPassword }) => {
  if (!token) {
    throw new createError.BadRequest('El token de recuperación es obligatorio');
  }

  ensureStrongPassword(newPassword);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const collection = await Database(COLLECTION);

  const user = await collection.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new createError.BadRequest('El token es inválido o expiró. Solicita una nueva recuperación');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await collection.updateOne(
    { _id: new ObjectId(user._id) },
    {
      $set: {
        password: hashedPassword,
        sessionVersion: (user.sessionVersion || 0) + 1,
        updatedAt: new Date()
      },
      $unset: {
        resetPasswordTokenHash: '',
        resetPasswordExpiresAt: ''
      }
    }
  );

  return { updated: true };
};

const logout = async (userId) => {
  const collection = await Database(COLLECTION);
  const objectId = new ObjectId(userId);

  const user = await collection.findOne(
    { _id: objectId },
    { projection: { sessionVersion: 1 } }
  );

  if (!user) {
    throw new createError.Unauthorized('Sesión inválida');
  }

  await collection.updateOne(
    { _id: objectId },
    {
      $set: {
        sessionVersion: (user.sessionVersion || 0) + 1,
        updatedAt: new Date()
      }
    }
  );
};


/**
 * 🚀 LOGIN PRINCIPAL
 */
const login = async (credentials) => {

  validateCredentialsInput(credentials);

  const user = await findUserByEmail(credentials.email);

  ensureUserNotLocked(user);

  validateUserStatus(user);

  const validPassword = await validatePassword(credentials.password, user.password);
  if (!validPassword) {
    await registerFailedLoginAttempt(user._id, user.loginAttempts || 0);
  }

  await resetLoginAttempts(user._id);

  const csrfToken = generateCsrfToken();
  const token = generateToken({
    ...user,
    csrfToken
  });

  return {
    token,
    csrfToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

module.exports.AuthService = {
  login,
  logout,
  getSessionUser,
  forgotPassword,
  resetPassword
};
