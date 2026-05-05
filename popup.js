document.addEventListener("DOMContentLoaded", async () => {
    const statusDiv = document.getElementById("status");
    const summaryDiv = document.getElementById("summary");
    const commentsDiv = document.getElementById("comments");

    const API_KEY = "";
    const SENTIMENT_API_URL = "http://localhost:5000/predict";

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const url = tabs[0].url;

        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);

        if (!match) {
            statusDiv.textContent = "Not a YouTube video.";
            return;
        }

        const videoId = match[1];
        statusDiv.textContent = "Fetching comments...";

        const comments = await fetchComments(videoId);

        if (comments.length === 0) {
            statusDiv.textContent = "No comments found.";
            return;
        }

        statusDiv.textContent = `Fetched ${comments.length} comments. Running sentiment analysis...`;

        const predictions = await getSentimentPredictions(comments);

        if (!predictions) return;

        const displayCount = Math.min(25, comments.length);

        const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

        predictions.forEach(p => {
            if (sentimentCounts[p] !== undefined) {
                sentimentCounts[p]++;
            }
        });

        const total = predictions.length;

        const positivePercent = ((sentimentCounts.positive / total) * 100).toFixed(1);
        const neutralPercent = ((sentimentCounts.neutral / total) * 100).toFixed(1);
        const negativePercent = ((sentimentCounts.negative / total) * 100).toFixed(1);

        // Summary UI
        summaryDiv.innerHTML = `
            <strong>Overall Sentiment</strong><br><br>
            <span class="badge positive">Positive: ${positivePercent}%</span>
            <span class="badge neutral">Neutral: ${neutralPercent}%</span>
            <span class="badge negative">Negative: ${negativePercent}%</span>
        `;

        statusDiv.textContent = "Analysis Complete";

        commentsDiv.innerHTML = "";

        for (let i = 0; i < displayCount; i++) {
            const sentiment = predictions[i];

            const commentEl = document.createElement("div");
            commentEl.className = "comment";

            commentEl.innerHTML = `
                <div class="comment-text">${comments[i]}</div>
                <span class="badge ${sentiment}">${sentiment}</span>
            `;

            commentsDiv.appendChild(commentEl);
        }
    });

    async function fetchComments(videoId) {
        let comments = [];
        let pageToken = "";

        try {
            while (comments.length < 100) {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&pageToken=${pageToken}&key=${API_KEY}`
                );

                const data = await response.json();

                if (!data.items) {
                    console.error("YouTube API error:", data);
                    return [];
                }

                data.items.forEach(item => {
                    comments.push(item.snippet.topLevelComment.snippet.textOriginal);
                });

                pageToken = data.nextPageToken;
                if (!pageToken) break;
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
        }

        return comments;
    }

    async function getSentimentPredictions(comments) {
        try {
            const response = await fetch(SENTIMENT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ comments })
            });

            const result = await response.json();

            if (!result.predictions) {
                console.error("Invalid API response:", result);
                statusDiv.textContent = "Invalid response from sentiment API.";
                return null;
            }

            return result.predictions;

        } catch (error) {
            console.error("Error fetching predictions:", error);
            statusDiv.textContent = "Error fetching sentiment predictions.";
            return null;
        }
    }
});