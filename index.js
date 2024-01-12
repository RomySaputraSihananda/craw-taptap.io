import fs from "fs-extra";
import strftime from "strftime";

class App {
  #BASE_URL = "https://www.taptap.io";
  #xua =
    "V=1&PN=WebAppIntl2&LANG=en_US&VN_CODE=114&VN=0.1.0&LOC=CN&PLT=PC&DS=Android&UID=4df88e5d-b4f4-4173-8985-a83672c5d35a&CURR=ID&DT=PC&OS=Linux&OSV=x86_64";
  constructor() {
    this.#start();
  }

  async #start() {
    const response = await fetch(
      `${this.#BASE_URL}/webapiv2/i/sidebar/v1/list?` +
        new URLSearchParams({
          type: "landing",
          "X-UA": this.#xua,
        })
    );

    const { data } = await response.json();
    data.list[0].data.data.forEach(async (data) => {
      const response = await fetch(
        `${this.#BASE_URL}/webapiv2/i/app/v5/detail?` +
          new URLSearchParams({
            id: data.app.id,
            "X-UA": this.#xua,
          })
      );

      const content = await response.json();
      const { app } = content.data;

      let i = 0;
      while (true) {
        const data = await this.#requestReview({
          app_id: app.id,
          from: i,
          limit: 100,
        });

        console.log(data);

        return;

        const reviews = data.list;

        if (!reviews) break;

        reviews.forEach(async ({ post }) => {
          delete post.stat.pv_total;

          const username = post.user.name.replace("/", "");
          const app_ratings = post.list_fields.app_ratings
            ? post.list_fields.app_ratings
            : null;
          const stat = !Object.keys(post.stat).length ? null : post.stat;

          const outputFile = `data/${app.title}/${username}.json`;

          this.writeFile(outputFile, {
            link: `${this.#BASE_URL}/app/${app.id}`,
            domain: this.#BASE_URL.split("/")[2],
            tag: `${this.#BASE_URL}/app/${app.id}`.replace("/").slice(2),
            crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
            crawling_time_epoch: Date.now(),
            path_data_raw: `data/data_raw/data_review/www.taptap.io/${app.title}/json/${username}.json`,
            path_data_clean: `data/data_clean/data_review/www.taptap.io/${app.title}/json/${username}.json`,
            reviews_name: app.title,
            developers: app.developers.map((developer) => developer.name),
            location_reviews: null,
            category_reviews: "application",
            total_reviews: app.stat.review_count,
            reviews_rating: {
              total_rating: parseFloat(app.stat.rating.score),
              detail_total_rating: null,
            },
            detail_reviews: {
              username_reviews: username,
              gender_reviews: !post.user.gender.length
                ? post.user.gender
                : null,
              avatar_reviews: post.user.avatar,
              image_reviews: "string",
              created_time: post.published_time,
              created_time_epoch: post.published_time,
              edited_time: post.edited_time,
              edited_time_epoch: post.edited_time,
              email_reviews: null,
              company_name: null,
              location_reviews: null,
              title_detail_reviews:
                post.sharing.title === "Untitled Post"
                  ? null
                  : post.sharing.title,
              reviews_rating: app_ratings ? app_ratings[app.id].score : null,
              detail_reviews_rating: null,
              total_likes_reviews: stat ? stat.ups : null,
              total_dislikes_reviews: null,
              total_reply_reviews: stat ? stat.comments : null,
              total_favorites_reviews: stat ? stat.comments : null,
              content_reviews: post.sharing.description,
              reply_content_reviews: {
                username_reply_reviews: "string",
                content_reviews: "string",
              },
              date_of_experience: null,
              date_of_experience_epoch: null,
            },
          });
          console.log(outputFile);
        });

        break;

        i += 100;
      }
    });
  }

  async writeFile(outputFile, data) {
    await fs.outputFile(outputFile, JSON.stringify(data, null, 2));
  }

  /**
   *
   * @param {string} from
   * @param {string} limit
   * @returns
   */
  async #requestReview(params) {
    const response = await fetch(
      `${this.#BASE_URL}/webapiv2/feeds/v1/app-ratings?` +
        new URLSearchParams({
          ...params,
          "X-UA": this.#xua,
        })
    );

    const { data } = await response.json();

    const reviews = data.list;

    if (!reviews) return;

    return reviews.map(async ({ post }) => {
      const response = await fetch(
        `${this.#BASE_URL}/webapiv2/creation/post/v1/detail?` +
          new URLSearchParams({
            id_str: post.id_str,
            "X-UA": this.#xua,
          })
      );
      const { data } = await response.json();

      return data.post.id;
    });
  }
}

new App();

// let i = 0;

// while (true) {
//   const response = await fetch(
//     "https://www.taptap.io/webapiv2/feeds/v1/app-ratings?" +
//       new URLSearchParams({
//         app_id: 224745,
//         from: i,
//         limit: 120,
//         session_id: "70e40c5f-a81f-4dc9-b53e-6ac30b4107d1",
//         "X-UA":
//           "V=1&PN=WebAppIntl2&LANG=en_US&VN_CODE=114&VN=0.1.0&LOC=CN&PLT=PC&DS=Android&UID=4df88e5d-b4f4-4173-8985-a83672c5d35a&CURR=ID&DT=PC&OS=Linux&OSV=x86_64",
//       })
//   );
//   const { data } = await response.json();
//   const reviews = data.list;

//   if (!reviews) break;

//   data.list.forEach(async ({ post }, j) => {
//     console.log(post);
//     // const username = post.user ? post.user.name : null;
//     // if (username) console.log(username);
//   });
//   break;
//   i += 200;
// }
