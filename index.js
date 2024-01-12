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
    data.list[0].data.data.forEach(async ({ app }) => {
      const header = {
        link: `${this.#BASE_URL}/app/${app.id}`,
        domain: "string",
        tag: ["string"],
        crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
        crawling_time_epoch: Date.now(),
        path_data_raw: "string",
        path_data_clean: "string",
        reviews_name: "string",
        location_reviews: "string",
        category_reviews: "string",
        total_reviews: "integer",
        title: app.title,
        rating: parseFloat(app.stat.rating.score),
        tags: app.tags.map((tag) => tag.value),
        developers: app.developers.map((developer) => developer.name),
      };

      let i = 0;

      while (true) {
        const { data } = await this.#requestReview({
          app_id: app.id,
          from: i,
          limit: 100,
        });

        const reviews = data.list;

        if (!reviews) break;

        reviews.forEach(async ({ post }) => {
          delete post.stat.pv_total;

          const username = post.user.name.replace("/", "");
          const app_ratings = post.list_fields.app_ratings
            ? post.list_fields.app_ratings
            : null;
          const outputFile = `data/${app.title}/${username}.json`;

          this.writeFile(outputFile, {
            ...header,
            username,
            published_time: post.published_time,
            edited_time: post.edited_time,
            user_rating: app_ratings ? app_ratings[app.id].score : null,
            sub_items: app_ratings ? app_ratings[app.id].sub_items : null,
            comment_title:
              post.sharing.title === "Untitled Post"
                ? null
                : post.sharing.title,
            comment_desc: post.sharing.description,
            stat: !Object.keys(post.stat).length ? null : post.stat,
            crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
            crawling_time_epoch: Date.now(),
            path_data_raw: `data/data_raw/data_review/www.taptap.io/${app.title}/json/${username}.json`,
            path_data_clean: `data/data_clean/data_review/www.taptap.io/${app.title}/json/${username}.json`,
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
  async #requestReview(data) {
    const response = await fetch(
      `${this.#BASE_URL}/webapiv2/feeds/v1/app-ratings?` +
        new URLSearchParams({
          ...data,
          "X-UA": this.#xua,
        })
    );
    return await response.json();
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
