// Extract YouTube video ID from various URL formats
export function extractVideoId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/playlist\?list=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // If it's already just an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return url;
    }

    return null;
}

// Extract playlist ID from URL
export function extractPlaylistId(url) {
    if (!url) return null;

    const match = url.match(/[?&]list=([^&\n?#]+)/);
    return match ? match[1] : null;
}

// Fetch video details (title, duration) from YouTube API
export async function fetchVideoDetails(videoId, apiKey) {
    if (!videoId || !apiKey) {
        return null;
    }

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,contentDetails');
        url.searchParams.set('id', videoId);
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const duration = item.contentDetails?.duration;

            return {
                title: item.snippet?.title || 'Unknown Video',
                duration_seconds: duration ? parseDuration(duration) : 0,
                thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url
            };
        }
    } catch (error) {
        console.error('Failed to fetch video details:', error);
    }

    return null;
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

// Fetch all videos in a YouTube playlist using the Data API
// Requires process.env.YOUTUBE_API_KEY to be set
export async function fetchPlaylistItems(playlistId, apiKey) {
    if (!playlistId || !apiKey) {
        return [];
    }

    const items = [];
    let pageToken = '';

    try {
        do {
            const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            url.searchParams.set('part', 'snippet,contentDetails');
            url.searchParams.set('maxResults', '50');
            url.searchParams.set('playlistId', playlistId);
            url.searchParams.set('key', apiKey);
            if (pageToken) {
                url.searchParams.set('pageToken', pageToken);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                const text = await response.text();
                console.error('YouTube API error:', response.status, text);
                break;
            }

            const data = await response.json();

            if (Array.isArray(data.items)) {
                // Collect all video IDs first
                const videoIds = [];
                const videoMap = {};

                for (const item of data.items) {
                    const videoId = item.contentDetails?.videoId;
                    const title = item.snippet?.title;

                    // Skip private/deleted videos
                    if (
                        videoId &&
                        title &&
                        title.toLowerCase() !== 'private video' &&
                        title.toLowerCase() !== 'deleted video'
                    ) {
                        videoIds.push(videoId);
                        videoMap[videoId] = {
                            videoId,
                            title
                        };
                    }
                }

                // Fetch durations for all videos in batch
                if (videoIds.length > 0) {
                    const durationUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
                    durationUrl.searchParams.set('part', 'contentDetails');
                    durationUrl.searchParams.set('id', videoIds.join(','));
                    durationUrl.searchParams.set('key', apiKey);

                    const durationResponse = await fetch(durationUrl.toString());

                    if (durationResponse.ok) {
                        const durationData = await durationResponse.json();

                        if (durationData.items) {
                            for (const video of durationData.items) {
                                const videoId = video.id;
                                const duration = video.contentDetails?.duration;
                                if (videoMap[videoId]) {
                                    videoMap[videoId].duration_seconds = duration
                                        ? parseDuration(duration)
                                        : 0;
                                }
                            }
                        }
                    }
                }

                // Add all items to the result
                items.push(...Object.values(videoMap));
            }

            pageToken = data.nextPageToken || '';
        } while (pageToken);
    } catch (error) {
        console.error('Failed to fetch playlist items:', error);
    }

    return items;
}

// Search YouTube for videos and playlists
export async function searchYouTube(query, apiKey) {
    if (!query || !apiKey) {
        return [];
    }

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', query);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('type', 'video,playlist');
        url.searchParams.set('maxResults', '20');

        const response = await fetch(url.toString());

        if (!response.ok) {
            const text = await response.text();
            console.error('YouTube Search API error:', response.status, text);
            return [];
        }

        const data = await response.json();

        if (data.items) {
            return data.items.map(item => {
                const type = item.id.kind === 'youtube#video' ? 'video' :
                    item.id.kind === 'youtube#playlist' ? 'playlist' : 'unknown';

                const id = type === 'video' ? item.id.videoId :
                    type === 'playlist' ? item.id.playlistId : item.id.channelId;

                return {
                    id,
                    type,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                    channelTitle: item.snippet.channelTitle,
                    publishedAt: item.snippet.publishedAt
                };
            });
        }
    } catch (error) {
        console.error('Failed to search YouTube:', error);
    }

    return [];
}
