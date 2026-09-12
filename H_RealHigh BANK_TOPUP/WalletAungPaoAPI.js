'use strict';
const axios = require('axios');

// ── ดึง voucher hash จากลิงก์ TrueMoney gift ──
function extractVoucherHash(input) {
    const trimmed = (input || '').trim();
    const match = trimmed.match(/v=([a-zA-Z0-9]+)/) || trimmed.match(/([a-zA-Z0-9]{18,})$/);
    return match ? match[1] : trimmed;
}

// ── เปิดซองอั่งเปา TrueMoney ด้วยเบอร์รับเงินที่ตั้งไว้ ──
// คืนค่า: { ok: true, amount } หรือ { ok: false, error, message }
async function AUNGPAO_API_WALLET(voucherLinkOrHash, receiverPhone) {
    const voucherHash = extractVoucherHash(voucherLinkOrHash);

    if (!voucherHash) {
        return { ok: false, error: 'INVALID_LINK', message: 'ลิงก์ซองอั่งเปาไม่ถูกต้อง' };
    }
    if (!receiverPhone) {
        return { ok: false, error: 'NO_RECEIVER', message: 'ยังไม่ได้ตั้งค่าเบอร์รับเงิน (แอดมินต้องตั้งค่าก่อน)' };
    }

    try {
        const res = await axios.post(
            `https://gift.truemoney.com/campaign/vouchers/${voucherHash}/redeem`,
            { mobile: receiverPhone, voucher_hash: voucherHash },
            { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
        );

        const data = res.data;
        const status = data?.status?.code;

        if (status === 'SUCCESS') {
            const amount = parseFloat(data?.data?.my_ticket?.amount_baht || data?.data?.amount || 0);
            return { ok: true, amount };
        }

        const errorMap = {
            'VOUCHER_NOT_FOUND':            'ไม่พบซองอั่งเปานี้ (ลิงก์ผิดหรือหมดอายุ)',
            'VOUCHER_OUT_OF_STOCK':         'ซองอั่งเปานี้ถูกใช้ไปแล้ว',
            'VOUCHER_EXPIRED':              'ซองอั่งเปานี้หมดอายุแล้ว',
            'TARGET_USER_NOT_ELIGIBLE':     'เบอร์รับเงินนี้ไม่มีสิทธิ์รับซองนี้ (อาจเป็นซองเฉพาะบุคคล)',
            'CANNOT_GET_OWN_VOUCHER':       'ไม่สามารถรับซองของตัวเองได้',
        };

        return {
            ok: false,
            error: status || 'UNKNOWN_ERROR',
            message: errorMap[status] || data?.status?.message || 'ไม่สามารถเปิดซองอั่งเปานี้ได้'
        };

    } catch (err) {
        const apiMsg = err.response?.data?.status?.message;
        return {
            ok: false,
            error: 'REQUEST_FAILED',
            message: apiMsg || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ TrueMoney'
        };
    }
}

module.exports = { AUNGPAO_API_WALLET, extractVoucherHash };
