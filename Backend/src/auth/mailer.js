const debug = require('debug')('app:auth-mailer');

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM
});

const hasSmtpConfig = (config) => (
  Boolean(config.host) &&
  Boolean(config.port) &&
  Boolean(config.user) &&
  Boolean(config.pass) &&
  Boolean(config.from)
);

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const smtpConfig = getSmtpConfig();

  if (!hasSmtpConfig(smtpConfig)) {
    debug('SMTP no configurado. Se omite envío de correo de recuperación.');
    return { sent: false, reason: 'SMTP no configurado' };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    debug('Nodemailer no está instalado. Se omite envío de correo de recuperación.');
    return { sent: false, reason: 'Nodemailer no instalado' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  const subject = 'Recuperación de contraseña - Inventario Empresarial';
  const text = [
    'Recibimos una solicitud para restablecer tu contraseña.',
    '',
    `Usa este enlace para continuar: ${resetUrl}`,
    '',
    'Este enlace expira en 60 minutos.',
    'Si no solicitaste este cambio, puedes ignorar este mensaje.'
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">Recuperación de contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        Para continuar, haz clic en el siguiente enlace seguro:<br />
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <p><strong>Este enlace expira en 60 minutos.</strong></p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
    </div>
  `;

  await transporter.sendMail({
    from: smtpConfig.from,
    to,
    subject,
    text,
    html
  });

  return { sent: true };
};

module.exports = {
  sendPasswordResetEmail
};
