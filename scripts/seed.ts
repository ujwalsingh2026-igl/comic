import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/security';
import * as crypto from 'crypto';

async function seed() {
  console.log('[Seed] Starting database seed...');

  // 1. Create Genres
  const genres = [
    { name: 'Action', slug: 'action', description: 'Thrilling adventures and epic battles.' },
    { name: 'Fantasy', slug: 'fantasy', description: 'Magic, mythical realms, and legendary quests.' },
    { name: 'Sci-Fi', slug: 'sci-fi', description: 'Futuristic worlds, technology, and space exploration.' },
    { name: 'Romance', slug: 'romance', description: 'Passionate tales of love and deep connections.' },
    { name: 'Mystery', slug: 'mystery', description: 'Intriguing puzzles, detectives, and suspense.' },
    { name: 'Thriller', slug: 'thriller', description: 'Edge-of-your-seat psychological and crime drama.' },
    { name: 'Comedy', slug: 'comedy', description: 'Lighthearted, funny, and entertaining stories.' },
    { name: 'Horror', slug: 'horror', description: 'Supernatural chills and psychological terror.' },
  ];

  const genreMap = new Map<string, string>();
  for (const g of genres) {
    let row = await db.queryOne<{ id: string }>('SELECT id FROM "Genre" WHERE slug = $1;', [g.slug]);
    if (!row) {
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO "Genre" (id, name, slug, description, "createdAt") VALUES ($1, $2, $3, $4, NOW());`,
        [id, g.name, g.slug, g.description]
      );
      genreMap.set(g.slug, id);
    } else {
      genreMap.set(g.slug, row.id);
    }
  }
  console.log('[Seed] Genres seeded.');

  // 2. Create Users
  const adminPasswordHash = await hashPassword('Admin@12345');
  const readerPasswordHash = await hashPassword('Reader@12345');

  let adminUser = await db.queryOne<{ id: string }>('SELECT id FROM "User" WHERE email = $1;', ['admin@platform.com']);
  if (!adminUser) {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "User" (id, email, name, username, "passwordHash", role, status, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVE', true, NOW(), NOW());`,
      [id, 'admin@platform.com', 'System Admin', 'sysadmin', adminPasswordHash]
    );
    await db.execute(
      `INSERT INTO "PrivacySettings" (id, "userId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW());`,
      [crypto.randomUUID(), id]
    );
    adminUser = { id };
  }

  let testReader = await db.queryOne<{ id: string }>('SELECT id FROM "User" WHERE email = $1;', ['reader@platform.com']);
  if (!testReader) {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "User" (id, email, name, username, "passwordHash", role, status, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'USER', 'ACTIVE', true, NOW(), NOW());`,
      [id, 'reader@platform.com', 'Alex Johnson', 'alex_reader', readerPasswordHash]
    );
    await db.execute(
      `INSERT INTO "PrivacySettings" (id, "userId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW());`,
      [crypto.randomUUID(), id]
    );
    testReader = { id };
  }
  console.log('[Seed] Users seeded (Admin: admin@platform.com / Admin@12345, Reader: reader@platform.com / Reader@12345).');

  // 3. Create Authors
  const authors = [
    {
      name: 'Kai Takahashi',
      slug: 'kai-takahashi',
      bio: 'Award-winning manga creator specializing in dark fantasy and high-stakes supernatural thrillers.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Elena Rostova',
      slug: 'elena-rostova',
      bio: 'Bestselling epic fantasy author known for intricate world-building, magical systems, and heroic sagas.',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Arthur Conan Doyle',
      slug: 'arthur-conan-doyle',
      bio: 'Classic British detective novelist and creator of Sherlock Holmes and Dr. John H. Watson.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const authorMap = new Map<string, string>();
  for (const a of authors) {
    let row = await db.queryOne<{ id: string }>('SELECT id FROM "Author" WHERE slug = $1;', [a.slug]);
    if (!row) {
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO "Author" (id, name, slug, bio, "avatarUrl", "isVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW());`,
        [id, a.name, a.slug, a.bio, a.avatarUrl]
      );
      authorMap.set(a.slug, id);
    } else {
      authorMap.set(a.slug, row.id);
    }
  }
  console.log('[Seed] Authors seeded.');

  // 4. Create Comic: Shadows of the Abyss
  const comicSlug = 'shadows-of-the-abyss';
  let comic = await db.queryOne<{ id: string }>('SELECT id FROM "Content" WHERE slug = $1;', [comicSlug]);
  if (!comic) {
    const contentId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Content" (id, title, slug, description, "contentType", "authorId", "artistName", "coverUrl", "bannerUrl", status, "releaseStatus", "isPremium", "priceCents", language, "ratingAverage", "ratingCount", "viewCount", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'COMIC', $5, 'Studio Mappa Art', $6, $7, 'PUBLISHED', 'ONGOING', false, 0, 'en', 4.85, 128, 4520, NOW(), NOW(), NOW());`,
      [
        contentId,
        'Shadows of the Abyss',
        comicSlug,
        'When the rift between mortal realms and the ancient abyss tore open, ordinary high schooler Ren awakened an unholy relic capable of commanding cosmic specters.',
        authorMap.get('kai-takahashi'),
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80',
      ]
    );

    // Link Action & Fantasy
    await db.execute(
      `INSERT INTO "ContentGenre" (id, "contentId", "genreId") VALUES ($1, $2, $3), ($4, $5, $6);`,
      [crypto.randomUUID(), contentId, genreMap.get('action'), crypto.randomUUID(), contentId, genreMap.get('fantasy')]
    );

    // Chapter 1 (Free)
    const ch1Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 1, 'Chapter 1: The Awakening', 'chapter-1', false, 0, NOW(), NOW(), NOW());`,
      [ch1Id, contentId]
    );

    // Comic Pages for Chapter 1
    const ch1Pages = [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=80',
    ];
    for (let i = 0; i < ch1Pages.length; i++) {
      await db.execute(
        `INSERT INTO "ComicPage" (id, "chapterId", "pageNumber", "imageUrl", width, height, "createdAt")
         VALUES ($1, $2, $3, $4, 900, 1400, NOW());`,
        [crypto.randomUUID(), ch1Id, i + 1, ch1Pages[i]]
      );
    }

    // Chapter 2 (Free)
    const ch2Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 2, 'Chapter 2: The Ancient Sigil', 'chapter-2', false, 0, NOW(), NOW(), NOW());`,
      [ch2Id, contentId]
    );
    for (let i = 0; i < ch1Pages.length; i++) {
      await db.execute(
        `INSERT INTO "ComicPage" (id, "chapterId", "pageNumber", "imageUrl", width, height, "createdAt")
         VALUES ($1, $2, $3, $4, 900, 1400, NOW());`,
        [crypto.randomUUID(), ch2Id, i + 1, ch1Pages[i]]
      );
    }

    // Chapter 3 (Premium)
    const ch3Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 3, 'Chapter 3: Blood Oath', 'chapter-3', true, 4900, NOW(), NOW(), NOW());`,
      [ch3Id, contentId]
    );
    for (let i = 0; i < ch1Pages.length; i++) {
      await db.execute(
        `INSERT INTO "ComicPage" (id, "chapterId", "pageNumber", "imageUrl", width, height, "createdAt")
         VALUES ($1, $2, $3, $4, 900, 1400, NOW());`,
        [crypto.randomUUID(), ch3Id, i + 1, ch1Pages[i]]
      );
    }
  }
  console.log('[Seed] Comic "Shadows of the Abyss" seeded.');

  // 5. Create Novel: Chronicles of the Stormborn
  const novelSlug = 'chronicles-of-the-stormborn';
  let novel = await db.queryOne<{ id: string }>('SELECT id FROM "Content" WHERE slug = $1;', [novelSlug]);
  if (!novel) {
    const contentId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Content" (id, title, slug, description, "contentType", "authorId", "coverUrl", status, "releaseStatus", "isPremium", "priceCents", language, "ratingAverage", "ratingCount", "viewCount", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'NOVEL', $5, $6, 'PUBLISHED', 'ONGOING', false, 0, 'en', 4.92, 340, 8910, NOW(), NOW(), NOW());`,
      [
        contentId,
        'Chronicles of the Stormborn',
        novelSlug,
        'In a shattered realm scourged by hurricane-scale tempests, a disgraced officer discovers an ancient shard of light that could reawaken the sleeping gods of humanity.',
        authorMap.get('elena-rostova'),
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      ]
    );

    // Link Fantasy & Action
    await db.execute(
      `INSERT INTO "ContentGenre" (id, "contentId", "genreId") VALUES ($1, $2, $3);`,
      [crypto.randomUUID(), contentId, genreMap.get('fantasy')]
    );

    // Chapter 1 (Free)
    const ch1Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "wordCount", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 1, 'Chapter 1: The Gathering Tempest', 'chapter-1', false, 0, 1850, NOW(), NOW(), NOW());`,
      [ch1Id, contentId]
    );
    await db.execute(
      `INSERT INTO "NovelChapterContent" (id, "chapterId", "textContent", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW());`,
      [
        crypto.randomUUID(),
        ch1Id,
        `The wind howled against the jagged spires of Kholinar like a living beast denied its prey.

Kaladin stood at the perimeter wall, his hands clenched tightly around the chilled steel of his spear. Below him, the shattered plains stretched into the gathering twilight—a labyrinth of chasms and petrified plateaus carved by countless centuries of highstorms.

"Look to the horizon," murmured Dalinar, his deep voice carrying above the gale. "The Everstorm draws closer with each passing moon. If our radiant oaths shatter now, there will be no kingdom left to save."

Kaladin closed his eyes. Within his chest, the faint glow of stormlight stirred, pulsating in rhythm with the tempest. In this dying world, the only thing sharper than despair was the will to endure.

He stepped forward into the howling abyss, and the light answered.`,
      ]
    );

    // Chapter 2 (Free)
    const ch2Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "wordCount", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 2, 'Chapter 2: Honor Is Dead', 'chapter-2', false, 0, 2100, NOW(), NOW(), NOW());`,
      [ch2Id, contentId]
    );
    await db.execute(
      `INSERT INTO "NovelChapterContent" (id, "chapterId", "textContent", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW());`,
      [
        crypto.randomUUID(),
        ch2Id,
        `Four full shardbearers against one unarmed prince. The arena stood silent in horror as Adolin retreated against the stonework, his shield dented and fractured under unrelenting strikes.

High above in the king's box, nobility watched in frozen complacency. Nobody moved. Nobody dared challenge the Highprince's treachery.

Kaladin looked down from the viewing ridge. His grip shifted on his spear.

"Honor is dead," Kaladin whispered.

He leaped over the railing.

"But I'll see what I can do."`,
      ]
    );

    // Chapter 3 (Premium)
    const ch3Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "wordCount", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 3, 'Chapter 3: The Words of Radiance', 'chapter-3', true, 4900, 2400, NOW(), NOW(), NOW());`,
      [ch3Id, contentId]
    );
    await db.execute(
      `INSERT INTO "NovelChapterContent" (id, "chapterId", "textContent", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW());`,
      [
        crypto.randomUUID(),
        ch3Id,
        `The words came unbidden to Kaladin's mind, inscribed in ancient fire across his soul.

"I will protect those who cannot protect themselves."

The stormlight erupted from his pores, blinding the arena in ethereal cerulean brilliance. The shardblade struck his arm, but it shattered against pure crystallized intention.`,
      ]
    );
  }
  console.log('[Seed] Novel "Chronicles of the Stormborn" seeded.');

  // 6. Create Audiobook: The Hound of the Baskervilles
  const audioSlug = 'hound-of-the-baskervilles';
  let audiobook = await db.queryOne<{ id: string }>('SELECT id FROM "Content" WHERE slug = $1;', [audioSlug]);
  if (!audiobook) {
    const contentId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Content" (id, title, slug, description, "contentType", "authorId", "coverUrl", status, "releaseStatus", "isPremium", "priceCents", language, "ratingAverage", "ratingCount", "viewCount", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'AUDIOBOOK', $5, $6, 'PUBLISHED', 'COMPLETED', false, 0, 'en', 4.96, 512, 14200, NOW(), NOW(), NOW());`,
      [
        contentId,
        'The Hound of the Baskervilles',
        audioSlug,
        'Sherlock Holmes and Dr. Watson investigate the legend of a diabolical spectral hound that haunts the eerie Dartmoor moors, claiming the lives of the Baskerville family.',
        authorMap.get('arthur-conan-doyle'),
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      ]
    );

    // Audiobook detail
    await db.execute(
      `INSERT INTO "Audiobook" (id, "contentId", narrator, "totalDurationSeconds", "sampleAudioUrl", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Stephen Fry', 4500, 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg', NOW(), NOW());`,
      [crypto.randomUUID(), contentId]
    );

    // Link Mystery & Thriller
    await db.execute(
      `INSERT INTO "ContentGenre" (id, "contentId", "genreId") VALUES ($1, $2, $3);`,
      [crypto.randomUUID(), contentId, genreMap.get('mystery')]
    );

    // Audio Chapter 1 (Free)
    const ch1Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 1, 'Chapter 1: Mr. Sherlock Holmes', 'chapter-1', false, 0, NOW(), NOW(), NOW());`,
      [ch1Id, contentId]
    );
    await db.execute(
      `INSERT INTO "AudioChapter" (id, "chapterId", "audioUrl", "durationSeconds", "bitRate", "createdAt", "updatedAt")
       VALUES ($1, $2, 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg', 1800, 192, NOW(), NOW());`,
      [crypto.randomUUID(), ch1Id]
    );

    // Audio Chapter 2 (Premium)
    const ch2Id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 2, 'Chapter 2: The Curse of the Baskervilles', 'chapter-2', true, 4900, NOW(), NOW(), NOW());`,
      [ch2Id, contentId]
    );
    await db.execute(
      `INSERT INTO "AudioChapter" (id, "chapterId", "audioUrl", "durationSeconds", "bitRate", "createdAt", "updatedAt")
       VALUES ($1, $2, 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg', 2700, 192, NOW(), NOW());`,
      [crypto.randomUUID(), ch2Id]
    );
  }
  console.log('[Seed] Audiobook "The Hound of the Baskervilles" seeded.');

  console.log('[Seed] Database seed completed successfully!');
}

seed().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
