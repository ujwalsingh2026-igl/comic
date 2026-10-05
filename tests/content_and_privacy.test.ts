import { describe, it, expect } from 'vitest';
import { ContentService } from '../src/services/content.service';
import { ReadingService } from '../src/services/reading.service';
import { ReviewService } from '../src/services/review.service';
import { UserService } from '../src/services/user.service';
import { AuthService } from '../src/services/auth.service';

describe('Content, Reading Progress, Reviews & Privacy Subsystems', () => {
  let testUserId: string;

  it('sets up a reader account for integration verification', async () => {
    const reg = await AuthService.register({
      name: 'Content Reader',
      email: `reader_${Date.now()}@testcontent.org`,
      password: 'StrongPassword@123',
    });
    testUserId = reg.userId;
    expect(testUserId).toBeDefined();
  });

  it('retrieves the discovery home feed with featured, trending and new releases', async () => {
    const feed = await ContentService.getHomeFeed();
    expect(feed.featured.length).toBeGreaterThan(0);
    expect(feed.trendingComics.length).toBeGreaterThan(0);
    expect(feed.popularNovels.length).toBeGreaterThan(0);
    expect(feed.popularAudiobooks.length).toBeGreaterThan(0);
    expect(feed.genres.length).toBeGreaterThan(0);
  });

  it('searches and filters catalog with queries, types and ratings', async () => {
    const searchRes = await ContentService.search({
      query: 'Shadows',
      contentType: 'COMIC',
    });
    expect(searchRes.items.length).toBeGreaterThan(0);
    expect(searchRes.items[0].title).toContain('Shadows');
  });

  it('records reading progress and automatically populates user library', async () => {
    // Read Shadows of the Abyss Chapter 1 Page 3
    const comic = await ContentService.getContentBySlug('shadows-of-the-abyss');
    const ch1 = comic.chapters[0];

    const progress = await ReadingService.saveReadingProgress({
      userId: testUserId,
      contentId: comic.content.id,
      chapterId: ch1.id,
      pageNumber: 3,
      percentCompleted: 60,
    });
    expect(progress.success).toBe(true);

    // Verify in library
    const lib = await ReadingService.getUserLibrary(testUserId, 'CURRENTLY_READING');
    expect(lib.length).toBeGreaterThan(0);
    expect(lib[0].title).toBe('Shadows of the Abyss');

    // Resume reading check
    const resume = await ReadingService.getResumeProgress(testUserId, comic.content.id);
    expect(resume.reading).not.toBeNull();
    expect(resume.reading.pageNumber).toBe(3);
  });

  it('manages bookmarks with custom notes', async () => {
    const comic = await ContentService.getContentBySlug('shadows-of-the-abyss');
    const ch1 = comic.chapters[0];

    const bm = await ReadingService.createBookmark({
      userId: testUserId,
      contentId: comic.content.id,
      chapterId: ch1.id,
      pageNumber: 2,
      note: 'Key plot reveal',
    });
    expect(bm.id).toBeDefined();

    const bookmarks = await ReadingService.getBookmarks(testUserId);
    expect(bookmarks.some((b: any) => b.id === bm.id)).toBe(true);

    await ReadingService.deleteBookmark(testUserId, bm.id);
    const bookmarksAfter = await ReadingService.getBookmarks(testUserId);
    expect(bookmarksAfter.some((b: any) => b.id === bm.id)).toBe(false);
  });

  it('posts reviews, votes helpfulness, and recalculates ratings', async () => {
    const comic = await ContentService.getContentBySlug('shadows-of-the-abyss');

    const rev = await ReviewService.postReview({
      userId: testUserId,
      contentId: comic.content.id,
      rating: 5,
      title: 'Masterpiece artwork',
      body: 'The panel transitions and pacing in Chapter 1 are phenomenal!',
    });
    expect(rev.success).toBe(true);

    const list = await ReviewService.getContentReviews(comic.content.id);
    expect(list.length).toBeGreaterThan(0);

    const vote = await ReviewService.voteHelpful(testUserId, rev.reviewId!, true);
    expect(vote.success).toBe(true);
  });

  it('updates privacy settings and performs legal-compliant data export', async () => {
    const privacy = await UserService.updatePrivacy({
      userId: testUserId,
      isProfilePublic: true,
      showReadingActivity: true,
      allowMarketing: false,
    });
    expect(privacy.isProfilePublic).toBe(true);
    expect(privacy.showReadingActivity).toBe(true);

    // GDPR / CCPA Data Export
    const exportData = await UserService.exportUserData(testUserId);
    expect(exportData.userProfile).toBeDefined();
    expect(exportData.library.length).toBeGreaterThan(0);
    expect(exportData.reviews.length).toBeGreaterThan(0);
  });

  it('executes account deletion and PII anonymization workflow', async () => {
    const delResult = await UserService.deleteAccount(testUserId, 'User requested account closure');
    expect(delResult.success).toBe(true);

    const profile = await UserService.getProfile(testUserId);
    expect(profile.user.status).toBe('DELETED');
    expect(profile.user.name).toBe('Deleted User');
    expect(profile.user.email).toContain('anonymized.local');
  });
});
