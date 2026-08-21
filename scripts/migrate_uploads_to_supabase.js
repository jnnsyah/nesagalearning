import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://gctszqcsykwabgjaopno.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_JxWfA1eNKuNRL77Q0jcdEA_TDz43IAW';

const supabase = createClient(supabaseUrl, supabaseKey);

const uploadsBaseDir = path.join(process.cwd(), 'static', 'uploads');

async function migrateFolder(folderName) {
	const folderPath = path.join(uploadsBaseDir, folderName);
	if (!fs.existsSync(folderPath)) {
		console.log(`Folder ${folderName} does not exist, skipping.`);
		return;
	}

	const files = fs.readdirSync(folderPath);
	console.log(`Found ${files.length} files in ${folderName}. Uploading to Supabase Storage bucket "${folderName}"...`);

	for (const fileName of files) {
		const filePath = path.join(folderPath, fileName);
		const stat = fs.statSync(filePath);
		if (!stat.isFile()) continue;

		const fileBuffer = fs.readFileSync(filePath);
		const destinationPath = fileName;

		const { data, error } = await supabase.storage
			.from(folderName)
			.upload(destinationPath, fileBuffer, {
				upsert: true
			});

		if (error) {
			console.error(`❌ Failed to upload ${folderName}/${fileName}:`, error.message);
		} else {
			const publicUrl = `${supabaseUrl}/storage/v1/object/public/${folderName}/${destinationPath}`;
			console.log(`✅ Uploaded ${folderName}/${fileName} -> ${publicUrl}`);
		}
	}
}

async function main() {
	console.log('Starting file server migration to Supabase Storage...');
	await migrateFolder('avatars');
	await migrateFolder('materials');
	await migrateFolder('submissions');
	await migrateFolder('attachments');
	console.log('🎉 Migration completed successfully!');
}

main().catch(console.error);
