function getThaiTime() {
    const thai = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' });
    const [date, time] = thai.split(', ');
    return { date: date.replace(/\//g, '-'), time, full: `${time} ${date.replace(/\//g, '-')}` };
}
module.exports = { getThaiTime };
