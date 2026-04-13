const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const products = [
  {
    id: 1,
    seller_id: 2,
    category_id: 1,
    title: 'iPhone 13 Pro',
    description: 'Tình trạng 98%, xước nhẹ viền máy, pin ổn định, ngoại hình đẹp.',
    condition_status: 'USED',
    starting_price: 12500000,
    current_price: 12800000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Apple_iPhone_13_Pro.jpg',
    end_hours: 72,
  },
  {
    id: 2,
    seller_id: 1,
    category_id: 2,
    title: 'MacBook Air M1',
    description: 'Tình trạng 97%, máy mỏng nhẹ, bàn phím tốt, màn hình đẹp.',
    condition_status: 'USED',
    starting_price: 14500000,
    current_price: 14800000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/MacBook_Air_M1.png',
    end_hours: 60,
  },
  {
    id: 3,
    seller_id: 2,
    category_id: 3,
    title: 'AirPods Pro',
    description: 'Tình trạng 95%, hộp sạc còn tốt, âm thanh rõ, pin dùng ổn.',
    condition_status: 'USED',
    starting_price: 2900000,
    current_price: 3100000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Apple_airpods_pro.jpg',
    end_hours: 48,
  },
  {
    id: 4,
    seller_id: 2,
    category_id: 4,
    title: 'Apple Watch Series 8',
    description: 'Tình trạng 96%, mặt kính đẹp, dây đeo chắc chắn, hoạt động bình thường.',
    condition_status: 'USED',
    starting_price: 6800000,
    current_price: 7100000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Apple_Watch_Series_8.jpg',
    end_hours: 54,
  },
  {
    id: 5,
    seller_id: 1,
    category_id: 2,
    title: 'Túi laptop',
    description: 'Tình trạng 90%, còn chắc chắn, khóa kéo tốt, phù hợp mang đi học hoặc đi làm.',
    condition_status: 'USED',
    starting_price: 350000,
    current_price: 420000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Laptop_bag.jpg',
    end_hours: 36,
  },
  {
    id: 6,
    seller_id: 2,
    category_id: 2,
    title: 'Bàn phím cơ',
    description: 'Tình trạng 94%, switch nhạy, đèn hoạt động tốt, ngoại hình còn đẹp.',
    condition_status: 'USED',
    starting_price: 900000,
    current_price: 1050000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mechanical_Keyboard.jpg',
    end_hours: 40,
  },
  {
    id: 7,
    seller_id: 1,
    category_id: 2,
    title: 'Chuột Logitech',
    description: 'Tình trạng 93%, bấm nhạy, kết nối ổn định, ít trầy xước.',
    condition_status: 'USED',
    starting_price: 550000,
    current_price: 620000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Logitech_Mouse.JPG',
    end_hours: 44,
  },
  {
    id: 8,
    seller_id: 2,
    category_id: 2,
    title: 'Màn hình Dell',
    description: 'Tình trạng 96%, hiển thị tốt, không ám màu, viền đẹp.',
    condition_status: 'USED',
    starting_price: 2900000,
    current_price: 3150000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dell_Computer_Monitor.png',
    end_hours: 66,
  },
  {
    id: 9,
    seller_id: 1,
    category_id: 3,
    title: 'Loa JBL Bluetooth',
    description: 'Tình trạng 92%, âm lượng lớn, pin khá, vỏ có xước nhẹ.',
    condition_status: 'USED',
    starting_price: 1400000,
    current_price: 1650000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/JBL_speaker%2C_2021.jpg',
    end_hours: 30,
  },
  {
    id: 10,
    seller_id: 2,
    category_id: 5,
    title: 'Máy ảnh Canon',
    description: 'Tình trạng 95%, chụp nét, lens sạch, ngoại hình tốt.',
    condition_status: 'USED',
    starting_price: 7300000,
    current_price: 7600000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/My_Canon_EOS_camera.jpg',
    end_hours: 70,
  },
  {
    id: 11,
    seller_id: 1,
    category_id: 6,
    title: 'Ghế văn phòng',
    description: 'Tình trạng 90%, khung chắc chắn, bánh xe mượt, đệm ngồi còn tốt.',
    condition_status: 'USED',
    starting_price: 1100000,
    current_price: 1260000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Office_Chair_Derby_%28157328893%29.jpeg',
    end_hours: 28,
  },
  {
    id: 12,
    seller_id: 2,
    category_id: 6,
    title: 'Bình giữ nhiệt',
    description: 'Tình trạng 97%, giữ nhiệt tốt, thân bình đẹp, không móp méo.',
    condition_status: 'USED',
    starting_price: 250000,
    current_price: 310000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/18oz_Thermos_hydration_bottle.jpg',
    end_hours: 52,
  },
  {
    id: 13,
    seller_id: 1,
    category_id: 5,
    title: 'Xe đạp thể thao',
    description: 'Tình trạng 91%, khung chắc, phanh tốt, lốp còn sử dụng ổn.',
    condition_status: 'USED',
    starting_price: 4200000,
    current_price: 4550000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bicycle_BK_%281%29.jpg',
    end_hours: 24,
  },
  {
    id: 14,
    seller_id: 2,
    category_id: 6,
    title: 'Nồi cơm điện',
    description: 'Tình trạng 94%, nấu tốt, lòng nồi sạch, hoạt động ổn định.',
    condition_status: 'USED',
    starting_price: 620000,
    current_price: 760000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rice_Cookers.JPG',
    end_hours: 34,
  },
  {
    id: 15,
    seller_id: 1,
    category_id: 6,
    title: 'Quạt điện',
    description: 'Tình trạng 89%, quay tốt, gió mạnh, thân quạt có trầy nhẹ.',
    condition_status: 'USED',
    starting_price: 350000,
    current_price: 430000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Electric_Fan_20170121.jpg',
    end_hours: 22,
  },
  {
    id: 16,
    seller_id: 2,
    category_id: 2,
    title: 'Máy in HP',
    description: 'Tình trạng 93%, in rõ, khay giấy ổn, dùng tốt văn phòng nhỏ.',
    condition_status: 'USED',
    starting_price: 1500000,
    current_price: 1720000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/HP_Deskjet_All_in_One_Printer.jpg',
    end_hours: 46,
  },
  {
    id: 17,
    seller_id: 1,
    category_id: 6,
    title: 'Đèn bàn học',
    description: 'Tình trạng 96%, sáng tốt, gập chỉnh linh hoạt, ngoại hình đẹp.',
    condition_status: 'USED',
    starting_price: 280000,
    current_price: 340000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Desk_lamp.jpg',
    end_hours: 58,
  },
  {
    id: 18,
    seller_id: 2,
    category_id: 6,
    title: 'Giày sneaker trắng',
    description: 'Tình trạng 90%, đế còn tốt, form đẹp, có dấu hiệu sử dụng nhẹ.',
    condition_status: 'USED',
    starting_price: 700000,
    current_price: 820000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/White_sneakers.jpg',
    end_hours: 62,
  },
  {
    id: 19,
    seller_id: 1,
    category_id: 6,
    title: 'Túi xách da',
    description: 'Tình trạng 92%, da còn đẹp, khóa tốt, phù hợp đi làm.',
    condition_status: 'USED',
    starting_price: 880000,
    current_price: 970000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bag_made_from_leather_product.jpg',
    end_hours: 50,
  },
  {
    id: 20,
    seller_id: 2,
    category_id: 6,
    title: 'Ly sứ cà phê',
    description: 'Tình trạng 98%, sạch đẹp, không nứt mẻ, dùng tốt hằng ngày.',
    condition_status: 'USED',
    starting_price: 120000,
    current_price: 170000,
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Coffee_mug.jpg',
    end_hours: 26,
  },
];

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM bids');
    await connection.query('DELETE FROM watchlist');
    await connection.query('DELETE FROM products');

    const insertSql = `
      INSERT INTO products (
        id, seller_id, category_id, title, description, condition_status,
        starting_price, current_price, images, status, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL ? HOUR))
    `;

    for (const p of products) {
      await connection.query(insertSql, [
        p.id,
        p.seller_id,
        p.category_id,
        p.title,
        p.description,
        p.condition_status,
        p.starting_price,
        p.current_price,
        JSON.stringify([p.image]),
        p.end_hours,
      ]);
    }

    await connection.commit();

    const [rows] = await connection.query('SELECT COUNT(*) AS total FROM products');
    console.log(`Updated products successfully. Total products: ${rows[0].total}`);
  } catch (err) {
    await connection.rollback();
    console.error('Failed to update products:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
