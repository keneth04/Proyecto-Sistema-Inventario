const bcrypt = require('bcrypt');
const crypto = require('crypto');
const createError = require('http-errors');
const { Config } = require('../config');
const { userRepository } = require('../repositories/userRepository');
const { passwordResetRepository } = require('../repositories/passwordResetRepository');
const { signAccessToken } = require('../auth/jwt');
const { sendPasswordResetEmail } = require('../auth/mailer');
const { Logger } = require('../common/logger');

const PASSWORD_RESET_EXPIRATION_MINUTES = 60;

const authService = {
  login: async ({ email, password }) => {
    const user = await userRepository.findByEmail(email);

    if (!user || user.status !== 'ACTIVE' || !user.role?.isActive) {
      throw new createError.Unauthorized('Credenciales inválidas');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new createError.Unauthorized('Credenciales inválidas');
    }

    const token = signAccessToken(user);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.code
      }
    };
  },

  getCurrentProfile: async (userId) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new createError.NotFound('Usuario no encontrado');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.code,
      status: user.status
    };
  },

  forgotPassword: async ({ email }) => {
    const user = await userRepository.findByEmail(email);

    if (!user || user.status !== 'ACTIVE') {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);

    await passwordResetRepository.upsertPendingTokenForUser({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    const resetBaseUrl = process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:5173/reset-password';
    const resetUrl = `${resetBaseUrl}?token=${encodeURIComponent(rawToken)}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl
      });
    } catch (error) {
      Logger.error('password_reset_email_failed', {
        userId: user.id,
        email: user.email,
        error: Logger.toErrorObject(error)
      });
      throw new createError.InternalServerError('No fue posible enviar el correo de recuperación');
    }
  },

  resetPassword: async ({ token, newPassword }) => {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await passwordResetRepository.consumeValidToken(tokenHash);

    if (!user) {
      throw new createError.BadRequest('El enlace de recuperación es inválido o expiró');
    }

    const passwordHash = await bcrypt.hash(newPassword, Config.bcryptRounds);

    await userRepository.update(user.id, {
      passwordHash
    });
  }
};

module.exports = { authService };