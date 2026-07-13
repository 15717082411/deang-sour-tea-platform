USE sour_tea;

INSERT INTO user_account (username, password, phone, role, status) VALUES
('user_demo', '$2a$10$demo', '13800000001', 'USER', 'ACTIVE'),
('merchant_demo', '$2a$10$demo', '13800000002', 'MERCHANT', 'ACTIVE'),
('admin_demo', '$2a$10$demo', '13800000003', 'ADMIN', 'ACTIVE');

INSERT INTO merchant (user_id, shop_name, contact, audit_status) VALUES
(2, '出冬瓜酸茶工坊', '13800000002', 'APPROVED'),
(2, '茶魂文创铺', '13900000000', 'PENDING');

INSERT INTO product (merchant_id, category, name, price, stock, status) VALUES
(1, '酸茶礼盒', '德昂古树酸茶礼盒', 168.00, 36, 'APPROVED'),
(1, '体验装', '45天发酵酸茶体验装', 59.00, 80, 'APPROVED'),
(2, '文创周边', '茶魂守护人纪念币', 39.00, 120, 'PENDING');

INSERT INTO content (title, category, summary, body, status) VALUES
('德昂族酸茶是什么', '酸茶科普', '介绍酸茶来源、微酸回甘的风味与德昂族古老茶农身份。', '德昂族酸茶是围绕古法制茶经验形成的非遗体验核心内容。', 'PUBLISHED'),
('杀青、揉捻与45天发酵', '制作技艺', '把复杂手工经验拆解为三步核心记忆点。', '平台将杀青、揉捻和发酵拆解为H5互动与线下工坊体验。', 'PUBLISHED');
