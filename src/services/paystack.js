import axios from 'axios';

const PAYSTACK_SECRET_KEY = 'sk_test_2c4432f3c1a75f966fa22e522090f8a99023ccf7';

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
