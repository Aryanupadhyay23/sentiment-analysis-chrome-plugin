document.addEventListener("DOMContentLoaded", async () => {

  // Main UI container
  const output = document.getElementById("output");

  // API configuration
  const API_KEY = "";
  const API_URL = "http://localhost:5000";

  // Global state
  let allData = [];
  let currentFilter = "all";
  let currentSort = "default";

  // Chart instances
  let sentimentChart = null;
  let trendChart = null;
  let comparisonChart = null;
  let wordChart = null;

  // Load active tab
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {

    try {

      // Current page URL
      const url = tabs[0].url;

      // Extract video ID
      const match = url.match(/[?&]v=([\w-]{11})/);

      // Invalid page
      if (!match) {

        output.innerHTML = `
          <div class="section">
            <p>Not a valid YouTube video.</p>
          </div>
        `;

        return;
      }

      // Video ID
      const videoId = match[1];

      // Loading message
      output.innerHTML = `
        <div class="section">
          <p>Fetching YouTube comments...</p>
        </div>
      `;

      // Fetch comments
      const comments = await fetchComments(videoId);

      // No comments
      if (!comments.length) {

        output.innerHTML = `
          <div class="section">
            <p>No comments found.</p>
          </div>
        `;

        return;
      }

      // Loading predictions
      output.innerHTML = `
        <div class="section">
          <p>Analyzing ${comments.length} comments...</p>
        </div>
      `;

      // Sentiment predictions
      const predictions =
        await getSentiments(comments);

      // Prediction failure
      if (!predictions) {

        output.innerHTML = `
          <div class="section">
            <p>Prediction API failed.</p>
          </div>
        `;

        return;
      }

      // Merge data
      allData = comments.map((c, i) => ({
        text: c.text,
        authorId: c.authorId,
        sentiment: predictions[i].sentiment
      }));

      // Sentiment counts
      const sentimentCounts = {
        1: 0,
        0: 0,
        "-1": 0
      };

      // Count sentiments
      predictions.forEach((p) => {
        sentimentCounts[p.sentiment]++;
      });

      // Statistics
      const totalComments = comments.length;

      const uniqueUsers =
        new Set(comments.map(c => c.authorId)).size;

      const totalWords =
        comments.reduce((sum, c) => {
          return sum + c.text.split(/\s+/).length;
        }, 0);

      const avgLength =
        (totalWords / totalComments).toFixed(1);

      // Percentages
      const positivePercent =
        ((sentimentCounts[1] / totalComments) * 100).toFixed(1);

      const neutralPercent =
        ((sentimentCounts[0] / totalComments) * 100).toFixed(1);

      const negativePercent =
        ((sentimentCounts[-1] / totalComments) * 100).toFixed(1);

      // Average sentiment score
      const avgSentiment =
        (
          predictions.reduce((sum, p) => {
            return sum + p.sentiment;
          }, 0) / totalComments
        ).toFixed(2);

      // Engagement score
      const engagementScore =
        (
          (
            sentimentCounts[1] +
            sentimentCounts[-1]
          ) / totalComments * 10
        ).toFixed(1);

      // Toxicity estimation
      const toxicWords = [
        "hate",
        "stupid",
        "idiot",
        "worst",
        "trash",
        "ugly",
        "kill",
        "dumb"
      ];

      let toxicCount = 0;

      allData.forEach((c) => {

        toxicWords.forEach((word) => {

          if (
            c.text.toLowerCase().includes(word)
          ) {
            toxicCount++;
          }

        });

      });

      const toxicityPercent =
        (
          (toxicCount / totalComments) * 100
        ).toFixed(1);

      // Emoji count
      const emojiRegex =
        /([\u231A-\uD83E\uDDFF])/gu;

      let emojiCount = 0;

      allData.forEach((c) => {

        const matches =
          c.text.match(emojiRegex);

        if (matches) {
          emojiCount += matches.length;
        }

      });

      // AI summary
      let aiSummary = "";

      if (avgSentiment > 0.4) {

        aiSummary =
          "Audience reaction is highly positive with strong engagement.";

      }
      else if (avgSentiment > 0) {

        aiSummary =
          "Audience sentiment is generally positive.";

      }
      else if (avgSentiment < -0.4) {

        aiSummary =
          "Audience sentiment is strongly negative.";

      }
      else {

        aiSummary =
          "Audience response is mixed or neutral.";
      }

      // Word frequency
      const stopWords = [
        "the","is","and","to","a","of","in",
        "this","that","it","for","on","was",
        "are","with","i","you","my","your"
      ];

      const wordMap = {};

      allData.forEach((c) => {

        c.text
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .forEach((word) => {

            if (
              word.length > 3 &&
              !stopWords.includes(word)
            ) {

              wordMap[word] =
                (wordMap[word] || 0) + 1;
            }
          });

      });

      // Top words
      const topWords =
        Object.entries(wordMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

      // Longest comment
      const longestComment =
        [...allData]
          .sort((a, b) =>
            b.text.length - a.text.length
          )[0];

      // Render UI
      output.innerHTML = `

        <div class="section">

          <div class="section-title">
            AI Summary
          </div>

          <p style="line-height:1.7;">
            ${aiSummary}
          </p>

        </div>

        <div class="section">

          <div class="section-title">
            Analytics Dashboard
          </div>

          <div class="metrics">

            <div class="metric">
              <div class="metric-title">Comments</div>
              <div class="metric-value">${totalComments}</div>
            </div>

            <div class="metric">
              <div class="metric-title">Users</div>
              <div class="metric-value">${uniqueUsers}</div>
            </div>

            <div class="metric">
              <div class="metric-title">Avg Length</div>
              <div class="metric-value">${avgLength}</div>
            </div>

            <div class="metric">
              <div class="metric-title">Engagement</div>
              <div class="metric-value">${engagementScore}/10</div>
            </div>

            <div class="metric">
              <div class="metric-title">Positive</div>
              <div class="metric-value">${positivePercent}%</div>
            </div>

            <div class="metric">
              <div class="metric-title">Negative</div>
              <div class="metric-value">${negativePercent}%</div>
            </div>

            <div class="metric">
              <div class="metric-title">Toxicity</div>
              <div class="metric-value">${toxicityPercent}%</div>
            </div>

            <div class="metric">
              <div class="metric-title">Emojis</div>
              <div class="metric-value">${emojiCount}</div>
            </div>

          </div>

        </div>

        <div class="section">

          <div class="section-title">
            Sentiment Distribution
          </div>

          <canvas id="sentimentChart"></canvas>

        </div>

        <div class="section">

          <div class="section-title">
            Sentiment Comparison
          </div>

          <canvas id="comparisonChart"></canvas>

        </div>

        <div class="section">

          <div class="section-title">
            Smoothed Sentiment Trend
          </div>

          <canvas id="trendChart"></canvas>

        </div>

        <div class="section">

          <div class="section-title">
            Top Discussion Words
          </div>

          <canvas id="wordChart"></canvas>

        </div>

        <div class="section">

          <div class="section-title">
            Longest Comment
          </div>

          <div class="comment">
            ${longestComment.text}
          </div>

        </div>

        <div class="section">

          <div class="section-title">
            Comment Controls
          </div>

          <div class="controls">

            <button id="allBtn">All</button>
            <button id="positiveBtn">Positive</button>
            <button id="neutralBtn">Neutral</button>
            <button id="negativeBtn">Negative</button>

          </div>

          <div class="controls">

            <button id="sortPositive">
              Sort Positive
            </button>

            <button id="sortNegative">
              Sort Negative
            </button>

            <button id="exportBtn">
              Export CSV
            </button>

          </div>

          <input
            type="text"
            id="search"
            placeholder="Search comments..."
          />

          <div id="comments" class="comment-list"></div>

        </div>
      `;

      // Doughnut chart
      sentimentChart = new Chart(
        document.getElementById("sentimentChart"),
        {
          type: "doughnut",

          data: {

            labels: [
              "Positive",
              "Neutral",
              "Negative"
            ],

            datasets: [{

              data: [
                sentimentCounts[1],
                sentimentCounts[0],
                sentimentCounts[-1]
              ],

              backgroundColor: [
                "#22c55e",
                "#eab308",
                "#ef4444"
              ]
            }]
          },

          options: {
            responsive: true
          }
        }
      );

      // Comparison chart
      comparisonChart = new Chart(
        document.getElementById("comparisonChart"),
        {
          type: "bar",

          data: {

            labels: [
              "Positive",
              "Neutral",
              "Negative"
            ],

            datasets: [{

              label: "Comment Count",

              data: [
                sentimentCounts[1],
                sentimentCounts[0],
                sentimentCounts[-1]
              ],

              backgroundColor: [
                "#22c55e",
                "#eab308",
                "#ef4444"
              ]
            }]
          },

          options: {
            responsive: true
          }
        }
      );

      // Smoothed trend
      const batchSize = 50;

      const smoothedValues = [];

      for (
        let i = 0;
        i < predictions.length;
        i += batchSize
      ) {

        const batch =
          predictions.slice(i, i + batchSize);

        const avg =
          batch.reduce((sum, p) => {
            return sum + p.sentiment;
          }, 0) / batch.length;

        smoothedValues.push(avg);
      }

      // Trend chart
      trendChart = new Chart(
        document.getElementById("trendChart"),
        {
          type: "line",

          data: {

            labels:
              smoothedValues.map((_, i) => {
                return i + 1;
              }),

            datasets: [{

              label:
                "Average Sentiment Trend",

              data: smoothedValues,

              borderColor: "#38bdf8",

              backgroundColor:
                "rgba(56,189,248,0.2)",

              fill: true,

              tension: 0.4
            }]
          },

          options: {
            responsive: true
          }
        }
      );

      // Word frequency chart
      wordChart = new Chart(
        document.getElementById("wordChart"),
        {
          type: "bar",

          data: {

            labels:
              topWords.map(w => w[0]),

            datasets: [{

              label: "Frequency",

              data:
                topWords.map(w => w[1]),

              backgroundColor:
                "#38bdf8"
            }]
          },

          options: {
            responsive: true
          }
        }
      );

      // All comments filter
      document
        .getElementById("allBtn")
        .addEventListener("click", () => {

          currentFilter = "all";

          renderComments();
        });

      // Positive filter
      document
        .getElementById("positiveBtn")
        .addEventListener("click", () => {

          currentFilter = "1";

          renderComments();
        });

      // Neutral filter
      document
        .getElementById("neutralBtn")
        .addEventListener("click", () => {

          currentFilter = "0";

          renderComments();
        });

      // Negative filter
      document
        .getElementById("negativeBtn")
        .addEventListener("click", () => {

          currentFilter = "-1";

          renderComments();
        });

      // Sort positive
      document
        .getElementById("sortPositive")
        .addEventListener("click", () => {

          currentSort = "positive";

          renderComments();
        });

      // Sort negative
      document
        .getElementById("sortNegative")
        .addEventListener("click", () => {

          currentSort = "negative";

          renderComments();
        });

      // Search input
      document
        .getElementById("search")
        .addEventListener("input", () => {

          renderComments();
        });

      // CSV export
      document
        .getElementById("exportBtn")
        .addEventListener("click", exportCSV);

      // Initial comments render
      renderComments();

    }
    catch (error) {

      console.error(error);

      output.innerHTML = `
        <div class="section">
          <p>Error loading extension.</p>
        </div>
      `;
    }

  });

  // Render comments
  function renderComments() {

    const container =
      document.getElementById("comments");

    if (!container) return;

    const searchText =
      document
        .getElementById("search")
        .value
        .toLowerCase();

    container.innerHTML = "";

    let filteredComments =
      allData
        .filter((c) => {

          return (
            currentFilter === "all" ||
            String(c.sentiment) === currentFilter
          );

        })
        .filter((c) => {

          return c.text
            .toLowerCase()
            .includes(searchText);

        });

    // Positive sorting
    if (currentSort === "positive") {

      filteredComments.sort(
        (a, b) =>
          b.sentiment - a.sentiment
      );
    }

    // Negative sorting
    if (currentSort === "negative") {

      filteredComments.sort(
        (a, b) =>
          a.sentiment - b.sentiment
      );
    }

    // Render comments
    filteredComments.forEach((c, index) => {

      const div =
        document.createElement("div");

      div.className = "comment";

      const text =
        document.createElement("div");

      text.textContent =
        `${index + 1}. ${c.text}`;

      const badge =
        document.createElement("div");

      badge.className = `badge ${
        c.sentiment == 1
          ? "positive"
          : c.sentiment == 0
          ? "neutral"
          : "negative"
      }`;

      badge.textContent =
        c.sentiment == 1
          ? "Positive"
          : c.sentiment == 0
          ? "Neutral"
          : "Negative";

      div.appendChild(text);

      div.appendChild(badge);

      container.appendChild(div);

    });
  }

  // Fetch all comments
  async function fetchComments(videoId) {

    let comments = [];

    let pageToken = "";

    try {

      while (true) {

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&pageToken=${pageToken}&key=${API_KEY}`
        );

        const data =
          await response.json();

        if (!data.items) {
          break;
        }

        // Extract comments
        data.items.forEach((item) => {

          comments.push({

            text:
              item.snippet
                .topLevelComment
                .snippet
                .textOriginal,

            authorId:
              item.snippet
                .topLevelComment
                .snippet
                .authorChannelId?.value || "Unknown"
          });

        });

        // Loading progress
        output.innerHTML = `
          <div class="section">
            <p>
              Fetched ${comments.length}
              comments...
            </p>
          </div>
        `;

        pageToken =
          data.nextPageToken;

        if (!pageToken) {
          break;
        }
      }

      return comments;

    }
    catch (error) {

      console.error(
        "Comment fetch error:",
        error
      );

      return [];
    }
  }

  // Get backend predictions
  async function getSentiments(comments) {

    try {

      const commentTexts =
        comments.map(c => c.text);

      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            comments: commentTexts
          })
        }
      );

      const data =
        await response.json();

      if (!data.predictions) {
        return null;
      }

      return data.predictions.map(label => {

        let sentiment = 0;

        if (
          label.toLowerCase() === "positive"
        ) {
          sentiment = 1;
        }
        else if (
          label.toLowerCase() === "negative"
        ) {
          sentiment = -1;
        }

        return {
          sentiment
        };

      });

    }
    catch (error) {

      console.error(
        "Prediction error:",
        error
      );

      return null;
    }
  }

  // Export CSV
  function exportCSV() {

    let csv =
      "Comment,Sentiment\n";

    allData.forEach((c) => {

      const sentiment =
        c.sentiment == 1
          ? "Positive"
          : c.sentiment == 0
          ? "Neutral"
          : "Negative";

      csv +=
        `"${c.text.replace(/"/g, '""')}","${sentiment}"\n`;

    });

    const blob =
      new Blob([csv], {
        type: "text/csv"
      });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "youtube_sentiment_analysis.csv";

    a.click();

    URL.revokeObjectURL(url);
  }

});