-- Migration: farmer_product_income tablosuna created_at kolunu ekle
-- Bu dosyayı Supabase SQL editörde çalıştırın

-- Önce kolunun var olup olmadığını kontrol et
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmer_product_income' 
        AND column_name = 'created_at'
    ) THEN
        -- created_at kolunu ekle
        ALTER TABLE farmer_product_income 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Mevcut kayıtlar için current timestamp ata
        UPDATE farmer_product_income 
        SET created_at = NOW() 
        WHERE created_at IS NULL;
        
        RAISE NOTICE 'created_at kolunu farmer_product_income tablosuna eklendi';
    ELSE
        RAISE NOTICE 'created_at kolunu zaten mevcut';
    END IF;
END $$; 