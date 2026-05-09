document.addEventListener("DOMContentLoaded", async () => {

  const output =
    document.getElementById("output");

  const API_KEY =
    "AIzaSyA_Euel1dEOMmfFHz4bdfRp-LXoQ-WOgRg";

  const API_URL =
    "http://localhost:5000";

  let allData = [];

  let currentFilter = "all";

  let sentimentChart = null;

  let comparisonChart = null;

  let trendChart = null;

  let wordChart = null;

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    async (tabs) => {

      try {

        const url =
          tabs[0].url;

        const match =
          url.match(
            /[?&]v=([\w-]{11})/
          );

        if (!match) {

          output.innerHTML = `
            <div class="section">
              <p>
                Not a valid YouTube video.
              </p>
            </div>
          `;

          return;
        }

        const videoId =
          match[1];

        output.innerHTML = `
          <div class="section">
            <div class="loading">
              Fetching comments...
            </div>
          </div>
        `;

        const comments =
          await fetchComments(
            videoId
          );

        if (!comments.length) {

          output.innerHTML = `
            <div class="section">
              <p>
                No comments found.
              </p>
            </div>
          `;

          return;
        }

        const predictions =
          await getSentiments(
            comments
          );

        if (!predictions) {

          output.innerHTML = `
            <div class="section">
              <p>
                Prediction failed.
              </p>
            </div>
          `;

          return;
        }

        allData =
          comments.map((c, i) => ({

            text: c.text,

            authorId: c.authorId,

            sentiment:
              predictions[i]
                .sentiment
          }));

        const sentimentCounts = {

          1: 0,

          0: 0,

          "-1": 0
        };

        predictions.forEach((p) => {

          sentimentCounts[
            p.sentiment
          ]++;

        });

        const totalComments =
          comments.length;

        const uniqueUsers =
          new Set(
            comments.map(
              c => c.authorId
            )
          ).size;

        const totalWords =
          comments.reduce(
            (sum, c) => {

              return (
                sum +
                c.text
                  .split(/\s+/)
                  .length
              );

            },
            0
          );

        const avgLength =
          (
            totalWords /
            totalComments
          ).toFixed(1);

        const positivePercent =
          (
            (
              sentimentCounts[1] /
              totalComments
            ) * 100
          ).toFixed(1);

        const neutralPercent =
          (
            (
              sentimentCounts[0] /
              totalComments
            ) * 100
          ).toFixed(1);

        const negativePercent =
          (
            (
              sentimentCounts[-1] /
              totalComments
            ) * 100
          ).toFixed(1);

        const engagementScore =
          (
            (
              (
                sentimentCounts[1] +
                sentimentCounts[-1]
              ) / totalComments
            ) * 10
          ).toFixed(1);

        const toxicWords = [

          "hate",
          "trash",
          "worst",
          "idiot",
          "ugly",
          "stupid",
          "kill",
          "dumb"
        ];

        let toxicCount = 0;

        allData.forEach((c) => {

          toxicWords.forEach((word) => {

            if (
              c.text
                .toLowerCase()
                .includes(word)
            ) {

              toxicCount++;

            }

          });

        });

        const toxicityPercent =
          (
            (
              toxicCount /
              totalComments
            ) * 100
          ).toFixed(1);

        const emojiRegex =
          /([\u231A-\uD83E\uDDFF])/gu;

        let emojiCount = 0;

        allData.forEach((c) => {

          const matches =
            c.text.match(
              emojiRegex
            );

          if (matches) {

            emojiCount +=
              matches.length;

          }

        });

        const wordMap = {};

        const stopWords = [

          "the","is","and","to","a",
          "of","in","this","that",
          "it","for","on","was",
          "are","with","you","your",
          "have","has","had","they",
          "them","from","would",
          "could","there","their",
          "what","when","where",
          "which","will","about",
          "very","much","just",
          "really","also","more",
          "than","then","into",
          "like","video","videos"
        ];

        allData.forEach((c) => {

          c.text
            .toLowerCase()
            .replace(
              /[^\w\s]/g,
              ""
            )
            .split(/\s+/)
            .forEach((word) => {

              if (
                word.length > 3 &&
                !stopWords.includes(
                  word
                )
              ) {

                wordMap[word] =
                  (
                    wordMap[word] || 0
                  ) + 1;

              }

            });

        });

        const topWords =
          Object.entries(wordMap)
            .sort(
              (a, b) =>
                b[1] - a[1]
            )
            .slice(0, 10);

        output.innerHTML = `

          <div class="section">

            <div class="section-title">
              Analytics Dashboard
            </div>

            <div class="metrics">

              <div class="metric">
                <div class="metric-title">
                  Comments
                </div>
                <div class="metric-value">
                  ${totalComments}
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Users
                </div>
                <div class="metric-value">
                  ${uniqueUsers}
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Avg Length
                </div>
                <div class="metric-value">
                  ${avgLength}
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Engagement
                </div>
                <div class="metric-value">
                  ${engagementScore}/10
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Positive
                </div>
                <div class="metric-value">
                  ${positivePercent}%
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Neutral
                </div>
                <div class="metric-value">
                  ${neutralPercent}%
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Negative
                </div>
                <div class="metric-value">
                  ${negativePercent}%
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Toxicity
                </div>
                <div class="metric-value">
                  ${toxicityPercent}%
                </div>
              </div>

              <div class="metric">
                <div class="metric-title">
                  Emojis
                </div>
                <div class="metric-value">
                  ${emojiCount}
                </div>
              </div>

            </div>

          </div>

          <div class="section">

            <div class="section-title">
              Sentiment Distribution
            </div>

            <canvas
              id="sentimentChart"
            ></canvas>

          </div>

          <div class="section">

            <div class="section-title">
              Sentiment Comparison
            </div>

            <canvas
              id="comparisonChart"
            ></canvas>

          </div>

          <div class="section">

            <div class="section-title">
              Sentiment Trend Over Time
            </div>

            <canvas
              id="advancedTrendChart"
            ></canvas>

          </div>

          <div class="section">

            <div class="section-title">
              Top Discussion Words
            </div>

            <canvas
              id="wordChart"
            ></canvas>

          </div>

          <div class="section">

            <div class="section-title">
              Comment Wordcloud
            </div>

            <div id="wordCloud"></div>

          </div>

          <div class="section">

            <div class="section-title">
              Comment Controls
            </div>

            <div class="controls">

              <button id="allBtn">
                All
              </button>

              <button id="positiveBtn">
                Positive
              </button>

              <button id="neutralBtn">
                Neutral
              </button>

              <button id="negativeBtn">
                Negative
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

            <div
              id="comments"
              class="comment-list"
            ></div>

          </div>
        `;

        createSentimentChart(
          sentimentCounts
        );

        createComparisonChart(
          sentimentCounts
        );

        createAdvancedTrendChart(
          predictions
        );

        createWordChart(
          topWords
        );

        generateWordCloud(
          allData
        );

        document
          .getElementById(
            "allBtn"
          )
          .addEventListener(
            "click",
            () => {

              currentFilter =
                "all";

              renderComments();

            }
          );

        document
          .getElementById(
            "positiveBtn"
          )
          .addEventListener(
            "click",
            () => {

              currentFilter =
                "1";

              renderComments();

            }
          );

        document
          .getElementById(
            "neutralBtn"
          )
          .addEventListener(
            "click",
            () => {

              currentFilter =
                "0";

              renderComments();

            }
          );

        document
          .getElementById(
            "negativeBtn"
          )
          .addEventListener(
            "click",
            () => {

              currentFilter =
                "-1";

              renderComments();

            }
          );

        document
          .getElementById(
            "search"
          )
          .addEventListener(
            "input",
            renderComments
          );

        document
          .getElementById(
            "exportBtn"
          )
          .addEventListener(
            "click",
            exportCSV
          );

        renderComments();

      }
      catch (error) {

        console.error(error);

        output.innerHTML = `
          <div class="section">
            <p>
              Error loading extension.
            </p>
          </div>
        `;
      }

    }
  );

  function renderComments() {

    const container =
      document.getElementById(
        "comments"
      );

    if (!container) return;

    const searchText =
      document
        .getElementById(
          "search"
        )
        .value
        .toLowerCase();

    container.innerHTML = "";

    const filtered =
      allData
        .filter((c) => {

          return (
            currentFilter ===
              "all" ||
            String(
              c.sentiment
            ) === currentFilter
          );

        })
        .filter((c) => {

          return c.text
            .toLowerCase()
            .includes(searchText);

        });

    filtered.forEach(
      (c, index) => {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          `comment ${
            c.sentiment == 1
              ? "pos-border"
              : c.sentiment == 0
              ? "neu-border"
              : "neg-border"
          }`;

        div.innerHTML = `

          <div>
            ${index + 1}.
            ${c.text}
          </div>

          <div class="badge ${
            c.sentiment == 1
              ? "positive"
              : c.sentiment == 0
              ? "neutral"
              : "negative"
          }">

            ${
              c.sentiment == 1
                ? "Positive"
                : c.sentiment == 0
                ? "Neutral"
                : "Negative"
            }

          </div>
        `;

        container.appendChild(
          div
        );

      }
    );
  }

  async function fetchComments(
    videoId
  ) {

    let comments = [];

    let pageToken = "";

    try {

      while (true) {

        const response =
          await fetch(
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&pageToken=${pageToken}&key=${API_KEY}`
          );

        const data =
          await response.json();

        if (!data.items) {

          break;
        }

        data.items.forEach(
          (item) => {

            comments.push({

              text:
                item
                  .snippet
                  .topLevelComment
                  .snippet
                  .textOriginal,

              authorId:
                item
                  .snippet
                  .topLevelComment
                  .snippet
                  .authorChannelId
                  ?.value ||
                "Unknown"
            });

          }
        );

        output.innerHTML = `
          <div class="section">
            <div class="loading">
              Fetched
              ${comments.length}
              comments...
            </div>
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

      console.error(error);

      return [];
    }
  }

  async function getSentiments(
    comments
  ) {

    try {

      const batchSize = 500;

      let allPredictions = [];

      for (
        let i = 0;
        i < comments.length;
        i += batchSize
      ) {

        const batch =
          comments.slice(
            i,
            i + batchSize
          );

        const commentTexts =
          batch.map(
            c => c.text
          );

        output.innerHTML = `
          <div class="section">
            <div class="loading">
              Processing comments
              ${i + 1}
              -
              ${Math.min(
                i + batchSize,
                comments.length
              )}
            </div>
          </div>
        `;

        const response =
          await fetch(
            `${API_URL}/predict`,
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  comments:
                    commentTexts
                })
            }
          );

        const data =
          await response.json();

        if (
          !data.predictions
        ) {

          return null;
        }

        const predictions =
          data.predictions.map(
            label => {

              let sentiment = 0;

              if (
                label.toLowerCase() ===
                "positive"
              ) {

                sentiment = 1;
              }
              else if (
                label.toLowerCase() ===
                "negative"
              ) {

                sentiment = -1;
              }

              return {
                sentiment
              };

            }
          );

        allPredictions = [

          ...allPredictions,

          ...predictions
        ];

      }

      return allPredictions;

    }
    catch (error) {

      console.error(error);

      return null;
    }
  }

  function createSentimentChart(
    sentimentCounts
  ) {

    const canvas =
      document.getElementById(
        "sentimentChart"
      );

    sentimentChart =
      new Chart(canvas, {

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

          responsive: true,

          maintainAspectRatio: false
        }
      });
  }

  function createComparisonChart(
    sentimentCounts
  ) {

    const canvas =
      document.getElementById(
        "comparisonChart"
      );

    comparisonChart =
      new Chart(canvas, {

        type: "bar",

        data: {

          labels: [
            "Positive",
            "Neutral",
            "Negative"
          ],

          datasets: [{

            label:
              "Comment Count",

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

          responsive: true,

          maintainAspectRatio: false
        }
      });
  }

  function createAdvancedTrendChart(
    predictions
  ) {

    const canvas =
      document.getElementById(
        "advancedTrendChart"
      );

    const batchSize = 100;

    const labels = [];

    const positiveData = [];

    const neutralData = [];

    const negativeData = [];

    for (
      let i = 0;
      i < predictions.length;
      i += batchSize
    ) {

      const batch =
        predictions.slice(
          i,
          i + batchSize
        );

      let positive = 0;

      let neutral = 0;

      let negative = 0;

      batch.forEach((p) => {

        if (
          p.sentiment === 1
        ) {

          positive++;

        }
        else if (
          p.sentiment === 0
        ) {

          neutral++;

        }
        else {

          negative++;
        }

      });

      const total =
        batch.length;

      positiveData.push(
        (
          (
            positive / total
          ) * 100
        ).toFixed(1)
      );

      neutralData.push(
        (
          (
            neutral / total
          ) * 100
        ).toFixed(1)
      );

      negativeData.push(
        (
          (
            negative / total
          ) * 100
        ).toFixed(1)
      );

      labels.push(
        `${i + 1}`
      );
    }

    trendChart =
      new Chart(canvas, {

        type: "line",

        data: {

          labels,

          datasets: [

            {

              label:
                "Positive %",

              data:
                positiveData,

              borderColor:
                "#22c55e",

              tension: 0.4
            },

            {

              label:
                "Neutral %",

              data:
                neutralData,

              borderColor:
                "#9ca3af",

              tension: 0.4
            },

            {

              label:
                "Negative %",

              data:
                negativeData,

              borderColor:
                "#ef4444",

              tension: 0.4
            }
          ]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false
        }
      });
  }

  function createWordChart(
    topWords
  ) {

    const canvas =
      document.getElementById(
        "wordChart"
      );

    wordChart =
      new Chart(canvas, {

        type: "bar",

        data: {

          labels:
            topWords.map(
              w => w[0]
            ),

          datasets: [{

            label:
              "Frequency",

            data:
              topWords.map(
                w => w[1]
              ),

            backgroundColor:
              "#38bdf8"
          }]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false
        }
      });
  }

  function generateWordCloud(
    allData
  ) {

    const container =
      document.getElementById(
        "wordCloud"
      );

    container.innerHTML = "";

    const wordMap = {};

    allData.forEach((c) => {

      c.text
        .toLowerCase()
        .replace(
          /[^\w\s]/g,
          ""
        )
        .split(/\s+/)
        .forEach((word) => {

          if (
            word.length > 3
          ) {

            wordMap[word] =
              (
                wordMap[word] || 0
              ) + 1;
          }

        });

    });

    const topWords =
      Object.entries(wordMap)
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 35);

    const maxFreq =
      topWords[0]?.[1] || 1;

    topWords.forEach(
      ([word, count]) => {

        const span =
          document.createElement(
            "span"
          );

        const size =
          12 +
          (
            (
              count /
              maxFreq
            ) * 12
          );

        span.style.fontSize =
          `${size}px`;

        span.style.margin =
          "6px";

        span.style.display =
          "inline-block";

        span.style.fontWeight =
          "600";

        span.style.color =
          getRandomColor();

        span.textContent =
          word;

        container.appendChild(
          span
        );

      }
    );
  }

  function getRandomColor() {

    const colors = [

      "#38bdf8",
      "#22c55e",
      "#eab308",
      "#ef4444",
      "#a855f7",
      "#14b8a6",
      "#ec4899",
      "#f97316"
    ];

    return colors[
      Math.floor(
        Math.random() *
        colors.length
      )
    ];
  }

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
        `"${c.text.replace(
          /"/g,
          '""'
        )}","${sentiment}"\n`;

    });

    const blob =
      new Blob([csv], {

        type: "text/csv"
      });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      "youtube_sentiment_analysis.csv";

    a.click();

    URL.revokeObjectURL(
      url
    );
  }

});