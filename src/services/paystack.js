import axios from 'axios';

// Use environment variable instead of hardcoded key
const PAYSTACK_SECRET_KEY = process.env.REACT_APP_PAYSTACK_SECRET_KEY;

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const initiateRefund = async (reference, amountInKobo) => {
  try {
    const response = await paystack.post('/refund', {
      transaction: reference,
      amount: amountInKobo, // Optional; omit to refund full
    });
    return response.data;
  } catch (error) {
    console.error('Refund error:', error.response?.data || error.message);
    throw error;
  }
};

export const verifyTransaction = async (reference) => {
  try {
    const response = await paystack.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error) {
    console.error('Verify error:', error.response?.data || error.message);
    throw error;
  }
};
