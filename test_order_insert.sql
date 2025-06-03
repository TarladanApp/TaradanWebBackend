-- Test order_product insertion
-- Önce mevcut farmer_id ve product_id değerlerini kontrol et

-- 1. Test için geçerli bir product_id al
SELECT id, farmer_id, product_name FROM products WHERE farmer_id = '46' LIMIT 5;

-- Farmer ID '46' için test order_product ekleme
INSERT INTO order_product (
    order_id,
    order_product_id, 
    farmer_id,
    farmer_name,
    unit_quantity,
    unit_price,
    total_product_price,
    delivery_address_id,
    product_name,
    product_id,
    order_product_status
) VALUES 
-- Test siparişi 1 - Farmer ID 46
(
    '300',  -- order_id (yeni, benzersiz)
    '300',  -- order_product_id (yeni, benzersiz)
    '46',   -- farmer_id 
    'Hasan Gürbüz',
    5,      -- unit_quantity
    10.00,  -- unit_price  
    50.00,  -- total_product_price (5 x 10)
    '1',    -- delivery_address_id
    'Taze Çilek',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- mevcut product_id
    NULL    -- order_product_status (yeni sipariş)
),
-- Test siparişi 2 - Farmer ID 46
(
    '301',  -- order_id
    '301',  -- order_product_id 
    '46',   -- farmer_id 
    'Hasan Gürbüz',
    3,      -- unit_quantity
    15.00,  -- unit_price  
    45.00,  -- total_product_price
    '2',    -- delivery_address_id
    'Organik Domates',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- product_id
    'onaylandı'    -- order_product_status
),
-- Test siparişi 3 - Farmer ID 46
(
    '302',  -- order_id
    '302',  -- order_product_id 
    '46',   -- farmer_id 
    'Hasan Gürbüz',
    2,      -- unit_quantity
    20.00,  -- unit_price  
    40.00,  -- total_product_price
    '3',    -- delivery_address_id
    'Taze Salatalık',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- product_id
    'hazırlandı'    -- order_product_status
),
-- Gerçek farmer ID'leri için test order_product ekleme
-- Farmer ID '2' için
(
    '200',  -- order_id (yeni, benzersiz)
    '200',  -- order_product_id (yeni, benzersiz)
    '2',    -- farmer_id 
    'Mert Çakır',
    3,      -- unit_quantity
    15.00,  -- unit_price  
    45.00,  -- total_product_price (3 x 15)
    '1',    -- delivery_address_id
    'Test Ürün 1',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- mevcut product_id
    NULL    -- order_product_status (yeni sipariş)
),
-- Test siparişi 2 - Farmer ID 23
(
    '201',  -- order_id
    '201',  -- order_product_id 
    '23',   -- farmer_id 
    'Umut Can Çapar',
    5,      -- unit_quantity
    12.50,  -- unit_price  
    62.50,  -- total_product_price
    '2',    -- delivery_address_id
    'Test Ürün 2',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- product_id
    'onaylandı'    -- order_product_status
),
-- Test siparişi 3 - Farmer ID 28
(
    '202',  -- order_id
    '202',  -- order_product_id 
    '28',   -- farmer_id 
    'Mert Çakır',
    2,      -- unit_quantity
    20.00,  -- unit_price  
    40.00,  -- total_product_price
    '3',    -- delivery_address_id
    'Test Ürün 3',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- product_id
    'hazırlandı'    -- order_product_status
),
-- Test siparişi 4 - Farmer ID 29
(
    '203',  -- order_id
    '203',  -- order_product_id 
    '29',   -- farmer_id 
    'Hasan Gurbuz',
    1,      -- unit_quantity
    25.00,  -- unit_price  
    25.00,  -- total_product_price
    '4',    -- delivery_address_id
    'Test Ürün 4',
    'a6871afe-b121-45fb-8969-38661cf1d9f2', -- product_id
    NULL    -- order_product_status
); 

-- 3. Kontrol için veri okuma - Özellikle farmer_id='46' için
SELECT * FROM order_product WHERE farmer_id = '46';

-- 4. Tüm test verilerini kontrol et
SELECT * FROM order_product WHERE farmer_id IN ('2', '23', '28', '29', '46');

-- 5. Farmer tablosundaki aktif farmer'ları kontrol et
SELECT farmer_id, farmer_name, farmer_last_name, auth_id, farmer_activity_status 
FROM farmer 
WHERE farmer_activity_status = 'Active'; 