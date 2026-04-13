module.exports.Response = {
  success: (res, status = 200, message = 'Ok', body = {}) => {
    return res.status(status).json({
      success: true,
      message,
      body
    });
  }
};
