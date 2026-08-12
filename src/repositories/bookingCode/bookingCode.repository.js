// repositories/bookingCode/bookingCode.js 

const { BookingCode } = require('../../models');

const createBookingCode = async (bookingData, transaction = null) => {
  return await BookingCode.create(bookingData, { transaction });
};

const findBookingCodeByCode = async (code) => {
  return await BookingCode.findOne({
    where: {
      code,
      is_active: true
    }
  });
};

const deactivateBookingCode = async (code, transaction = null) => {
  const [updatedRows] = await BookingCode.update(
    { is_active: false },
    { where: { code }, transaction }
  );
  return updatedRows > 0;
};

module.exports = {
  createBookingCode,
  findBookingCodeByCode,
  deactivateBookingCode
};