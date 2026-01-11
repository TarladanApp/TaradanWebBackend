import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET_NAME = 'product-images';

async function migrateImages() {
    console.log('🚀 Starting image migration...');
    console.log('📦 Bucket:', BUCKET_NAME);

    // 1. List all files in the bucket
    const { data: files, error: listError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('', { limit: 10000 });

    if (listError) {
        console.error('❌ Error listing files:', listError);
        return;
    }

    if (!files || files.length === 0) {
        console.log('⚠️ No files found in bucket.');
        return;
    }

    console.log(`📂 Found ${files.length} files in storage.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Iterate through files and update products
    for (const file of files) {
        // Filename format is usually "productId.ext" (e.g. 1.jpg, 123.png or uuid.jpg)
        const productId = file.name.split('.')[0];

        if (!productId) {
            console.log(`⏭️ Skipping invalid filename: ${file.name}`);
            skippedCount++;
            continue;
        }

        // Generate Public URL
        const { data: publicUrlData } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(file.name);

        const publicUrl = publicUrlData.publicUrl;

        console.log(`Processing Product ID: ${productId} -> URL: ${publicUrl}`);

        // Update Product in Database
        const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: publicUrl })
            .eq('id', productId);

        if (updateError) {
            console.error(`❌ Failed to update product ${productId}:`, updateError.message);
            errorCount++;
        } else {
            console.log(`✅ Updated product ${productId}`);
            updatedCount++;
        }
    }

    console.log('--------------------------------------------------');
    console.log('🎉 Migration Completed!');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
}

migrateImages().catch(console.error);
