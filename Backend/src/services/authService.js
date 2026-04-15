const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { userRepository } = require('../repositories/userRepository');
const { signAccessToken } = require('../auth/jwt');

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
  }
};

module.exports = { authService };