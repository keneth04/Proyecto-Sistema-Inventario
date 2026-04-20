const { prisma } = require('../prisma/client');

const TABLE_NAME = 'password_reset_tokens';

const ensureTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      tokenHash VARCHAR(64) NOT NULL UNIQUE,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prt_userId (userId),
      INDEX idx_prt_expiresAt (expiresAt),
      CONSTRAINT fk_prt_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
};

const passwordResetRepository = {
  upsertPendingTokenForUser: async ({ userId, tokenHash, expiresAt }) => {
    await ensureTable();
    await prisma.$executeRawUnsafe(
      `DELETE FROM ${TABLE_NAME} WHERE userId = ? AND usedAt IS NULL`,
      userId
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE_NAME} (userId, tokenHash, expiresAt) VALUES (?, ?, ?)`,
      userId,
      tokenHash,
      expiresAt
    );
  },

  consumeValidToken: async (tokenHash) => {
    await ensureTable();

    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe(
        `
        SELECT prt.id, prt.userId
        FROM ${TABLE_NAME} prt
        INNER JOIN users u ON u.id = prt.userId
        WHERE prt.tokenHash = ?
          AND prt.usedAt IS NULL
          AND prt.expiresAt > NOW()
          AND u.status = 'ACTIVE'
        LIMIT 1
        `,
        tokenHash
      );

      const row = rows?.[0];
      if (!row) return null;

      await tx.$executeRawUnsafe(
        `UPDATE ${TABLE_NAME} SET usedAt = NOW() WHERE id = ? AND usedAt IS NULL`,
        row.id
      );

      return {
        id: Number(row.userId)
      };
    });
  }
};

module.exports = { passwordResetRepository };