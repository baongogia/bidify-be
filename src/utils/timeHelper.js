const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Asia/Ho_Chi_Minh';

// Lấy thời gian hiện tại chuẩn VN
const getNowVN = () => {
    return dayjs().tz(TIMEZONE);
};

// Format ra chuỗi YYYY-MM-DD HH:mm:ss cho MySQL
const toMySQLDatetime = (dayjsObj) => {
    return dayjsObj.format('YYYY-MM-DD HH:mm:ss');
};

// Mask username (VD: NguyenVanA -> N********A)
const maskUsername = (name) => {
    if (!name || name.length <= 2) return name;
    return `${name.charAt(0)}***${name.charAt(name.length - 1)}`;
};

// Lấy bước giá động
const getBidIncrement = (currentPrice) => {
    const price = Number(currentPrice);
    if (price < 1000000) {
        return 50000;
    } else if (price < 5000000) {
        return 100000;
    } else {
        return 200000;
    }
};

module.exports = {
    getNowVN,
    toMySQLDatetime,
    maskUsername,
    getBidIncrement
};
